// Экран «Переводчик»: диалог, голосовой ввод, перевод.
import { LANGS, hub, translate, matchPhrases, gloss, LS } from './engine.js';
import { PHRASES } from './data/phrases.js';
import { Recorder, browserSpeechAvailable, browserRecognize } from './recorder.js';
import { $, $$, esc, icon, toast, speakBtn, showBtn } from './ui.js';

const state = {
  partner: LS.get('pg.partner', 'es'),
  entries: [],
  busy: null, // { speaker, stop() }
};
let seq = 0;

const QUICK = ['hello', 'thanks', 'howmuch', 'toilet', 'dontunderstand', 'help'];
const phraseById = Object.fromEntries(PHRASES.map((p) => [p.id, p]));

export function initTranslator({ go }) {
  // Язык собеседника
  $$('.seg [data-partner]').forEach((b) => b.addEventListener('click', () => setPartner(b.dataset.partner)));
  setPartner(state.partner, true);

  // Быстрые фразы
  $('#quickChips').innerHTML = QUICK.map((id) => `<button type="button" class="chip" data-quick="${id}">${esc(phraseById[id].ru)}</button>`).join('');
  $('#quickChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-quick]');
    if (b) addPhraseEntry(phraseById[b.dataset.quick], 'me');
  });

  // Ввод текста
  const input = $('#input');
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); }
  });
  $('#composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = ''; autosize();
    const src = detectLang(text);
    addEntry({ speaker: src === 'ru' ? 'me' : 'partner', src, tgt: src === 'ru' ? state.partner : 'ru', text });
  });

  // Микрофоны
  $$('.mic').forEach((b) => b.addEventListener('click', () => onMic(b.dataset.speaker, go)));

  // Офлайн-пакет
  $('#packStrip').addEventListener('click', () => go('info', 'offline'));
  hub.addEventListener('change', renderPack);
  renderPack();

  // Действия в ленте
  $('#log').addEventListener('click', (e) => {
    const sim = e.target.closest('[data-phrase]');
    if (sim) {
      const entry = state.entries.find((x) => x.id === sim.dataset.entry);
      addPhraseEntry(phraseById[sim.dataset.phrase], entry ? entry.speaker : 'me');
      return;
    }
    if (e.target.closest('[data-clear]')) { state.entries = []; save(); renderLog(); }
    if (e.target.closest('[data-install]')) go('info', 'offline');
  });

  // Восстановление истории
  for (const s of LS.get('pg.log', [])) {
    const entry = { ...s, id: `e${++seq}` };
    entry.result = quickResult(entry);
    state.entries.push(entry);
  }
  renderLog();
}

function setPartner(lang, silent) {
  state.partner = lang;
  LS.set('pg.partner', lang);
  $$('.seg [data-partner]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.partner === lang)));
  $$('.pl-long').forEach((el) => { el.textContent = lang === 'gn' ? 'гуарани' : 'кастельяно'; });
  if (!silent && lang === 'gn') toast('Где на гуарани так не говорят — подскажу испанский вариант');
}

function detectLang(text) {
  if (/[а-яё]/i.test(text)) return 'ru';
  if (/[ãẽĩõũỹ]|g̃|\p{L}['’]\p{L}/u.test(text)) return 'gn';
  // Сравним, на какой язык разговорника текст похож больше
  const es = matchPhrases(text, 'es', 1)[0]?.score || 0;
  const gn = matchPhrases(text, 'gn', 1)[0]?.score || 0;
  if (gn > 0.8 && gn > es + 0.1) return 'gn';
  if (es > 0.8 && es > gn + 0.1) return 'es';
  return state.partner;
}

function renderPack() {
  const set = (k, st) => {
    const el = $(`.pack-item[data-pack="${k}"]`);
    el.classList.toggle('ok', st === 'installed' || st === 'ready');
    el.classList.toggle('loading', st === 'loading');
  };
  set('asr', hub.state.asr.status);
  set('mt', hub.state.mt.status);
  const all = hub.isAvailable('asr') && hub.isAvailable('mt');
  $('.pack-go').textContent = all ? 'Всё работает офлайн ✓' : 'Настроить офлайн →';
  $('#packStrip').classList.toggle('complete', all);
}

// ——— Голос ———
async function onMic(speaker, go) {
  // Повторное нажатие — остановить запись
  if (state.busy) {
    if (state.busy.speaker === speaker) state.busy.stop();
    return;
  }
  const src = speaker === 'me' ? 'ru' : state.partner;
  const tgt = speaker === 'me' ? state.partner : 'ru';
  const btn = $(`.mic[data-speaker="${speaker}"]`);

  if (hub.isAvailable('asr') && Recorder.supported()) {
    const rec = new Recorder({ onLevel: (v) => btn.style.setProperty('--level', v.toFixed(2)) });
    try { await rec.start(); } catch (e) { toast(e.name === 'NotAllowedError' ? 'Разрешите доступ к микрофону' : 'Микрофон недоступен'); return; }
    setRecording(btn, true);
    state.busy = { speaker, stop: async () => {
      setRecording(btn, false);
      const placeholder = addEntry({ speaker, src, tgt, text: '', viaVoice: true, pending: true });
      try {
        const audio = await rec.stop();
        if (audio.length < 16000 * 0.4) throw new Error('Слишком короткая запись — нажмите и говорите, потом нажмите ещё раз');
        // Модель могла ещё не быть загружена в память — покажем это
        if (hub.state.asr.status !== 'ready') placeholder.stage = 'Загружаю модель распознавания…';
        renderEntry(placeholder);
        const text = await hub.transcribe(audio, src);
        finishVoice(placeholder, text);
      } catch (e) {
        removeEntry(placeholder);
        toast(e.message || 'Не удалось распознать речь', 4000);
      } finally { state.busy = null; }
    } };
    return;
  }

  if (browserSpeechAvailable() && navigator.onLine) {
    const r = browserRecognize(LANGS[src].speech);
    setRecording(btn, true);
    state.busy = { speaker, stop: () => r.stop() };
    try {
      const text = await r.promise;
      setRecording(btn, false);
      state.busy = null;
      if (text) addEntry({ speaker, src, tgt, text, viaVoice: true, online: true });
      else toast('Ничего не расслышал — попробуйте ещё раз');
    } catch (e) {
      setRecording(btn, false);
      state.busy = null;
      toast(e.message, 4000);
    }
    return;
  }

  toast('Для голосового ввода без интернета скачайте модель распознавания речи', 4200);
  go('info', 'offline');
}

function setRecording(btn, on) {
  btn.classList.toggle('rec', on);
  btn.setAttribute('aria-pressed', String(on));
  btn.querySelector('use').setAttribute('href', on ? '#i-stop' : '#i-mic');
  $$('.mic').forEach((b) => { if (b !== btn) b.disabled = on; });
}

function finishVoice(entry, text) {
  if (!text) { removeEntry(entry); toast('Ничего не расслышал — попробуйте ещё раз'); return; }
  entry.text = text;
  entry.pending = false;
  entry.stage = null;
  runTranslation(entry);
}

// ——— Записи диалога ———
function addEntry(data) {
  const entry = { id: `e${++seq}`, ...data };
  state.entries.push(entry);
  if (state.entries.length > 40) state.entries.shift();
  renderLog();
  if (!entry.pending) runTranslation(entry);
  return entry;
}

function addPhraseEntry(p, speaker) {
  const src = speaker === 'me' ? 'ru' : (p[state.partner] ? state.partner : 'es');
  const tgt = speaker === 'me' ? state.partner : 'ru';
  addEntry({ speaker, src, tgt, text: p[src].split(' / ')[0], phraseId: p.id });
}

function removeEntry(entry) {
  state.entries = state.entries.filter((x) => x !== entry);
  renderLog();
}

function quickResult(entry) {
  if (!entry.text) return null;
  const res = {
    phrase: null, similar: [], gloss: gloss(entry.text, entry.src, entry.tgt),
    neural: entry.neural || null, neuralStatus: entry.neural ? 'done' : 'unavailable',
  };
  if (entry.phraseId) res.phrase = phraseById[entry.phraseId];
  else {
    const m = matchPhrases(entry.text, entry.src, 4).filter((x) => x.score >= 0.42);
    if (m[0] && m[0].score >= 0.8) { res.phrase = m[0].phrase; res.similar = m.slice(1, 4); } else res.similar = m.slice(0, 3);
  }
  return res;
}

async function runTranslation(entry) {
  if (entry.phraseId) {
    entry.result = quickResult(entry);
    renderEntry(entry); save();
    return;
  }
  await translate(entry.text, entry.src, entry.tgt, (res) => {
    entry.result = { ...res };
    if (res.neural) entry.neural = res.neural;
    renderEntry(entry);
  });
  save();
}

function save() {
  LS.set('pg.log', state.entries.filter((e) => !e.pending && e.text).slice(-30)
    .map(({ speaker, src, tgt, text, viaVoice, neural, phraseId }) => ({ speaker, src, tgt, text, viaVoice, neural, phraseId })));
}

function renderLog() {
  const log = $('#log');
  $('#logEmpty').hidden = state.entries.length > 0;
  $$('.bubble, .log-tools', log).forEach((n) => n.remove());
  if (state.entries.length) {
    log.insertAdjacentHTML('beforeend', '<div class="log-tools"><button type="button" class="link-btn" data-clear>Очистить диалог</button></div>');
  }
  for (const e of state.entries) {
    log.insertAdjacentHTML('beforeend', `<article class="bubble ${e.speaker}" id="${e.id}"></article>`);
    renderEntry(e, false);
  }
  scrollDown();
}

function scrollDown() {
  const log = $('#log');
  requestAnimationFrame(() => log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' }));
}

function renderEntry(e, scroll = true) {
  const el = document.getElementById(e.id);
  if (!el) return;
  const dir = `${LANGS[e.src].short} → ${LANGS[e.tgt].short}`;
  const who = e.speaker === 'me' ? 'Я' : 'Собеседник';
  let html = `<header class="b-head"><span class="b-who">${who}</span><span class="b-dir">${dir}</span>${e.viaVoice ? `<span class="b-voice" title="Распознано из речи">${icon('i-mic')}${e.online ? ' онлайн' : ''}</span>` : ''}</header>`;

  if (e.pending) {
    html += `<div class="b-pending"><span class="spinner"></span>${esc(e.stage || 'Распознаю речь…')}</div>`;
    el.innerHTML = html;
    if (scroll) scrollDown();
    return;
  }
  html += `<p class="b-src" lang="${e.src}">${esc(e.text)}</p>`;
  if (e.viaVoice && e.src === 'gn' && !e.online) {
    html += `<p class="b-hint">Гуарани распознаётся экспериментально (через испанскую модель) — сверьте текст.</p>`;
  }

  const r = e.result;
  if (r) {
    const tgt = e.tgt;
    const p = r.phrase;
    let main = null, mainLang = tgt, pron = '', badge = '', note = '';
    if (p && p[tgt]) {
      main = p[tgt]; pron = p[`${tgt}P`] || ''; badge = 'Разговорник'; note = p.note || '';
    } else if (p && tgt === 'gn') {
      main = p.es; mainLang = 'es'; pron = p.esP || ''; badge = 'Разговорник';
      note = `На гуарани в этой ситуации обычно переходят на испанский. ${p.note || ''}`.trim();
    } else if (r.neuralStatus === 'done' && r.neural) {
      main = r.neural; badge = 'Нейроперевод · офлайн';
    }

    if (main) {
      html += `<div class="b-main ${badge === 'Разговорник' ? 'verified' : 'neural'}">
        <span class="b-badge">${badge}</span>
        <p class="b-out" lang="${mainLang}">${esc(main)}</p>
        ${pron ? `<p class="b-pron">${esc(pron)}</p>` : ''}
        <div class="b-actions">
          ${speakBtn(main, mainLang)}
          ${mainLang !== 'ru' ? showBtn(main, mainLang, pron) : ''}
          <button type="button" class="icon-btn sm" data-copy="${esc(main)}" aria-label="Копировать">${icon('i-copy')}</button>
        </div>
      </div>`;
      if (note) html += `<p class="b-note">${esc(note)}</p>`;
      // Перевод на третий язык из разговорника — полезно, если собеседник понимает оба
      if (p && tgt !== 'ru') {
        const other = tgt === 'es' ? 'gn' : 'es';
        if (p[other] && mainLang !== other) html += `<p class="b-alt"><span>${LANGS[other].label}:</span> ${esc(p[other])} ${speakBtn(p[other], other)}</p>`;
      }
    } else if (r.neuralStatus === 'pending') {
      html += `<div class="b-pending"><span class="spinner"></span>${hub.state.mt.status === 'ready' ? 'Перевожу…' : 'Загружаю нейропереводчик…'}</div>`;
    } else {
      html += `<div class="b-miss">Точной фразы нет в разговорнике.${r.neuralStatus === 'error' ? ` Нейроперевод: ${esc(r.neuralError || 'ошибка')}.` : ''}
        ${r.neuralStatus === 'unavailable' ? ` <button type="button" class="link-btn" data-install>Скачать нейропереводчик</button> — и переводите любые фразы без интернета.` : ''}</div>`;
    }

    // Машинный вариант в дополнение к разговорнику
    if (p && r.neuralStatus === 'done' && r.neural && r.neural !== main) {
      html += `<p class="b-alt"><span>Машинный вариант:</span> ${esc(r.neural)}</p>`;
    } else if (p && r.neuralStatus === 'pending') {
      html += `<p class="b-alt muted"><span class="spinner sm"></span> машинный вариант…</p>`;
    }

    // Пословный разбор
    if (!p && r.gloss && r.gloss.some((g) => g.translation)) {
      html += `<div class="b-gloss"><span class="b-gloss-k">По словам:</span>${r.gloss.map((g) =>
        `<span class="g ${g.translation ? '' : 'none'}"><b>${esc(g.word)}</b>${g.translation ? ` ${esc(g.translation)}` : ''}</span>`).join('')}</div>`;
    }

    // Похожие фразы
    if (r.similar && r.similar.length) {
      html += `<div class="b-similar"><span class="b-gloss-k">${p ? 'Ещё похоже:' : 'Возможно, вы имели в виду:'}</span>${r.similar.map((m) =>
        `<button type="button" class="chip sm" data-phrase="${m.phrase.id}" data-entry="${e.id}">${esc(m.phrase[e.src] || m.phrase.ru)}</button>`).join('')}</div>`;
    }
  }
  el.innerHTML = html;
  if (scroll) scrollDown();
}
