// ===== Статистика Umami =====
// Ссылки и кнопки размечены в HTML атрибутом data-umami-event, а здесь — то, что открывается скриптом.
// Если счётчик не загрузился (блокировщик рекламы, просмотр не на v-dostatke.com), ничего не происходит.
const track = (name, data) => window.umami?.track(name, data);

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
      <img src="${reviews[i].face}" alt="Видеоотзыв: ${reviews[i].name || reviews[i].topic || 'клиент ' + (i + 1)}" width="128" height="128" loading="lazy"><span class="pl"></span>
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
  if (!trigger) return;
  playReview(+trigger.dataset.review);
  track('Видеоотзыв', { review: `№${reviews[current].file}`, place: trigger.classList.contains('bubble') ? 'облако отзывов' : 'обложка' });
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
    track('Диплом', { diploma: button.dataset.caption });
  });
});

// ===== Частые вопросы: какие открывают =====
// Считаем нажатие, а не событие toggle: оно срабатывает и при загрузке у вопроса, открытого по умолчанию.
document.querySelectorAll('.faq summary').forEach((s) => {
  s.addEventListener('click', () => {
    if (!s.parentElement.open) track('Вопрос', { question: s.textContent });
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

// ===== Кнопки связи: панель на телефоне и плавающие кнопки на компьютере =====
// Видны, когда кнопка «Хочу найти причину» первого экрана осталась выше экрана; прячутся, когда на экране блок #booking
// (там свои такие же кнопки), в открытом меню и пока открыт видеоотзыв (#mini) или диплом (#viewer).
// На компьютере ещё и над видеоотзывами и вопросами, чтобы не закрывать их. Положение считаем по прокрутке —
// так работает и при резком переходе по якорю. Раз за визит, через 25 с, по главной кнопке проходит золотой блик.
(() => {
  const groups = [...document.querySelectorAll('.js-contact')];
  const heroBtn = document.querySelector('.cover .cta-row .btn');
  const booking = document.getElementById('booking');
  if (!groups.length || !heroBtn || !booking) return;
  document.body.classList.add('has-contact-bar');
  const mini = document.getElementById('mini');
  const viewer = document.getElementById('viewer');
  const header = document.querySelector('.header');
  const desktop = window.matchMedia('(min-width: 769px)');
  const float = document.querySelector('.contact-float');
  const videoCards = () => document.querySelectorAll('#reviews .bubble');
  let shown = false;
  let shineReady = false;
  let shineDone = false;
  try { shineDone = sessionStorage.getItem('vd_shine') === '1'; } catch (e) {}

  const shine = () => {
    if (shineDone || !shineReady || !shown) return;
    shineDone = true;
    try { sessionStorage.setItem('vd_shine', '1'); } catch (e) {}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.cb-main, .cf-main').forEach((a) => {
      a.classList.add('is-shine');
      a.addEventListener('animationend', () => a.classList.remove('is-shine'), { once: true });
    });
  };
  setTimeout(() => { shineReady = true; shine(); }, 25000);

  const update = () => {
    const h = window.innerHeight;
    const pastHero = heroBtn.getBoundingClientRect().bottom < 0;
    const b = booking.getBoundingClientRect();
    const atBooking = b.top < h * 0.75 && b.bottom > h * 0.25;
    const modal = (mini && !mini.hidden) || (viewer && viewer.open) || (header && header.classList.contains('menu-open'));
    // На компьютере кнопки в правом нижнем углу прячутся, только если реально легли бы на видеоотзыв
    // (карточку с кнопкой плеера). Положение берём без анимации появления: offsetTop/Left не учитывают transform.
    let covers = false;
    if (desktop.matches && float) {
      const m = 8;
      const fTop = float.offsetTop - m, fBottom = float.offsetTop + float.offsetHeight + m;
      const fLeft = float.offsetLeft - m, fRight = float.offsetLeft + float.offsetWidth + m;
      for (const card of videoCards()) {
        const r = card.getBoundingClientRect();
        if (r.top < fBottom && r.bottom > fTop && r.left < fRight && r.right > fLeft) { covers = true; break; }
      }
    }
    shown = pastHero && !atBooking && !modal && !covers;
    groups.forEach((g) => {
      if (g.classList.contains('is-visible') !== shown) g.classList.toggle('is-visible', shown);
      g.inert = !shown;
    });
    shine();
  };
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  const mo = new MutationObserver(update);
  if (mini) mo.observe(mini, { attributes: true, attributeFilter: ['hidden'] });
  if (viewer) mo.observe(viewer, { attributes: true, attributeFilter: ['open'] });
  if (header) mo.observe(header, { attributes: true, attributeFilter: ['class'] });
  update();
})();

// ===== Боли: красное облачко под строками движется, только пока список на экране =====
(() => {
  const list = document.querySelector('.pain-list--one');
  if (!list || !('IntersectionObserver' in window)) return;
  new IntersectionObserver((entries) => {
    entries.forEach((e) => list.classList.toggle('is-live', e.isIntersecting));
  }, { threshold: 0.15 }).observe(list);
})();
