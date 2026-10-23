// ===== Видеоотзывы =====
// Подписи заполняются здесь: имя, город и одной фразой — с каким запросом пришёл человек.
// Пока подписи пустые, строка подписи в плеере не показывается.
const reviews = [
  { name: '', topic: '' },
  { name: '', topic: '' },
  { name: '', topic: '' },
  { name: '', topic: '' },
  { name: '', topic: '' },
  { name: '', topic: '' },
  { name: '', topic: '' },
  { name: '', topic: '' },
].map((r, i) => ({
  ...r,
  src: `video/review-${i + 1}.mp4`,
  poster: `img/review-${i + 1}.webp`,
  face: `img/face-${i + 1}.webp`,
}));

// Облако: разные размеры кружков и две ленты, плывущие навстречу друг другу
const sizes = [112, 84, 128, 76, 100, 92, 120, 80];

document.querySelectorAll('.cloud-row').forEach((row, r) => {
  // Во второй ленте другой порядок, чтобы ленты не повторяли друг друга
  const order = reviews.map((_, i) => (r === 0 ? i : (i + 3) % reviews.length));
  const set = order.map((i, k) => `
    <button type="button" class="bubble" data-review="${i}"
      style="--s:${sizes[(k + r * 2) % sizes.length]}px; margin-top:${(k % 3) * 10}px"
      aria-label="Смотреть видеоотзыв ${i + 1}">
      <img src="${reviews[i].face}" alt="" width="128" height="128" loading="lazy"><span class="pl"></span>
    </button>`).join('');
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
