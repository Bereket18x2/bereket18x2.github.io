/* ===========================================================
   journey-anim.js — motion, and the switch that turns it all off.

   Web Animations API plus CSS. No library, no requestAnimationFrame
   loop left running: every animation here is finite, and the ambient
   ones live in CSS so the compositor owns them rather than the main
   thread.

   ONLY transform AND opacity ARE ANIMATED, with one deliberate
   exception — stroke-dashoffset on the road, which is the draw-on
   effect and has no transform equivalent. Everything else that could
   cause layout (width, top, left) is avoided, because the audience is
   on whatever phone the family already had.

   prefers-reduced-motion is honoured by SKIPPING, not by shortening:
   the final state is applied immediately, no confetti is created, and
   no animation object is constructed at all. A child who gets motion
   sick should not be shown a faster version of the thing. */

const REDUCED = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Draws the walked road up to `fraction` (0-1) of its length.

   stroke-dasharray is set to the full length and the offset animated
   from that length to the remainder, which is what makes the line
   appear to grow from the start rather than fade in. */
export function drawRoad(pathEl, fraction) {
  const len = pathEl.getTotalLength();
  const visible = Math.max(0, Math.min(1, fraction)) * len;
  pathEl.style.strokeDasharray = `${len}`;

  if (REDUCED() || visible === 0) {
    pathEl.style.strokeDashoffset = `${len - visible}`;
    return Promise.resolve();
  }
  pathEl.style.strokeDashoffset = `${len}`;
  const a = pathEl.animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: len - visible }],
    { duration: Math.min(1800, 500 + visible * 1.1), easing: 'ease-out', fill: 'forwards' }
  );
  /* Commit the final value to the inline style once it lands.
     `fill: 'forwards'` only holds the value on the animation object, so
     the element's own style still reads "undrawn" — and anything that
     drops the animation (a bfcache restore, devtools pausing it, the
     page being serialised) snaps the road back to nothing. Writing the
     end state makes the DOM tell the truth about what is on screen. */
  const settle = () => {
    pathEl.style.strokeDashoffset = `${len - visible}`;
    a.cancel();
  };
  return a.finished.then(settle).catch(settle);
}

/* Walks the traveller from one station to another ALONG THE ROAD.

   Sampling the path with getPointAtLength and emitting a keyframe per
   step is what keeps the avatar on the curve; a straight tween between
   two stations would cut the corner and walk through the grass. 28
   steps is enough that the motion reads as smooth and few enough that
   the keyframe array stays small on a slow phone. */
export function walkAlong(avatarEl, pathEl, fromFraction, toFraction, { steps = 28 } = {}) {
  const len = pathEl.getTotalLength();
  const at = (f) => pathEl.getPointAtLength(Math.max(0, Math.min(1, f)) * len);

  const end = at(toFraction);
  const place = (p) => { avatarEl.setAttribute('transform', `translate(${p.x} ${p.y})`); };

  if (REDUCED() || fromFraction === toFraction) {
    place(end);
    return Promise.resolve();
  }

  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const f = fromFraction + (toFraction - fromFraction) * (i / steps);
    const p = at(f);
    frames.push({ transform: `translate(${p.x}px, ${p.y}px)` });
  }
  // the group is positioned by transform, so the attribute is cleared
  // first or the two would compose and the avatar would double its
  // distance from the origin
  avatarEl.setAttribute('transform', 'translate(0 0)');
  const a = avatarEl.animate(frames, {
    duration: Math.min(2600, 700 + Math.abs(toFraction - fromFraction) * 4200),
    easing: 'ease-in-out',
    fill: 'forwards'
  });
  return a.finished.then(() => place(end)).catch(() => place(end));
}

/* The idle bob, once the traveller has arrived. CSS class rather than
   a WAAPI loop: an infinite animation held in JS keeps a timer alive
   for as long as the tab is open, and this one runs on every page. */
export function idle(avatarEl) {
  if (!REDUCED()) avatarEl.classList.add('is-idling');
}

/* Confetti, as DOM particles.

   Capped at 36. The number is not arbitrary: this runs on phones that
   are several years old, and a hundred absolutely-positioned nodes
   animating at once is where a cheap device starts dropping frames.
   Each particle animates transform and opacity only, and removes
   itself — nothing accumulates if a child earns two badges at once. */
export function confetti(host, { count = 36 } = {}) {
  if (REDUCED()) return Promise.resolve();
  const colours = ['c1', 'c2', 'c3', 'c4'];
  const frag = document.createDocumentFragment();
  const live = [];

  for (let i = 0; i < count; i++) {
    const bit = document.createElement('i');
    bit.className = `jm-confetti jm-confetti--${colours[i % colours.length]}`;
    bit.style.left = `${Math.random() * 100}%`;
    frag.appendChild(bit);

    const driftX = (Math.random() - 0.5) * 180;
    const spin = (Math.random() - 0.5) * 720;
    live.push(bit.animate(
      [
        { transform: 'translate3d(0,-10px,0) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${driftX}px, ${160 + Math.random() * 120}px, 0) rotate(${spin}deg)`,
          opacity: 0 }
      ],
      { duration: 1100 + Math.random() * 900, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'forwards' }
    ));
  }
  host.appendChild(frag);
  return Promise.all(live.map(a => a.finished.catch(() => {})))
    .then(() => { host.querySelectorAll('.jm-confetti').forEach(n => n.remove()); });
}

/* A badge popping in: scale from nothing with a quarter turn. */
export function popBadge(el) {
  if (REDUCED()) return Promise.resolve();
  const a = el.animate(
    [
      { transform: 'scale(.2) rotate(-90deg)', opacity: 0 },
      { transform: 'scale(1.18) rotate(8deg)', opacity: 1, offset: .7 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 }
    ],
    { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' }
  );
  return a.finished.catch(() => {});
}

/* Counts a number up. Used by the progress figure and the percentage.

   Writes textContent, which is not a layout-thrashing property on a
   fixed-width element — the panel reserves space with tabular figures
   so the digits changing cannot reflow anything around them. */
export function countUp(el, to, { duration = 900, suffix = '' } = {}) {
  if (REDUCED() || to === 0) { el.textContent = `${to}${suffix}`; return Promise.resolve(); }
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out, so it decelerates onto the real number
      el.textContent = `${Math.round(to * (1 - Math.pow(1 - t, 3)))}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
      else { el.textContent = `${to}${suffix}`; resolve(); }
    };
    requestAnimationFrame(tick);
  });
}

/* The progress bar. scaleX rather than width, so it composites. */
export function growBar(fillEl, fraction) {
  const to = Math.max(0, Math.min(1, fraction));
  fillEl.style.transformOrigin = 'left center';
  if (REDUCED()) { fillEl.style.transform = `scaleX(${to})`; return Promise.resolve(); }
  const a = fillEl.animate(
    [{ transform: 'scaleX(0)' }, { transform: `scaleX(${to})` }],
    { duration: 1000, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' }
  );
  return a.finished.catch(() => {});
}

export const reducedMotion = REDUCED;
