/* ===========================================================
   sky.js — the canvas behind every page.

   Night: a starfield. Each star twinkles on its own sine phase, and
   shooting stars cross the upper sky occasionally.
   Day: the same canvas, but slow motes of light drifting through a
   dawn-lit room instead of stars.

   Colours are read from the CSS custom properties, so the canvas
   follows the theme rather than keeping its own palette. Pauses on
   visibilitychange; under prefers-reduced-motion it paints one static
   frame and never starts a loop.
   =========================================================== */

(() => {
  const canvas = document.getElementById('sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  let ACCENT = '#E8A73C', TEXT = '#EFE3C8';
  const readPalette = () => {
    ACCENT = cssVar('--accent', '#E8A73C');
    TEXT = cssVar('--text', '#EFE3C8');
  };

  const isDay = () => document.documentElement.getAttribute('data-theme') === 'day';

  let dpr = 1, W = 0, H = 0, motes = [], shootingStars = [], t = 0;
  let running = true, rafId = null;

  function seed() {
    const count = Math.round((W * H) / 7000);
    motes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.2,
      // day motes drift; stars hold their position
      driftX: (Math.random() - 0.5) * 0.25,
      driftY: -(0.08 + Math.random() * 0.22),
      gold: Math.random() < 0.16
    }));
    shootingStars = [];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduceMotion) drawStatic();
  }

  function drawStatic() {
    readPalette();
    ctx.clearRect(0, 0, W, H);
    const day = isDay();
    for (const m of motes) {
      ctx.globalAlpha = day ? 0.35 : 0.75;
      ctx.fillStyle = m.gold ? ACCENT : (day ? ACCENT : TEXT);
      ctx.beginPath();
      ctx.arc(m.x, m.y, day ? m.r * 1.6 : m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // night only: enters from the upper 45%, travelling diagonally down
  function spawnShootingStar() {
    if (shootingStars.length >= 3) return;
    const angle = (35 + Math.random() * 25) * Math.PI / 180;
    const speed = 9 + Math.random() * 6;
    shootingStars.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      len: 90 + Math.random() * 60
    });
  }

  function frame() {
    if (!running) return;
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    const day = isDay();

    for (const m of motes) {
      if (day) {
        // dust in a shaft of morning light: drifting, soft, no twinkle
        m.x += m.driftX;
        m.y += m.driftY;
        if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
        if (m.x < -4) m.x = W + 4;
        if (m.x > W + 4) m.x = -4;
        ctx.globalAlpha = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.4 + m.phase));
        ctx.fillStyle = ACCENT;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * m.speed + m.phase));
        ctx.fillStyle = m.gold ? ACCENT : TEXT;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (!day) {
      if (Math.random() < 0.007) spawnShootingStar();

      for (const sh of shootingStars) {
        const tailX = sh.x - sh.vx * (sh.len / 12);
        const tailY = sh.y - sh.vy * (sh.len / 12);
        const grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.55, ACCENT);
        grad.addColorStop(1, TEXT);

        ctx.globalAlpha = sh.life;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sh.x, sh.y);
        ctx.stroke();

        ctx.fillStyle = TEXT;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 1.8, 0, Math.PI * 2);
        ctx.fill();

        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 0.012;
        if (sh.x > W + 60 || sh.y > H + 60) sh.life = 0;
      }
      ctx.globalAlpha = 1;
      shootingStars = shootingStars.filter((sh) => sh.life > 0);
    }

    rafId = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);

  // repaint with the new palette when the theme flips
  window.addEventListener('eotc:themechange', () => {
    readPalette();
    shootingStars = [];
    if (reduceMotion) drawStatic();
  });

  document.addEventListener('visibilitychange', () => {
    if (reduceMotion) return;
    running = !document.hidden;
    if (running) rafId = requestAnimationFrame(frame);
    else if (rafId) cancelAnimationFrame(rafId);
  });

  readPalette();
  resize();
  if (reduceMotion) drawStatic();   // one frame, no loop, no drift
  else frame();
})();
