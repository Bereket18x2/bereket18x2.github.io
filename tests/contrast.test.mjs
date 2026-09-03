/* node tests/contrast.test.mjs

   Reads the real token values out of style.css and computes WCAG 2.1
   contrast ratios, so "both themes pass AA" is a measured claim rather
   than an assurance. Body text needs 4.5:1; large text (>=24px, or
   >=18.66px bold) needs 3:1. */

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/css/style.css', import.meta.url), 'utf8');

/* Pull one theme's token block out of the stylesheet. */
function tokens(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error('missing block: ' + selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const block = css.slice(open, close);
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const night = tokens(':root {');
const day = { ...night, ...tokens(':root[data-theme="day"]') };

const hex = (h) => {
  const s = h.replace('#', '').trim();
  const full = s.length === 3 ? [...s].map(c => c + c).join('') : s;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [l1, l2] = [luminance(hex(a)), luminance(hex(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

let pass = 0, fail = 0;
const need = (theme, label, fg, bg, min) => {
  const r = ratio(theme[fg], theme[bg]);
  const ok = r >= min;
  const line = `${r.toFixed(2)}:1  ${label} (${fg} on ${bg}, needs ${min})`;
  if (ok) { pass++; console.log(`  ok    ${line}`); }
  else { fail++; console.log(`  FAIL  ${line}`); }
};

for (const [name, t] of [['NIGHT', night], ['DAY', day]]) {
  console.log(`\n${name}`);
  // body text — the AA floor that matters most
  need(t, 'body text on page', '--text', '--bg', 4.5);
  need(t, 'body text on panel', '--text', '--surface', 4.5);
  need(t, 'body text on raised', '--text', '--surface-2', 4.5);
  need(t, 'muted text on page', '--text-dim', '--bg', 4.5);
  need(t, 'muted text on panel', '--text-dim', '--surface', 4.5);
  // links, eyebrows, Ge'ez numerals
  need(t, 'accent text on page', '--accent-text', '--bg', 4.5);
  need(t, 'accent text on panel', '--accent-text', '--surface', 4.5);
  // error and success messages
  need(t, 'error text on page', '--danger-text', '--bg', 4.5);
  need(t, 'error text on panel', '--danger-text', '--surface', 4.5);
  need(t, 'success text on panel', '--success-text', '--surface', 4.5);
  // text sitting on a filled gold button
  need(t, 'button label on gold', '--accent-ink', '--accent', 4.5);
  need(t, 'button label on gold hover', '--accent-ink', '--accent-hi', 4.5);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
