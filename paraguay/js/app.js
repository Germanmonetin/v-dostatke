// Точка входа: вкладки, статус сети, сервис-воркер, установка PWA.
import { initTranslator } from './translator.js';
import { initPhrasebook } from './phrasebook.js';
import { initMap, showMap } from './map.js';
import { initInfo } from './info.js';
import { $, $$ } from './ui.js';

const VIEWS = ['translate', 'phrases', 'map', 'info'];

function go(view, sub) {
  location.hash = sub ? `${view}/${sub}` : view;
}

function route() {
  const [view, sub] = (location.hash.replace('#', '') || 'translate').split('/');
  const v = VIEWS.includes(view) ? view : 'translate';
  for (const name of VIEWS) $(`#view-${name}`).hidden = name !== v;
  $$('.tabbar a').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === v ? 'page' : 'false'));
  document.body.dataset.view = v;
  if (v === 'map') showMap(sub);
  if (v === 'info' && sub) requestAnimationFrame(() => document.getElementById(sub)?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' }));
  else if (v !== 'translate' && v !== 'map') $(`#view-${v}`).scrollTop = 0;
}

function netStatus() {
  const on = navigator.onLine;
  const pill = $('#netPill');
  pill.classList.toggle('off', !on);
  $('.net-label', pill).textContent = on ? 'Онлайн' : 'Офлайн';
  pill.title = on ? 'Интернет есть' : 'Нет интернета — работают разговорник, карта-схема и скачанные модели';
}

initTranslator({ go });
initPhrasebook();
initMap();
initInfo();

window.addEventListener('hashchange', route);
window.addEventListener('online', netStatus);
window.addEventListener('offline', netStatus);
$('#netPill').addEventListener('click', () => go('info', 'offline'));
netStatus();
route();

// Сервис-воркер: приложение открывается и без сети
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Установка на главный экран
let deferred;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  const b = $('#installBtn');
  if (b) {
    b.hidden = false;
    b.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; b.hidden = true; };
  }
});
