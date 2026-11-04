// Сервис-воркер гида: оболочка приложения — из кэша (работает офлайн),
// плитки OpenStreetMap — кэшируются по мере просмотра.
const VERSION = 'v2';
const SHELL = `pg-shell-${VERSION}`;
const TILES = 'pg-tiles';
const LIBS = 'pg-libs';
const LIB_PREFIX = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/';
const MAX_TILES = 3000;

const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/ui.js', 'js/engine.js', 'js/translator.js', 'js/phrasebook.js', 'js/map.js', 'js/info.js',
  'js/recorder.js', 'js/ml-worker.js',
  'js/data/phrases.js', 'js/data/places.js', 'js/data/departments.js', 'js/data/departments-geo.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png', 'vendor/leaflet/images/marker-shadow.png', 'vendor/leaflet/images/layers.png',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('pg-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Плитки карты: сначала кэш, затем сеть (и сохраняем)
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(tile(req));
    return;
  }
  // Библиотека Transformers.js с CDN: версия закреплена, поэтому сначала кэш
  if (req.url.startsWith(LIB_PREFIX)) {
    e.respondWith(caches.open(LIBS).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) await c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // Только свои файлы; модели Hugging Face кэширует сама библиотека Transformers.js
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { putShell('index.html', r.clone()); return r; })
      .catch(() => caches.match('index.html', { cacheName: SHELL })));
    return;
  }
  // Stale-while-revalidate для файлов приложения
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Нет сети', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});

async function putShell(path, res) {
  if (!res.ok) return;
  const c = await caches.open(SHELL);
  await c.put(path, res);
}

let trimming = false;
async function tile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) {
      await cache.put(req, res.clone());
      if (!trimming && Math.random() < 0.05) { trimming = true; trim(cache).finally(() => { trimming = false; }); }
    }
    return res;
  } catch {
    return new Response('', { status: 504 });
  }
}

async function trim(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_TILES;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}
