// ===== Золотые нейросети вдоль краёв страницы =====
// В случайном месте слева или справа рождается «бегущая» схема: прочерчивает
// вертикальный маршрут со ступеньками под 45°, как дорожка на плате с логотипа,
// в конце выстреливает тонкой золотой пикой, вспыхивает и гаснет. Затем рождается
// следующая в другом месте. Живут только в боковых полях и не заходят на текст.
// При прокрутке схемы бегут быстрее и появляются чаще. Слой не перехватывает клики.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // это чистое украшение: без анимации просто не показываем

  const canvas = document.createElement('canvas');
  canvas.className = 'circuits';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const GOLD = '196, 156, 78'; // золото между светлым и тёмным вариантом — видно на обоих фонах

  let W = 0, H = 0, dpr = 1, room = 0;
  let runners = [];
  let lastScroll = window.scrollY, scrollEnergy = 0, lastTime = performance.now(), spawnTimer = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  // Ширина свободного поля от края экрана до текста
  function sideRoom() {
    const wrap = document.querySelector('.wrap');
    if (!wrap) return 0;
    const textLeft = wrap.getBoundingClientRect().left + parseFloat(getComputedStyle(wrap).paddingLeft);
    // На компьютере оставляем 16 px до текста, на телефоне — 3 px (поле там узкое)
    return textLeft - (W < 640 ? 3 : 16);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    room = sideRoom();
  }

  // Маршрут: вертикальные отрезки и ступеньки под 45° внутри поля
  function makeRunner() {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const minX = 3, maxX = Math.max(minX + 2, room - (W < 640 ? 9 : 4));
    let x = rand(minX, maxX);
    const dir = Math.random() < 0.5 ? -1 : 1; // вверх или вниз
    let y = dir > 0 ? rand(H * 0.05, H * 0.55) : rand(H * 0.45, H * 0.95);
    const pts = [[x, y]];
    const steps = Math.round(rand(3, 6));
    for (let i = 0; i < steps; i++) {
      y += dir * rand(36, 120);
      pts.push([x, y]);
      if (i < steps - 1 && maxX - minX > 6) {
        // ступенька в сторону, не выходя из поля
        let dx = rand(6, Math.min(26, (maxX - minX) * 0.6)) * (Math.random() < 0.5 ? -1 : 1);
        if (x + dx < minX || x + dx > maxX) dx = -dx;
        x = Math.min(maxX, Math.max(minX, x + dx));
        y += dir * Math.abs(dx);
        pts.push([x, y]);
      }
    }
    let total = 0;
    const seg = [];
    for (let k = 1; k < pts.length; k++) {
      const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      seg.push(d); total += d;
    }
    return {
      side, dir, pts, seg, total,
      d: 0, speed: rand(150, 260),
      spike: 0, spikeLen: rand(26, 60), // пика в конце маршрута
      fade: 1, phase: 'draw',
    };
  }

  const X = (side, x) => (side === 'left' ? x : W - x);

  // Все изломы маршрута до расстояния d и текущая точка головы
  function pathTo(r, d) {
    const out = [r.pts[0]];
    for (let k = 0; k < r.seg.length; k++) {
      if (d <= r.seg[k]) {
        const f = d / r.seg[k], a = r.pts[k], b = r.pts[k + 1];
        out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        return out;
      }
      d -= r.seg[k];
      out.push(r.pts[k + 1]);
    }
    return out;
  }

  function drawRunner(r) {
    const path = pathTo(r, r.d);
    const a = r.fade;
    // След маршрута
    ctx.beginPath();
    path.forEach(([x, y], i) => (i ? ctx.lineTo(X(r.side, x), y) : ctx.moveTo(X(r.side, x), y)));
    ctx.strokeStyle = `rgba(${GOLD}, ${0.55 * a})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Узелки на пройденных изломах
    for (let k = 1; k < path.length - 1; k++) {
      ctx.beginPath();
      ctx.arc(X(r.side, path[k][0]), path[k][1], 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${GOLD}, ${0.7 * a})`;
      ctx.fill();
    }
    // Начальная точка — кружок, как на концах дорожек логотипа
    ctx.beginPath();
    ctx.arc(X(r.side, r.pts[0][0]), r.pts[0][1], 2.6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${GOLD}, ${0.75 * a})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    const [hx, hy] = path[path.length - 1];
    const x = X(r.side, hx);
    ctx.save();
    ctx.shadowColor = `rgba(${GOLD}, 1)`;
    if (r.phase === 'draw') {
      // Светящаяся голова
      ctx.shadowBlur = W < 640 ? 5 : 12;
      ctx.beginPath();
      ctx.arc(x, hy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${GOLD}, 1)`;
      ctx.fill();
    } else {
      // Пика: тонкий сужающийся луч вдоль направления, вспышка на острие
      const tipY = hy + r.dir * r.spikeLen * r.spike;
      ctx.shadowBlur = (W < 640 ? 6 : 16) * a;
      ctx.beginPath();
      ctx.moveTo(x - 1.8, hy);
      ctx.lineTo(x + 1.8, hy);
      ctx.lineTo(x, tipY);
      ctx.closePath();
      ctx.fillStyle = `rgba(${GOLD}, ${a})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, tipY, 1.4 + 3 * r.spike * a, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 236, 190, ${0.9 * a})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(64, now - lastTime) / 1000;
    lastTime = now;
    const sy = window.scrollY;
    scrollEnergy = Math.min(4, scrollEnergy * 0.93 + Math.abs(sy - lastScroll) / 140);
    lastScroll = sy;

    ctx.clearRect(0, 0, W, H);
    if (room >= 8) {
      // Новые схемы: в покое по одной-две, при прокрутке чаще
      spawnTimer -= dt * (1 + scrollEnergy * 1.5);
      const maxAlive = 2 + Math.round(scrollEnergy);
      if (spawnTimer <= 0 && runners.length < maxAlive) {
        runners.push(makeRunner());
        spawnTimer = rand(0.7, 1.8);
      }
    }

    runners = runners.filter((r) => {
      const boost = 1 + scrollEnergy * 0.7;
      if (r.phase === 'draw') {
        r.d += r.speed * boost * dt;
        if (r.d >= r.total) { r.d = r.total; r.phase = 'spike'; }
      } else if (r.phase === 'spike') {
        r.spike = Math.min(1, r.spike + dt * 6); // «фух» — быстро
        if (r.spike >= 1) r.phase = 'fade';
      } else {
        r.fade -= dt * 1.4;
        if (r.fade <= 0) return false;
      }
      drawRunner(r);
      return true;
    });

    requestAnimationFrame(frame);
  }

  resize();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); runners = []; }, 150); });
  requestAnimationFrame(frame);
})();
