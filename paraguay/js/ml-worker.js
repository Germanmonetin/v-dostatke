// Web Worker: распознавание речи (Whisper) и нейроперевод (NLLB-200) прямо на устройстве.
// Модели скачиваются один раз с Hugging Face и хранятся в Cache Storage браузера —
// дальше работают без интернета.
// Библиотека грузится с CDN (версия закреплена) и кэшируется сервис-воркером для работы офлайн.
import { pipeline, env, ModelRegistry } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true; // кэшируем и сам движок ONNX Runtime (WASM) — для работы офлайн

const pipes = { asr: null, mt: null };
const loaded = { asr: null, mt: null };
const TASKS = { asr: 'automatic-speech-recognition', mt: 'translation' };

function post(msg) { self.postMessage(msg); }

async function load(task, model) {
  if (pipes[task] && loaded[task] === model) { post({ type: 'ready', task, model }); return; }
  if (pipes[task]) { try { await pipes[task].dispose?.(); } catch { /* ignore */ } pipes[task] = null; }

  const files = {};
  let lastSent = 0;
  const progress_callback = (p) => {
    if (p.status === 'progress_total') {
      report(p.loaded, p.total);
    } else if (p.status === 'progress' && p.file) {
      files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
      let l = 0, t = 0;
      for (const f of Object.values(files)) { l += f.loaded; t += f.total; }
      report(l, t);
    }
  };
  function report(l, t) {
    const now = Date.now();
    if (now - lastSent < 150 && l < t) return;
    lastSent = now;
    post({ type: 'progress', task, loaded: l, total: t, progress: t ? Math.min(99, (l / t) * 100) : 0 });
  }

  pipes[task] = await pipeline(TASKS[task], model, { dtype: 'q8', device: 'wasm', progress_callback });
  loaded[task] = model;
  post({ type: 'ready', task, model });
}

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') {
      await load(msg.task, msg.model);
    } else if (msg.type === 'transcribe') {
      if (!pipes.asr) throw new Error('Модель распознавания не загружена');
      const out = await pipes.asr(msg.audio, {
        language: msg.language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      post({ type: 'result', id: msg.id, text: Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text });
    } else if (msg.type === 'translate') {
      if (!pipes.mt) throw new Error('Модель перевода не загружена');
      const out = await pipes.mt(msg.text, { src_lang: msg.src, tgt_lang: msg.tgt, max_new_tokens: 256 });
      post({ type: 'result', id: msg.id, text: (Array.isArray(out) ? out[0] : out).translation_text });
    } else if (msg.type === 'remove') {
      if (pipes[msg.task]) { try { await pipes[msg.task].dispose?.(); } catch { /* ignore */ } }
      pipes[msg.task] = null; loaded[msg.task] = null;
      try { await ModelRegistry.clear_pipeline_cache(TASKS[msg.task], msg.model, { dtype: 'q8' }); }
      catch { /* старый кэш останется, но не помешает */ }
      post({ type: 'removed', task: msg.task });
    }
  } catch (err) {
    const message = humanError(err);
    if (msg.type === 'load') post({ type: 'error', task: msg.task, message });
    else post({ type: 'error', id: msg.id, message });
  }
};

function humanError(err) {
  const m = String(err && err.message || err);
  if (/fetch|network|Failed to load|NetworkError/i.test(m)) return 'Нет связи с сервером моделей. Подключитесь к интернету (лучше Wi-Fi) и повторите.';
  if (/quota|QuotaExceeded|storage/i.test(m)) return 'Недостаточно места в хранилище браузера. Освободите память и повторите.';
  if (/memory|OOM|allocation/i.test(m)) return 'Не хватило оперативной памяти устройства. Попробуйте модель поменьше или закройте другие вкладки.';
  return m;
}
