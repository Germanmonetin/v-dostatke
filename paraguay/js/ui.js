// Общие мелочи интерфейса.
import { speak, canSpeak, LANGS } from './engine.js';

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function icon(id, cls = '') { return `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`; }

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function speakBtn(text, lang, label = 'Озвучить') {
  if (!canSpeak() || !text) return '';
  return `<button type="button" class="icon-btn sm speak" data-speak="${esc(text)}" data-lang="${lang}" aria-label="${label}: ${esc(LANGS[lang].label)}">${icon('i-speak')}</button>`;
}

export function showBtn(text, lang, sub = '') {
  return `<button type="button" class="icon-btn sm" data-show="${esc(text)}" data-lang="${lang}" data-sub="${esc(sub)}" aria-label="Показать собеседнику крупно">${icon('i-expand')}</button>`;
}

// Делегированные обработчики «озвучить» / «показать крупно» / «копировать»
document.addEventListener('click', (e) => {
  const sp = e.target.closest('[data-speak]');
  if (sp) { speak(sp.dataset.speak, sp.dataset.lang); return; }
  const sh = e.target.closest('[data-show]');
  if (sh) { showCard(sh.dataset.show, sh.dataset.lang, sh.dataset.sub); return; }
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    navigator.clipboard?.writeText(cp.dataset.copy).then(() => toast('Скопировано'), () => toast('Не удалось скопировать'));
  }
});

export function showCard(text, lang, sub = '') {
  const el = $('#showcard');
  $('#showcardBody').innerHTML = `
    <div class="showcard-lang">${esc(LANGS[lang]?.label || '')}</div>
    <p class="showcard-text" lang="${lang === 'gn' ? 'gn' : lang}">${esc(text)}</p>
    ${sub ? `<p class="showcard-sub">${esc(sub)}</p>` : ''}
    ${canSpeak() ? `<button type="button" class="btn ghost big" data-speak="${esc(text)}" data-lang="${lang}">${icon('i-speak')} Озвучить</button>` : ''}`;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('open'));
  $('#showcardClose').focus();
}

function closeCard() {
  const el = $('#showcard');
  el.classList.remove('open');
  setTimeout(() => { el.hidden = true; }, 200);
}
$('#showcardClose').addEventListener('click', closeCard);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#showcard').hidden) closeCard(); });

export function fmtBytes(n) {
  if (!n) return '0 МБ';
  if (n > 1e9) return `${(n / 1e9).toFixed(2).replace('.', ',')} ГБ`;
  return `${Math.round(n / 1e6)} МБ`;
}
