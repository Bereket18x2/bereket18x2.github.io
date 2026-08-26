/* ===========================================================
   sky.js — a canvas starfield behind every page.
   Reads its colors from the CSS custom properties already
   defined in style.css (--saffron, --parch) instead of
   hardcoding hex, so the sky always matches the theme.
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
  const SAFFRON = cssVar('--saffron', '#E8A73C');
  const PARCH = cssVar('--parch', '#EFE3C8');

  let dpr = 1, W = 0, H = 0, stars = [], shootingStars = [], t = 0;
  let running = true, rafId = null;

  function seed() {
    const count = Math.round((W * H) / 7000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.2,
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
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = s.gold ? SAFFRON : PARCH;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // spawns from the upper 45% of the sky, travelling diagonally down
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

    for (const s of stars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = s.gold ? SAFFRON : PARCH;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (Math.random() < 0.007) spawnShootingStar();

    for (const sh of shootingStars) {
      const tailX = sh.x - sh.vx * (sh.len / 12);
      const tailY = sh.y - sh.vy * (sh.len / 12);
      const grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.55, SAFFRON);
      grad.addColorStop(1, '#FFFDF6');

      ctx.globalAlpha = sh.life;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();

      ctx.fillStyle = '#FFFDF6';
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

    rafId = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (reduceMotion) return;
    running = !document.hidden;
    if (running) rafId = requestAnimationFrame(frame);
    else if (rafId) cancelAnimationFrame(rafId);
  });

  resize();
  if (reduceMotion) {
    drawStatic(); // static field, no twinkle, no shooting stars, no rAF loop
  } else {
    frame();
  }
})();
