/* Кнопка «Полезно» под статьями. Счётчик живёт на сервере Vultr (код — репозиторий -workspace, projects/likes).
   Пока сервер не отвечает, блок скрыт — статья выглядит как раньше.
   Повторное нажатие в том же браузере не засчитывается (localStorage). */
(() => {
  const box = document.querySelector('[data-likes]');
  if (!box) return;
  const API = window.VD_LIKES_API || ['https://likes.45-77-193-51.sslip.io', 'https://likes.45.77.193.51.nip.io'];
  const slug = box.dataset.likes;
  const btn = box.querySelector('.likes-btn');
  const countEl = box.querySelector('.likes-count');
  const noteEl = box.querySelector('.likes-note');
  const KEY = 'vd_like_' + slug;
  let liked = false;
  try { liked = localStorage.getItem(KEY) === '1'; } catch (e) {}
  let base = null;
  let count = 0;

  const call = async (path, opts) => {
    for (const b of base ? [base] : API) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(b + path, Object.assign({ signal: ctrl.signal }, opts));
        clearTimeout(t);
        if (r.ok || r.status === 429) { base = b; return r; }
      } catch (e) {}
    }
    return null;
  };

  const render = () => {
    countEl.textContent = count > 0 ? String(count) : '';
    btn.classList.toggle('is-liked', liked);
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    noteEl.textContent = liked ? 'Спасибо! Значит, пишу не зря.' : 'Отметьте, если статья была полезной';
  };

  call('/likes?slugs=' + encodeURIComponent(slug)).then(async (r) => {
    if (!r) return;
    try { count = (await r.json())[slug] || 0; } catch (e) { return; }
    render();
    box.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (liked) return;
    liked = true;
    count += 1;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    render();
    btn.classList.add('is-pop');
    btn.addEventListener('animationend', () => btn.classList.remove('is-pop'), { once: true });
    const r = await call('/likes/' + encodeURIComponent(slug), { method: 'POST' });
    if (r) { try { const d = await r.json(); if (typeof d.count === 'number') { count = Math.max(d.count, 1); render(); } } catch (e) {} }
  });
})();
