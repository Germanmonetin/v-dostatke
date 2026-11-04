// Экран «Разговорник».
import { PHRASES, PHRASE_CATEGORIES } from './data/phrases.js';
import { normalize, LS } from './engine.js';
import { $, esc, icon, speakBtn, showBtn } from './ui.js';

const state = { cat: 'basic', q: '', fav: new Set(LS.get('pg.fav', [])) };

export function initPhrasebook() {
  const cats = [{ id: 'fav', label: 'Избранное', icon: '★' }, ...PHRASE_CATEGORIES];
  $('#pbCats').innerHTML = cats.map((c) =>
    `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === state.cat}"><span aria-hidden="true">${c.icon}</span> ${esc(c.label)}</button>`).join('');
  $('#pbCats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.cat = b.dataset.cat;
    state.q = ''; $('#pbSearch').value = '';
    render();
  });
  $('#pbSearch').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  $('#pbList').addEventListener('click', (e) => {
    const f = e.target.closest('[data-fav]');
    if (!f) return;
    const id = f.dataset.fav;
    state.fav.has(id) ? state.fav.delete(id) : state.fav.add(id);
    LS.set('pg.fav', [...state.fav]);
    f.setAttribute('aria-pressed', String(state.fav.has(id)));
    if (state.cat === 'fav') render();
  });
  render();
}

function render() {
  document.querySelectorAll('#pbCats [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(!state.q && b.dataset.cat === state.cat)));
  let list;
  const q = normalize(state.q);
  if (q) {
    list = PHRASES.filter((p) => [p.ru, p.es, p.gn, ...(p.alt?.ru || []), ...(p.alt?.es || [])].some((t) => t && normalize(t).includes(q)));
  } else if (state.cat === 'fav') {
    list = PHRASES.filter((p) => state.fav.has(p.id));
  } else {
    list = PHRASES.filter((p) => p.cat === state.cat);
  }
  if (!list.length) {
    $('#pbList').innerHTML = `<p class="empty-note">${state.cat === 'fav' && !q ? 'Отмечайте звёздочкой фразы, которые нужны чаще всего, — они появятся здесь.' : 'Ничего не нашлось. Попробуйте другое слово — или переведите фразу во вкладке «Переводчик».'}</p>`;
    return;
  }
  $('#pbList').innerHTML = list.map(card).join('');
}

function card(p) {
  const line = (lang, label, text, pron) => text ? `
    <div class="pc-line">
      <span class="pc-lang">${label}</span>
      <div class="pc-text"><p lang="${lang}">${esc(text)}</p>${pron ? `<small>${esc(pron)}</small>` : ''}</div>
      <div class="pc-act">${speakBtn(text, lang)}${showBtn(text, lang, pron || '')}</div>
    </div>` : `
    <div class="pc-line none"><span class="pc-lang">${label}</span><div class="pc-text"><p>обычно говорят по-испански</p></div></div>`;
  return `<article class="pcard">
    <header><h3>${esc(p.ru)}</h3>
      <button type="button" class="icon-btn sm fav" data-fav="${p.id}" aria-pressed="${state.fav.has(p.id)}" aria-label="В избранное">${icon('i-star')}</button>
    </header>
    ${line('es', 'ES', p.es, p.esP)}
    ${line('gn', 'GN', p.gn, p.gnP)}
    ${p.note ? `<p class="pc-note">${esc(p.note)}</p>` : ''}
  </article>`;
}
