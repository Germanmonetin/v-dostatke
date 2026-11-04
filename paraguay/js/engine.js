// Офлайн-движок перевода: разговорник (нечёткий поиск) + пословный словарь + нейромодели в Web Worker.
import { PHRASES, DICTIONARY } from './data/phrases.js';

export const LANGS = {
  ru: { label: 'Русский', short: 'RU', nllb: 'rus_Cyrl', whisper: 'russian', speech: 'ru-RU', tts: ['ru'] },
  es: { label: 'Кастельяно', short: 'ES', nllb: 'spa_Latn', whisper: 'spanish', speech: 'es-PY', tts: ['es-PY', 'es-AR', 'es-US', 'es-MX', 'es'] },
  gn: { label: 'Гуарани', short: 'GN', nllb: 'grn_Latn', whisper: 'spanish', speech: 'es-PY', tts: ['es-PY', 'es-AR', 'es-US', 'es-MX', 'es'] },
};

// ——— Нормализация и сходство ———
export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // ударения, тильды (ñ→n, ẽ→e, g̃→g)
    .replace(/[’'`ʼ‘]/g, '')                              // пусо (гортанная смычка)
    .replace(/[…]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(s) {
  const t = `  ${s} `;
  const set = new Map();
  for (let i = 0; i < t.length - 2; i++) {
    const g = t.slice(i, i + 3);
    set.set(g, (set.get(g) || 0) + 1);
  }
  return set;
}

function dice(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0, na = 0, nb = 0;
  for (const [g, c] of a) { na += c; if (b.has(g)) inter += Math.min(c, b.get(g)); }
  for (const c of b.values()) nb += c;
  return (2 * inter) / (na + nb);
}

// Индекс фраз: для каждого языка — варианты (основная форма + alt).
const INDEX = { ru: [], es: [], gn: [] };
for (const p of PHRASES) {
  for (const lang of ['ru', 'es', 'gn']) {
    const forms = [];
    if (p[lang]) forms.push(...p[lang].split(' / '));
    if (p.alt && p.alt[lang]) forms.push(...p.alt[lang]);
    for (const f of forms) {
      const n = normalize(f);
      if (n) INDEX[lang].push({ phrase: p, norm: n, grams: trigrams(n) });
    }
  }
}

/** Поиск похожих фраз разговорника. Возвращает [{phrase, score}] по убыванию. */
export function matchPhrases(text, lang, limit = 4) {
  const n = normalize(text);
  if (!n) return [];
  const g = trigrams(n);
  const best = new Map();
  for (const item of INDEX[lang] || []) {
    let score = item.norm === n ? 1 : dice(g, item.grams);
    // Небольшой штраф за большую разницу длин — чтобы «да» не совпадало с длинной фразой.
    const ratio = Math.min(n.length, item.norm.length) / Math.max(n.length, item.norm.length);
    if (score < 1) score *= 0.75 + 0.25 * ratio;
    const prev = best.get(item.phrase.id);
    if (!prev || prev.score < score) best.set(item.phrase.id, { phrase: item.phrase, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

// ——— Пословный словарь ———
const COLS = { ru: 0, es: 1, gn: 2 };
const DICT_INDEX = { ru: [], es: [], gn: [] };
for (const row of DICTIONARY) {
  for (const lang of ['ru', 'es', 'gn']) {
    for (const w of row[COLS[lang]].split('/')) {
      const n = normalize(w);
      if (n) DICT_INDEX[lang].push({ norm: n, row });
    }
  }
}

function lookupWord(token, lang) {
  let exact = null, stem = null;
  for (const e of DICT_INDEX[lang]) {
    if (e.norm === token) { exact = e; break; }
    // Грубый стемминг: совпадение основы для слов с окончаниями (вода → воды, comer → comemos).
    if (!stem && lang !== 'gn' && token.length >= 4 && e.norm.length >= 3 && !e.norm.includes(' ')) {
      const base = e.norm.length >= 4 ? e.norm.slice(0, e.norm.length - 1) : e.norm;
      if (token.startsWith(base) && token.length - e.norm.length <= 3) stem = e;
    }
  }
  return exact || stem;
}

/** Пословный разбор: [{word, translation|null}] */
export function gloss(text, src, tgt) {
  const tokens = normalize(text).split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    // Сначала пробуем пары слов («yerba mate», «por qué»)
    let hit = null, used = 1;
    if (i + 1 < tokens.length) {
      const pair = DICT_INDEX[src].find((e) => e.norm === `${tokens[i]} ${tokens[i + 1]}`);
      if (pair) { hit = pair; used = 2; }
    }
    if (!hit) hit = lookupWord(tokens[i], src);
    const word = tokens.slice(i, i + used).join(' ');
    out.push({ word, translation: hit ? hit.row[COLS[tgt]].split('/')[0] : null });
    i += used - 1;
  }
  return out;
}

// ——— Нейромодели (Whisper + NLLB-200) в Web Worker ———
export const MODELS = {
  asr: {
    options: [
      { id: 'Xenova/whisper-tiny', label: 'Whisper Tiny', size: '≈ 45 МБ', hint: 'быстро, попроще' },
      { id: 'Xenova/whisper-base', label: 'Whisper Base', size: '≈ 80 МБ', hint: 'оптимально', default: true },
      { id: 'Xenova/whisper-small', label: 'Whisper Small', size: '≈ 250 МБ', hint: 'точнее, медленнее' },
    ],
  },
  mt: {
    options: [
      { id: 'Xenova/nllb-200-distilled-600M', label: 'NLLB-200 (600M)', size: '≈ 0,6–0,9 ГБ', hint: 'RU · ES · GN', default: true },
    ],
  },
};

const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
export { LS };

class ModelHub extends EventTarget {
  constructor() {
    super();
    this.worker = null;
    this.seq = 0;
    this.pending = new Map();
    this.state = {
      asr: { status: LS.get('pg.asr') ? 'installed' : 'none', model: LS.get('pg.asr'), progress: 0 },
      mt: { status: LS.get('pg.mt') ? 'installed' : 'none', model: LS.get('pg.mt'), progress: 0 },
    };
  }

  ensureWorker() {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL('./ml-worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => this.onMessage(e.data);
    this.worker.onerror = (e) => {
      for (const t of ['asr', 'mt']) if (this.state[t].status === 'loading') this.update(t, { status: 'error', error: e.message || 'Ошибка воркера' });
    };
    return this.worker;
  }

  onMessage(msg) {
    const { type, task, id } = msg;
    if (type === 'progress') this.update(task, { status: 'loading', progress: msg.progress, loaded: msg.loaded, total: msg.total });
    else if (type === 'ready') {
      LS.set(`pg.${task}`, msg.model);
      this.update(task, { status: 'ready', model: msg.model, progress: 100, error: null });
      const w = this.pending.get(`load:${task}`); if (w) { this.pending.delete(`load:${task}`); w.forEach((p) => p.resolve()); }
    } else if (type === 'error') {
      if (id && this.pending.has(id)) { this.pending.get(id).reject(new Error(msg.message)); this.pending.delete(id); }
      if (task) {
        this.update(task, { status: LS.get(`pg.${task}`) ? 'installed' : 'error', error: msg.message });
        const w = this.pending.get(`load:${task}`); if (w) { this.pending.delete(`load:${task}`); w.forEach((p) => p.reject(new Error(msg.message))); }
      }
    } else if (type === 'result') {
      const p = this.pending.get(id);
      if (p) { this.pending.delete(id); p.resolve(msg.text); }
    } else if (type === 'removed') {
      LS.del(`pg.${task}`);
      this.update(task, { status: 'none', model: null, progress: 0 });
    }
  }

  update(task, patch) {
    Object.assign(this.state[task], patch);
    this.dispatchEvent(new CustomEvent('change', { detail: { task, state: this.state[task] } }));
  }

  isAvailable(task) { return ['installed', 'ready'].includes(this.state[task].status); }

  /** Скачать (первый раз) или загрузить в память (из кэша). */
  load(task, model) {
    const st = this.state[task];
    model = model || st.model || MODELS[task].options.find((o) => o.default).id;
    if (st.status === 'ready' && st.model === model) return Promise.resolve();
    const key = `load:${task}`;
    return new Promise((resolve, reject) => {
      const list = this.pending.get(key);
      if (list) { list.push({ resolve, reject }); return; }
      this.pending.set(key, [{ resolve, reject }]);
      this.update(task, { status: 'loading', progress: 0, model, error: null });
      this.ensureWorker().postMessage({ type: 'load', task, model });
    });
  }

  remove(task) {
    const model = this.state[task].model;
    if (!model) return;
    this.ensureWorker().postMessage({ type: 'remove', task, model });
  }

  call(payload) {
    const id = `r${++this.seq}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ensureWorker().postMessage({ ...payload, id });
    });
  }

  async transcribe(audio, lang) {
    await this.load('asr');
    return this.call({ type: 'transcribe', audio, language: LANGS[lang].whisper }).then((t) => t.trim());
  }

  async translate(text, src, tgt) {
    await this.load('mt');
    return this.call({ type: 'translate', text, src: LANGS[src].nllb, tgt: LANGS[tgt].nllb });
  }
}

export const hub = new ModelHub();

/**
 * Полный перевод: разговорник → нейросеть (если установлена) → пословный разбор.
 * onUpdate вызывается, когда приходят новые данные (нейроперевод асинхронный).
 */
export async function translate(text, src, tgt, onUpdate) {
  const matches = matchPhrases(text, src, 4).filter((m) => m.score >= 0.42);
  const top = matches[0];
  const result = {
    text, src, tgt,
    // phrase[tgt] может быть null (в этой ситуации говорят по-испански) — интерфейс это показывает.
    phrase: top && top.score >= 0.8 ? top.phrase : null,
    similar: matches.filter((m) => !(top && m === top && top.score >= 0.8)).slice(0, 3),
    gloss: gloss(text, src, tgt),
    neural: null,
    neuralStatus: hub.isAvailable('mt') ? 'pending' : 'unavailable',
  };
  onUpdate && onUpdate(result);
  if (result.neuralStatus === 'pending') {
    try {
      result.neural = await hub.translate(text, src, tgt);
      result.neuralStatus = 'done';
    } catch (e) {
      result.neuralStatus = 'error';
      result.neuralError = e.message;
    }
    onUpdate && onUpdate(result);
  }
  return result;
}

// ——— Озвучка (Web Speech Synthesis — голоса устройства, часто доступны офлайн) ———
let voicesCache = [];
function loadVoices() { try { voicesCache = speechSynthesis.getVoices(); } catch { voicesCache = []; } }
if ('speechSynthesis' in globalThis) { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }

export function canSpeak() { return 'speechSynthesis' in globalThis; }

export function speak(text, lang) {
  if (!canSpeak() || !text) return;
  speechSynthesis.cancel();
  const clean = text.replace(/…/g, '').replace(/\s*\/\s*/g, ', ');
  const u = new SpeechSynthesisUtterance(clean);
  const prefs = LANGS[lang].tts;
  let voice = null;
  for (const p of prefs) {
    voice = voicesCache.find((v) => v.lang === p) || voicesCache.find((v) => v.lang.toLowerCase().startsWith(p.toLowerCase()));
    if (voice) break;
  }
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = prefs[0];
  u.rate = lang === 'gn' ? 0.85 : 0.95; // гуарани читаем испанским голосом, чуть медленнее
  speechSynthesis.speak(u);
}
