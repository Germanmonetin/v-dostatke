// Экран «Карта»: Асунсьон и вся страна, департаменты, места, маршруты, «где я».
/* global L */
import { PLACES, CATEGORIES, ROUTES } from './data/places.js';
import { DEPARTMENTS } from './data/departments.js';
import { DEPARTMENTS_GEO } from './data/departments-geo.js';
import { normalize, LS } from './engine.js';
import { $, $$, esc, icon, toast, speakBtn, showBtn } from './ui.js';

const ASU = { center: [-25.2867, -57.6200], zoom: 13 };
const PY_BOUNDS = [[-27.62, -62.66], [-19.28, -54.25]];

const state = {
  cat: 'all', q: '',
  base: LS.get('pg.map.base', 'osm'),
  dept: LS.get('pg.map.dept', 'outline'),
  me: null, selected: null, route: null,
  view: 'list',
};
let map, tiles, deptLayer, markers = {}, routeLayer, meMarker, meCircle, watchId, tileErrors = 0;

// ——— Геометрия ———
function inRing(pt, ring) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function inGeom(pt, g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.some((poly) => inRing(pt, poly[0]) && !poly.slice(1).some((h) => inRing(pt, h)));
}
function deptOf(lat, lng) {
  const f = DEPARTMENTS_GEO.features.find((ft) => inGeom([lng, lat], ft.geometry));
  return f ? f.properties.iso : null;
}
function km(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function fmtKm(d) { return d < 1 ? `${Math.round(d * 1000)} м` : d < 10 ? `${d.toFixed(1).replace('.', ',')} км` : `${Math.round(d)} км`; }

// Департамент каждого места и плотность
for (const p of PLACES) p.dept = deptOf(p.lat, p.lng);
const COUNTS = {};
for (const p of PLACES) if (p.dept) COUNTS[p.dept] = (COUNTS[p.dept] || 0) + 1;
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));

export function initMap() {
  // Фильтры по категориям
  const cats = [['all', { short: 'Все', icon: '◎', color: 'var(--ink)' }], ...Object.entries(CATEGORIES)];
  $('#mapCats').innerHTML = cats.map(([id, c]) =>
    `<button type="button" class="chip" data-cat="${id}" aria-pressed="${id === state.cat}" style="--c:${c.color}"><span aria-hidden="true">${c.icon}</span> ${esc(c.short)}</button>`).join('');
  $('#mapCats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.cat = state.cat === b.dataset.cat ? 'all' : b.dataset.cat;
    $$('#mapCats [data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === state.cat)));
    applyFilter();
    showList();
  });
  $('#mapSearch').addEventListener('input', (e) => { state.q = e.target.value; applyFilter(); showList(); setDrawer('half'); });

  $('#drawerHandle').addEventListener('click', () => {
    const d = $('#drawer').dataset.state;
    setDrawer(d === 'peek' ? 'half' : d === 'half' ? 'full' : 'peek');
  });
  $('#drawerBody').addEventListener('click', onDrawerClick);
}

// Карта создаётся при первом показе вкладки (Leaflet нужен видимый контейнер).
export function showMap(focus) {
  if (!map) createMap();
  setTimeout(() => map.invalidateSize(), 30);
  if (focus && placeById[focus]) selectPlace(placeById[focus], true);
}

function createMap() {
  map = L.map('map', { zoomControl: false, attributionControl: true, minZoom: 5, maxZoom: 18, worldCopyJump: false })
    .setView(ASU.center, ASU.zoom);
  map.attributionControl.setPrefix('');
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, crossOrigin: 'anonymous',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });
  tiles.on('tileerror', () => { tileErrors++; if (tileErrors === 4) updateBanner(); });
  tiles.on('load', () => { tileErrors = 0; updateBanner(); });

  deptLayer = L.geoJSON(DEPARTMENTS_GEO, {
    style: deptStyle,
    onEachFeature: (f, layer) => {
      const d = DEPARTMENTS[f.properties.iso];
      layer.bindTooltip(d ? d.name : '', { permanent: true, direction: 'center', className: `dept-label${d && d.area < 13000 ? ' small' : ''}`, interactive: false });
      layer.on('click', (e) => {
        if (map.getZoom() >= 10) return; // в масштабе города не мешаем выбору мест
        L.DomEvent.stopPropagation(e);
        showDept(f.properties.iso);
      });
    },
  }).addTo(map);
  // Подпись Асунсьона дублирует город — убираем, она мелкая и перекрывает точки
  deptLayer.eachLayer((l) => { if (l.feature.properties.iso === 'PY-ASU') l.unbindTooltip(); });

  for (const p of PLACES) {
    const c = CATEGORIES[p.cat];
    const m = L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pin" style="--c:${c.color}"><i></i></span>`, iconSize: [30, 38], iconAnchor: [15, 36] }),
      title: p.name, keyboard: true, riseOnHover: true,
    });
    m.on('click', () => selectPlace(p, false));
    markers[p.id] = m;
  }

  routeLayer = L.layerGroup().addTo(map);
  applyBase();
  applyFilter();
  map.on('zoomend', onZoom);
  onZoom();

  $('#goCity').addEventListener('click', () => flyVisible(ASU.center, ASU.zoom));
  $('#goCountry').addEventListener('click', () => fitVisible(PY_BOUNDS, { paddingTopLeft: [0, 100], paddingBottomRight: [50, bottomPad()] }));
  $('#locateBtn').addEventListener('click', locate);
  $('#layerBtn').addEventListener('click', toggleLayersPanel);
  $('#routesBtn').addEventListener('click', () => { showRoutes(); setDrawer('half'); });
  window.addEventListener('online', updateBanner);
  window.addEventListener('offline', updateBanner);
  updateBanner();
  showList();
}

let lastCity = null;
function onZoom() {
  const z = map.getZoom();
  const el = map.getContainer();
  const city = z >= 10;
  if (city !== lastCity) { lastCity = city; deptLayer.setStyle(deptStyle); }
  el.classList.toggle('z-7', z >= 7);
  el.classList.toggle('z-country', z < 9);
  el.classList.toggle('z-labels', z >= 6 && z < 9);
}

// Нижняя панель на телефоне перекрывает карту — смещаем цель вверх, чтобы точка была видна.
function bottomPad() {
  if (matchMedia('(min-width: 900px)').matches) return 0;
  const st = $('#drawer').dataset.state;
  return st === 'peek' ? 132 : st === 'half' ? map.getSize().y * 0.5 : 0;
}
function flyVisible(latlng, zoom) {
  const pad = bottomPad();
  const pt = map.project(latlng, zoom).add([0, pad / 2]);
  map.flyTo(map.unproject(pt, zoom), zoom, { duration: 0.8 });
}
function fitVisible(bounds, opts = {}) {
  const pad = bottomPad();
  const side = matchMedia('(min-width: 900px)').matches ? 400 : 0;
  map.flyToBounds(bounds, { duration: 0.8, paddingTopLeft: [20 + side, 120], paddingBottomRight: [70, pad + 20], ...opts });
}

// ——— Слои ———
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => deptLayer && deptLayer.setStyle(deptStyle));
const DENSITY = ['#f6e7ef', '#efc3d9', '#e394bd', '#d4609b', '#b83a7e'];
function deptStyle(f) {
  const iso = f.properties.iso;
  const base = { weight: 1.2, color: cssVar('--dept-line'), opacity: 0.9, fillOpacity: 0 };
  const schema = state.base === 'schema';
  const city = map && map.getZoom() >= 10; // в масштабе города заливка только мешает
  if (state.dept === 'regions') {
    if (city) return { ...base, fillOpacity: 0 };
    const occ = DEPARTMENTS[iso]?.region === 'occidental';
    return { ...base, fillColor: occ ? '#d9b26a' : '#5f9f6e', fillOpacity: schema ? 0.55 : 0.32 };
  }
  if (state.dept === 'density') {
    if (city) return { ...base, fillOpacity: 0 };
    const n = COUNTS[iso] || 0;
    const i = n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 7 ? 3 : 4;
    return { ...base, fillColor: DENSITY[i], fillOpacity: schema ? 0.9 : 0.6 };
  }
  return { ...base, fillColor: cssVar('--dept-fill'), fillOpacity: schema ? 1 : 0.04 };
}

function applyBase() {
  if (state.base === 'osm') { if (!map.hasLayer(tiles)) tiles.addTo(map); }
  else if (map.hasLayer(tiles)) map.removeLayer(tiles);
  map.getContainer().classList.toggle('schema', state.base === 'schema');
  deptLayer.setStyle(deptStyle);
  updateBanner();
  renderLegend();
}

function renderLegend() {
  let el = $('.map-legend');
  if (!el) { el = document.createElement('div'); el.className = 'map-legend'; $('#view-map').appendChild(el); }
  if (state.dept === 'regions') {
    el.innerHTML = '<b>Регионы</b><span><i style="background:#5f9f6e"></i>Восточный</span><span><i style="background:#d9b26a"></i>Западный (Чако)</span>';
  } else if (state.dept === 'density') {
    el.innerHTML = `<b>Мест в гиде</b><span class="scale">${DENSITY.map((c) => `<i style="background:${c}"></i>`).join('')}</span><span class="scale-k"><small>0</small><small>8+</small></span>`;
  } else el.innerHTML = '';
  el.hidden = !el.innerHTML;
}

function toggleLayersPanel() {
  let pop = $('#layersPop');
  if (pop) { pop.remove(); return; }
  pop = document.createElement('div');
  pop.id = 'layersPop';
  pop.className = 'popover';
  const radio = (name, val, label, cur) => `<label class="opt"><input type="radio" name="${name}" value="${val}" ${cur === val ? 'checked' : ''}> ${label}</label>`;
  pop.innerHTML = `
    <fieldset><legend>Подложка</legend>
      ${radio('base', 'osm', 'Подробная карта <small>OpenStreetMap · просмотренные районы сохраняются</small>', state.base)}
      ${radio('base', 'schema', 'Схема <small>всегда офлайн</small>', state.base)}
    </fieldset>
    <fieldset><legend>Департаменты</legend>
      ${radio('dept', 'outline', 'Только границы', state.dept)}
      ${radio('dept', 'regions', 'Восток и Чако', state.dept)}
      ${radio('dept', 'density', 'Плотность интересных мест', state.dept)}
    </fieldset>`;
  pop.addEventListener('change', (e) => {
    if (e.target.name === 'base') { state.base = e.target.value; LS.set('pg.map.base', state.base); }
    if (e.target.name === 'dept') { state.dept = e.target.value; LS.set('pg.map.dept', state.dept); }
    applyBase();
  });
  $('#view-map').appendChild(pop);
  setTimeout(() => document.addEventListener('pointerdown', function close(ev) {
    if (!pop.contains(ev.target) && !ev.target.closest('#layerBtn')) { pop.remove(); document.removeEventListener('pointerdown', close); }
  }), 0);
}

function updateBanner() {
  const b = $('#mapBanner');
  if (state.base === 'osm' && (!navigator.onLine || tileErrors >= 4)) {
    b.innerHTML = 'Нет сети: видны районы, которые вы уже открывали. Схема департаментов и все места доступны всегда. <button type="button" class="link-btn" id="toSchema">Включить схему</button>';
    b.hidden = false;
    $('#toSchema').onclick = () => { state.base = 'schema'; LS.set('pg.map.base', 'schema'); applyBase(); };
  } else b.hidden = true;
}

// ——— Фильтр ———
function visiblePlaces() {
  const q = normalize(state.q);
  return PLACES.filter((p) => {
    if (state.cat !== 'all' && p.cat !== state.cat) return false;
    if (!q) return true;
    const hay = normalize(`${p.name} ${p.es} ${p.gn || ''} ${CATEGORIES[p.cat].label} ${DEPARTMENTS[p.dept]?.name || ''} ${DEPARTMENTS[p.dept]?.es || ''}`);
    return q.split(' ').every((w) => hay.includes(w));
  });
}

function applyFilter() {
  if (!map) return;
  const vis = new Set(visiblePlaces().map((p) => p.id));
  for (const [id, m] of Object.entries(markers)) {
    const show = vis.has(id) || (state.route && state.route.stops.includes(id));
    if (show && !map.hasLayer(m)) m.addTo(map);
    if (!show && map.hasLayer(m)) map.removeLayer(m);
  }
}

// ——— Панель снизу ———
function setDrawer(s) {
  $('#drawer').dataset.state = s;
  $('#drawerHandle').setAttribute('aria-label', s === 'full' ? 'Свернуть список' : 'Развернуть список');
}

function sortByDistance(list) {
  if (!state.me) return list;
  return [...list].sort((a, b) => km(state.me, [a.lat, a.lng]) - km(state.me, [b.lat, b.lng]));
}

function placeRow(p) {
  const c = CATEGORIES[p.cat];
  const dist = state.me ? `<span class="pr-dist">${fmtKm(km(state.me, [p.lat, p.lng]))}</span>` : '';
  return `<button type="button" class="prow" data-place="${p.id}">
    <i class="pr-dot" style="--c:${c.color}"></i>
    <span class="pr-main"><b>${esc(p.name)}</b><small>${esc(p.es)}</small></span>
    <span class="pr-side">${dist}<small>${esc(DEPARTMENTS[p.dept]?.name || '')}</small></span>
  </button>`;
}

function showList() {
  state.view = 'list';
  const list = sortByDistance(visiblePlaces());
  const title = state.cat === 'all' ? 'Все места' : CATEGORIES[state.cat].label;
  $('#drawerBody').innerHTML = `
    <div class="dr-head"><h2>${esc(title)} <span class="count">${list.length}</span></h2>
      <span class="dr-sub">${state.me ? 'ближайшие сверху' : 'нажмите ⌖, чтобы сортировать по расстоянию'}</span></div>
    <div class="dr-list">${list.map(placeRow).join('') || '<p class="empty-note">Ничего не найдено.</p>'}</div>`;
}

function selectPlace(p, fly) {
  state.selected = p.id;
  $$('.pin.sel').forEach((x) => x.classList.remove('sel'));
  const m = markers[p.id];
  if (!map.hasLayer(m)) m.addTo(map);
  m.getElement()?.querySelector('.pin')?.classList.add('sel');
  showDetail(p);
  setDrawer('half');
  flyVisible([p.lat, p.lng], fly ? Math.max(map.getZoom(), p.area === 'asu' ? 15 : 11) : map.getZoom());
}

function showDetail(p) {
  state.view = 'detail';
  const c = CATEGORIES[p.cat];
  const d = DEPARTMENTS[p.dept];
  const dist = state.me ? fmtKm(km(state.me, [p.lat, p.lng])) : null;
  const askEs = `Disculpe, ¿dónde queda ${p.es.split(/ [—(\/·]/)[0]}?`;
  const askGn = `Moõpa oĩ ${p.es.split(/ [—(\/·]/)[0]}?`;
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;
  $('#drawerBody').innerHTML = `
    <div class="pd">
      <button type="button" class="link-btn back" data-back>← К списку</button>
      <span class="cat-pill" style="--c:${c.color}">${c.icon} ${esc(c.label)}</span>
      <h2>${esc(p.name)}</h2>
      <p class="pd-es" lang="es">${esc(p.es)}${p.gn ? ` · <span lang="gn">${esc(p.gn)}</span>` : ''}</p>
      <p class="pd-meta">${d ? `Департамент ${esc(d.name)}` : ''}${dist ? ` · от вас ${dist} по прямой` : ''}${p.approx ? ' · <span class="approx" title="Точку уточните на месте">точка ориентировочная</span>' : ''}</p>
      <p class="pd-desc">${esc(p.desc)}</p>
      ${p.tip ? `<p class="pd-tip"><b>Совет.</b> ${esc(p.tip)}</p>` : ''}
      <div class="pd-actions">
        <a class="btn primary" href="${dirUrl}" target="_blank" rel="noopener">Проложить маршрут</a>
        <a class="btn ghost" href="${osmUrl}" target="_blank" rel="noopener">В OpenStreetMap</a>
        <button type="button" class="btn ghost" data-copy="${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}">${icon('i-copy')} Координаты</button>
      </div>
      <div class="pd-ask">
        <h3>Как спросить дорогу</h3>
        <div class="ask-line"><span class="pc-lang">ES</span><p lang="es">${esc(askEs)}</p>${speakBtn(askEs, 'es')}${showBtn(askEs, 'es')}</div>
        <div class="ask-line"><span class="pc-lang">GN</span><p lang="gn">${esc(askGn)}</p>${speakBtn(askGn, 'gn')}${showBtn(askGn, 'gn', 'моо́па ои́ …')}</div>
      </div>
    </div>`;
  $('#drawerBody').scrollTop = 0;
}

function showDept(iso) {
  const d = DEPARTMENTS[iso];
  if (!d) return;
  state.view = 'dept';
  const list = PLACES.filter((p) => p.dept === iso);
  $('#drawerBody').innerHTML = `
    <div class="pd">
      <button type="button" class="link-btn back" data-back>← К списку</button>
      <span class="cat-pill" style="--c:${d.region === 'occidental' ? '#b08a3e' : '#2f7d4f'}">${d.region === 'occidental' ? 'Западный регион · Чако' : 'Восточный регион'}</span>
      <h2>${esc(d.name)}</h2>
      <p class="pd-es" lang="es">${esc(d.es)}</p>
      <dl class="facts">
        <div><dt>Столица</dt><dd>${esc(d.capital)}</dd></div>
        <div><dt>Площадь</dt><dd>${d.area.toLocaleString('ru-RU')} км²</dd></div>
        <div><dt>Мест в гиде</dt><dd>${list.length}</dd></div>
      </dl>
      <p class="pd-desc">${esc(d.note)}</p>
      ${list.length ? `<div class="dr-list">${list.map(placeRow).join('')}</div>` : ''}
    </div>`;
  setDrawer('half');
  const layer = deptLayer.getLayers().find((l) => l.feature.properties.iso === iso);
  if (layer) {
    deptLayer.resetStyle();
    layer.setStyle({ weight: 3, color: cssVar('--lapacho') });
    fitVisible(layer.getBounds(), { maxZoom: 9 });
  }
}

function showRoutes() {
  state.view = 'routes';
  $('#drawerBody').innerHTML = `
    <div class="dr-head"><h2>Маршруты</h2><span class="dr-sub">готовые идеи на день и на несколько дней</span></div>
    <div class="routes">${ROUTES.map((r) => `
      <button type="button" class="route-card ${state.route?.id === r.id ? 'on' : ''}" data-route="${r.id}" style="--c:${r.color}">
        <b>${esc(r.name)}</b><small>${esc(r.time)} · ${r.stops.length} остановок</small>
      </button>`).join('')}
    </div>
    ${state.route ? '<button type="button" class="link-btn" data-route-clear>Скрыть маршрут с карты</button>' : ''}`;
}

function drawRoute(r) {
  routeLayer.clearLayers();
  state.route = r;
  const pts = r.stops.map((id) => placeById[id]).filter(Boolean);
  const ll = pts.map((p) => [p.lat, p.lng]);
  L.polyline(ll, { color: r.color, weight: 8, opacity: 0.18, lineCap: 'round' }).addTo(routeLayer);
  L.polyline(ll, { color: r.color, weight: 3, dashArray: '2 8', lineCap: 'round' }).addTo(routeLayer);
  pts.forEach((p, i) => {
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'step-wrap', html: `<span class="step" style="--c:${r.color}">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 30] }),
      interactive: false, zIndexOffset: 1000,
    }).addTo(routeLayer);
  });
  applyFilter();
  fitVisible(L.latLngBounds(ll), { maxZoom: 15 });
  let total = 0;
  $('#drawerBody').innerHTML = `
    <div class="pd">
      <button type="button" class="link-btn back" data-routes>← Все маршруты</button>
      <span class="cat-pill" style="--c:${r.color}">Маршрут · ${esc(r.time)}</span>
      <h2>${esc(r.name)}</h2>
      <ol class="stops">${pts.map((p, i) => {
        const leg = i ? km([pts[i - 1].lat, pts[i - 1].lng], [p.lat, p.lng]) : 0;
        total += leg;
        return `<li style="--c:${r.color}"><button type="button" class="prow" data-place="${p.id}"><span class="pr-main"><b>${esc(p.name)}</b><small>${esc(p.es)}</small></span>${i ? `<span class="pr-side"><small>+${fmtKm(leg)}</small></span>` : ''}</button></li>`;
      }).join('')}</ol>
      <p class="pd-meta">Всего ≈ ${fmtKm(total)} по прямой между точками; по дорогам — больше.</p>
      <button type="button" class="link-btn" data-route-clear>Скрыть маршрут с карты</button>
    </div>`;
}

function onDrawerClick(e) {
  const pl = e.target.closest('[data-place]');
  if (pl) { selectPlace(placeById[pl.dataset.place], true); return; }
  if (e.target.closest('[data-back]')) { $$('.pin.sel').forEach((x) => x.classList.remove('sel')); deptLayer.resetStyle(); showList(); return; }
  if (e.target.closest('[data-routes]')) { showRoutes(); return; }
  const r = e.target.closest('[data-route]');
  if (r) { drawRoute(ROUTES.find((x) => x.id === r.dataset.route)); return; }
  if (e.target.closest('[data-route-clear]')) { routeLayer.clearLayers(); state.route = null; applyFilter(); showRoutes(); }
}

// ——— Где я ———
function locate() {
  if (!navigator.geolocation) { toast('Геолокация недоступна на этом устройстве'); return; }
  if (state.me) flyVisible(state.me, Math.max(map.getZoom(), 14));
  if (watchId != null) return;
  toast('Определяю местоположение…');
  watchId = navigator.geolocation.watchPosition((pos) => {
    const first = !state.me;
    state.me = [pos.coords.latitude, pos.coords.longitude];
    if (!meMarker) {
      meCircle = L.circle(state.me, { radius: pos.coords.accuracy, color: '#1f6feb', weight: 1, fillOpacity: 0.1, interactive: false }).addTo(map);
      meMarker = L.marker(state.me, { icon: L.divIcon({ className: 'me-wrap', html: '<span class="me-dot"></span>', iconSize: [20, 20] }), interactive: false, zIndexOffset: 2000 }).addTo(map);
    } else { meMarker.setLatLng(state.me); meCircle.setLatLng(state.me).setRadius(pos.coords.accuracy); }
    $('#locateBtn').classList.add('on');
    if (first) {
      flyVisible(state.me, 14);
      if (!deptOf(...state.me)) toast('Вы сейчас за пределами Парагвая — расстояния всё равно посчитаны');
      if (state.view === 'list') showList();
    }
  }, (err) => {
    watchId = null;
    toast(err.code === 1 ? 'Разрешите доступ к геолокации' : 'Не удалось определить местоположение');
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
}
