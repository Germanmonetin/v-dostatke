// ===== Видеоотзывы =====
// Порядок = порядок показа. Первыми идут избранные (top: true): они крупнее и стоят в начале обеих лент.
// file — номер файла video/review-N.mp4. Подписи: имя, город и одной фразой — с каким запросом пришёл человек;
// пока подписи пустые, строка подписи в плеере не показывается.
const reviews = [
  { file: 9, top: true },
  { file: 10, top: true },
  { file: 11, top: true },
  { file: 12, top: true },
  { file: 13, top: true },
  { file: 1, top: true },
  { file: 7, top: true },
  { file: 2 },
  { file: 3 },
  { file: 4 },
  { file: 5 },
  { file: 6 },
  { file: 8 },
].map((r) => ({
  name: '', topic: '', ...r,
  src: `video/review-${r.file}.mp4`,
  poster: `img/review-${r.file}.webp`,
  face: `img/face-${r.file}.webp`,
}));

// Облако: избранные кружки крупнее, остальные мельче; две ленты плывут навстречу друг другу
const topSizes = [128, 116, 124, 112, 120, 118, 126];
const restSizes = [88, 76, 96, 82, 92, 80];

document.querySelectorAll('.cloud-row').forEach((row, r) => {
  const top = reviews.map((x, i) => i).filter((i) => reviews[i].top);
  const rest = reviews.map((x, i) => i).filter((i) => !reviews[i].top);
  // Обе ленты начинаются с избранных; во второй — в обратном порядке, чтобы ленты не повторяли друг друга
  const order = r === 0 ? [...top, ...rest] : [...[...top].reverse(), ...[...rest].reverse()];
  const set = order.map((i, k) => {
    const size = reviews[i].top ? topSizes[(k + r) % topSizes.length] : restSizes[(k + r) % restSizes.length];
    return `
    <button type="button" class="bubble" data-review="${i}"
      style="--s:${size}px; margin-top:${(k % 3) * 10}px"
      aria-label="Смотреть видеоотзыв ${i + 1}">
      <img src="${reviews[i].face}" alt="" width="128" height="128" loading="lazy"><span class="pl"></span>
    </button>`;
  }).join('');
  // Половина ленты (два набора) шире любого экрана; вторая половина — её копия для бесшовного движения
  row.innerHTML = set + set + set + set;
  row.querySelectorAll('.bubble').forEach((b, k) => {
    if (k >= order.length) { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
  });
});

// Мини-плеер
const mini = document.getElementById('mini');
const video = document.getElementById('mini-video');
let current = -1;

function playReview(i) {
  current = (i + reviews.length) % reviews.length;
  const r = reviews[current];
  video.src = r.src;
  video.poster = r.poster;
  document.getElementById('mini-name').textContent = r.name;
  document.getElementById('mini-topic').textContent = r.topic;
  document.querySelector('.mini-who').hidden = !r.name && !r.topic;
  mini.hidden = false;
  video.play().catch(() => {}); // если браузер запретит автозапуск, останется кнопка Play
  document.querySelectorAll('.bubble').forEach((b) => b.classList.toggle('is-playing', +b.dataset.review === current));
}

function closeMini() {
  video.pause();
  video.removeAttribute('src');
  video.load();
  mini.hidden = true;
  current = -1;
  document.querySelectorAll('.bubble.is-playing').forEach((b) => b.classList.remove('is-playing'));
}

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-review]');
  if (trigger) playReview(+trigger.dataset.review);
});
document.getElementById('mini-prev').addEventListener('click', () => playReview(current - 1));
document.getElementById('mini-next').addEventListener('click', () => playReview(current + 1));
document.getElementById('mini-close').addEventListener('click', closeMini);
video.addEventListener('ended', () => playReview(current + 1)); // после отзыва сразу следующий

// ===== Шапка: крупный логотип вверху, компактный после начала прокрутки =====
const header = document.querySelector('.header--cover');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 60);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ===== Мобильное меню =====
const menuButton = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', open);
  nav.classList.toggle('is-open', open);
  menuButton.closest('.header').classList.toggle('menu-open', open); // крупный логотип не перекрывает меню
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

// ===== Просмотр дипломов =====
const viewer = document.getElementById('viewer');

document.querySelectorAll('.diploma').forEach((button) => {
  button.addEventListener('click', () => {
    viewer.querySelector('img').src = button.dataset.full;
    viewer.querySelector('img').alt = button.dataset.caption;
    viewer.querySelector('p').textContent = button.dataset.caption;
    viewer.showModal();
  });
});
document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); }); // клик по затемнению

// Esc закрывает меню и мини-плеер (диалог с дипломом браузер закрывает сам)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!mini.hidden) closeMini();
  setMenu(false);
});

// ===== Незаполненные ссылки =====
// Пока у ссылки есть data-todo, она не уводит в никуда, а подсказывает, что нужно вписать.
document.querySelectorAll('[data-todo]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    alert(`Здесь будет: ${link.dataset.todo}`);
  });
});

// ===== Видео с YouTube: лёгкая вставка =====
// Пока человек не нажал, показывается только обложка — страница не тормозит.
// Вставка: <button class="yt" data-id="ID_ВИДЕО" data-title="Название"></button>
// Для вертикальных Shorts добавить класс yt--short.
document.querySelectorAll('.yt[data-id]').forEach((box) => {
  const id = box.dataset.id;
  box.type = 'button';
  box.setAttribute('aria-label', `Смотреть видео: ${box.dataset.title || ''}`);
  box.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
  box.innerHTML = '<span class="yt-play"></span>';
  box.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    frame.title = box.dataset.title || 'Видео';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    box.classList.add('yt-frame');
    box.style.backgroundImage = 'none';
    box.replaceChildren(frame);
  }, { once: true });
});

// ===== Почта: адрес собирается здесь, чтобы спам-роботы не нашли его в коде страницы =====
document.querySelectorAll('.js-mail').forEach((a) => {
  const addr = a.dataset.u + '@' + a.dataset.d;
  a.href = 'mailto:' + addr;
  a.textContent = addr;
});
