// Экран «Полезное»: экстренные номера, офлайн-пакет (модели), язык, практичные советы.
import { hub, MODELS, LS } from './engine.js';
import { $, esc, toast, fmtBytes, speakBtn } from './ui.js';

export function initInfo() {
  $('#infoWrap').innerHTML = `
    <h1 class="view-title">Полезное</h1>

    <section class="card sos" id="sos">
      <h2>Экстренные номера</h2>
      <div class="sos-grid">
        <a class="sos-btn main" href="tel:911"><b>911</b><span>Полиция и единый номер экстренных служб</span></a>
        <a class="sos-btn" href="tel:141"><b>141</b><span>Скорая помощь (SEME)</span></a>
        <a class="sos-btn" href="tel:131"><b>131</b><span>Пожарные-добровольцы</span></a>
      </div>
      <p class="muted small">Звонок на 911 бесплатный и работает с любой SIM-карты. Скажите: <b lang="es">«Necesito ayuda, estoy en …»</b> — «Мне нужна помощь, я нахожусь …». Консульские вопросы — через посольство России в Асунсьоне (контакты на сайте МИД России).</p>
    </section>

    <section class="card" id="offline">
      <h2>Офлайн-пакет</h2>
      <p class="muted">Всё скачивается один раз — лучше по Wi-Fi — и дальше работает без интернета: в самолёте, в Чако, без роуминга. Данные хранятся только на вашем устройстве.</p>
      <div class="pack">
        <div class="pack-row ok">
          <div><b>Разговорник, словарь, карта-схема, места</b><small>встроены в приложение</small></div>
          <span class="state ok">Готово</span>
        </div>
        <div class="pack-row" id="pack-asr"></div>
        <div class="pack-row" id="pack-mt"></div>
      </div>
      <p class="muted small" id="storageInfo"></p>
      <p class="muted small">Подробная карта: районы OpenStreetMap, которые вы уже открывали, сохраняются автоматически. Перед поездкой полистайте нужный город при включённом интернете.</p>
    </section>

    <section class="card" id="lang">
      <h2>Два языка Парагвая</h2>
      <p>Официальных языков два — <b>кастельяно</b> (испанский) и <b>гуарани</b>. На гуарани говорит большинство жителей, особенно вне столицы. В обычной речи языки часто смешивают — это называется <b lang="gn">jopara</b> (хопара).</p>
      <ul class="tips">
        <li><b>Vos вместо tú.</b> «¿Vos sos de Rusia?», «¿Tenés cambio?» — так говорят все.</li>
        <li><b>«Luego» и «na».</b> Смягчают просьбу: «Vení luego» — «подойди-ка», «Esperá na» — «подожди, пожалуйста».</li>
        <li><b>«Che».</b> В гуарани — «я/мой», а в разговоре — дружеское обращение.</li>
        <li><b>Произношение гуарани.</b> <i>y</i> — «ы», <i>j</i> — «дж», <i>ch</i> — «ш/ч», <i>'</i> — короткая пауза, <i>ã ẽ ĩ õ ũ ỹ</i> — в нос. Ударение обычно на последний слог.</li>
      </ul>
      <div class="say">
        <p><span lang="gn">Mba'éichapa!</span> — «Привет! Как дела?» ${speakBtn("Mba'éichapa", 'gn')}</p>
        <p><span lang="gn">Aguyje!</span> — «Спасибо!» ${speakBtn('Aguyje', 'gn')}</p>
      </div>
    </section>

    <section class="card" id="practical">
      <h2>Практично знать</h2>
      <dl class="facts wide">
        <div><dt>Валюта</dt><dd>Гуарани (PYG, ₲). Цены звучат в тысячах: «cincuenta mil» — 50 000 ₲. Наличные нужны на рынках и в автобусах.</dd></div>
        <div><dt>Время</dt><dd>UTC−3 круглый год (с 2024 года без перевода часов). Сиеста — примерно с 12 до 15 часов, в провинции многое закрыто.</dd></div>
        <div><dt>Климат</dt><dd>Лето (декабрь–февраль) жаркое, до +40 °C. Пейте воду, носите шляпу, днём старайтесь быть в тени.</dd></div>
        <div><dt>Розетки</dt><dd>220 В, 50 Гц. Встречаются европейские разъёмы и разъёмы других типов — возьмите универсальный адаптер.</dd></div>
        <div><dt>Транспорт</dt><dd>По городу — колективо (автобусы), такси, Bolt и Uber. Между городами — автобусы от автовокзала Асунсьона.</dd></div>
        <div><dt>Терере</dt><dd>Холодный мате — социальный ритуал. Если угощают, это знак дружбы. «Gracias» означает «мне хватит».</dd></div>
        <div><dt>Безопасность</dt><dd>Как в любом крупном городе: не показывайте дорогой телефон на рынке и в автобусе, вечером передвигайтесь на такси.</dd></div>
      </dl>
    </section>

    <section class="card about">
      <h2>О приложении</h2>
      <p class="muted small">Перевод: проверенный разговорник и пословный словарь, нейросеть <a href="https://huggingface.co/facebook/nllb-200-distilled-600M" target="_blank" rel="noopener">NLLB-200</a> (Meta, CC-BY-NC 4.0) и распознавание речи <a href="https://huggingface.co/openai/whisper-base" target="_blank" rel="noopener">Whisper</a> (OpenAI, MIT) через <a href="https://github.com/huggingface/transformers.js" target="_blank" rel="noopener">Transformers.js</a>. Машинный перевод на гуарани заметно слабее, чем на испанский, — для важных вещей пользуйтесь фразами из разговорника. Whisper не знает гуарани: речь на гуарани распознаётся приблизительно, как испанская.</p>
      <p class="muted small">Карта: <a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>, © участники <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>. Границы департаментов — <a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a> (CC BY 4.0). Точки, отмеченные как ориентировочные, уточняйте на месте.</p>
      <button type="button" class="btn ghost" id="installBtn" hidden>Установить на главный экран</button>
    </section>`;

  renderPack('asr');
  renderPack('mt');
  hub.addEventListener('change', (e) => renderPack(e.detail.task));
  $('#infoWrap').addEventListener('click', onClick);
  $('#infoWrap').addEventListener('change', (e) => {
    if (e.target.matches('select[data-model]')) LS.set(`pg.${e.target.dataset.model}.choice`, e.target.value);
  });
  storageInfo();
}

const TITLES = {
  asr: { name: 'Распознавание речи', what: 'Whisper: русский и испанский голосом без интернета; гуарани — экспериментально' },
  mt: { name: 'Нейропереводчик', what: 'NLLB-200: любые фразы RU ⇄ ES ⇄ GN без интернета' },
};

function renderPack(task) {
  const el = $(`#pack-${task}`);
  if (!el) return;
  const st = hub.state[task];
  const t = TITLES[task];
  const opts = MODELS[task].options;
  const choice = st.model || LS.get(`pg.${task}.choice`) || opts.find((o) => o.default).id;
  const opt = opts.find((o) => o.id === choice) || opts[0];
  let right = '';
  if (st.status === 'loading') {
    const pct = Math.round(st.progress || 0);
    right = `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
      <small>${st.total ? `${fmtBytes(st.loaded)} из ${fmtBytes(st.total)}` : 'Подготовка…'}</small>`;
  } else if (st.status === 'installed' || st.status === 'ready') {
    right = `<span class="state ok">${st.status === 'ready' ? 'Работает' : 'Скачано'}</span>
      <button type="button" class="link-btn danger" data-remove="${task}">Удалить</button>`;
  } else {
    right = `<button type="button" class="btn primary sm" data-download="${task}">Скачать · ${esc(opt.size)}</button>`;
  }
  const select = opts.length > 1 && !['installed', 'ready', 'loading'].includes(st.status)
    ? `<label class="model-pick"><span class="sr-only">Вариант модели</span><select data-model="${task}">${opts.map((o) =>
      `<option value="${o.id}" ${o.id === opt.id ? 'selected' : ''}>${esc(o.label)} — ${esc(o.size)}, ${esc(o.hint)}</option>`).join('')}</select></label>`
    : `<small class="model-name">${esc(opt.label)}</small>`;
  el.className = `pack-row ${st.status}`;
  el.innerHTML = `
    <div><b>${t.name}</b><small>${t.what}</small>${select}
      ${st.error ? `<small class="err">${esc(st.error)}</small>` : ''}</div>
    <div class="pack-right">${right}</div>`;
}

async function onClick(e) {
  const d = e.target.closest('[data-download]');
  if (d) {
    const task = d.dataset.download;
    if (!navigator.onLine) { toast('Для скачивания нужен интернет'); return; }
    try { await navigator.storage?.persist?.(); } catch { /* не критично */ }
    const choice = LS.get(`pg.${task}.choice`) || MODELS[task].options.find((o) => o.default).id;
    hub.load(task, choice).then(() => { toast(`${TITLES[task].name}: готово, работает офлайн`); storageInfo(); })
      .catch((err) => toast(err.message, 5000));
    return;
  }
  const r = e.target.closest('[data-remove]');
  if (r) {
    if (!confirm('Удалить модель с устройства? Потом её можно скачать снова.')) return;
    hub.remove(r.dataset.remove);
    setTimeout(storageInfo, 800);
  }
}

async function storageInfo() {
  const el = $('#storageInfo');
  if (!el || !navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const persisted = await navigator.storage.persisted?.();
    el.textContent = `Занято приложением: ${fmtBytes(usage)} из доступных ${fmtBytes(quota)}.${persisted ? ' Хранилище защищено от автоочистки.' : ''}`;
  } catch { /* ignore */ }
}
