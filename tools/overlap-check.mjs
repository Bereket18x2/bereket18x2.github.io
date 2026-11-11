/* node tools/overlap-check.mjs   (from tools/, with the site served)

   Measures the journey map in a real browser and fails if anything
   overlaps a label, or if the page is clipped.

   WHY A BROWSER RATHER THAN A UNIT TEST. The bugs this exists for were
   all geometric and all invisible to the data: a flag drawn over a
   month title, a road curving through a card's edge, a station sitting
   in a label band. None of that is decidable from the numbers in
   journey.js — it only exists once the SVG has been laid out and
   scaled into whatever width the screen happens to be. So this drives
   headless Chrome, reads getBoundingClientRect off the live document,
   and compares rectangles.

   It is in tools/ rather than tests/ because it needs Chrome and a
   server, which the node suites deliberately do not. CLAUDE.md allows
   tools/ to be heavier for exactly this reason.

   Usage:
     python -m http.server 8123     # from the repo root
     node tools/overlap-check.mjs   # or: BASE=http://host:port node ...
*/

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8123';
const WIDTHS = (process.env.WIDTHS || '360,414,768,865,1024,1280,1920').split(',').map(Number);
const DEMOS = (process.env.DEMOS || '0,5,12,23,24').split(',').map(Number);

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'
].find(p => existsSync(p));
if (!CHROME) { console.error('Chrome not found'); process.exit(2); }

/* Runs in the page. Returns every measurement the checks below need.

   Rectangles are read AFTER animations are skipped — the runner forces
   prefers-reduced-motion, so the map is in its settled state and a
   rectangle is not a frame of a moving thing. */
const PROBE = `(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const box = (el, kind, name) => {
    const r = el.getBoundingClientRect();
    return { kind, name, x: r.x, y: r.y, w: r.width, h: r.height,
             right: r.right, bottom: r.bottom };
  };
  const out = { labels: [], stations: [], flags: [], traveller: [], bands: [], road: [], misc: [] };
  const svg = document.querySelector('.jm-svg');
  if (!svg) return { skipped: true };

  for (const el of document.querySelectorAll('.jm-band-label'))
    if (vis(el)) out.labels.push(box(el, 'label', 'month ' + el.dataset.month));
  for (const el of document.querySelectorAll('.jm-band'))
    if (vis(el)) out.bands.push(box(el, 'band', 'card ' + el.dataset.month));
  for (const el of document.querySelectorAll('.jm-station'))
    if (vis(el)) out.stations.push(box(el, 'station', 'week ' + el.dataset.week));
  for (const el of document.querySelectorAll('.jm-flag'))
    if (vis(el)) out.flags.push(box(el, 'flag', 'exam'));
  for (const el of document.querySelectorAll('.jm-traveller'))
    if (vis(el)) out.traveller.push(box(el, 'traveller', 'avatar'));
  for (const el of document.querySelectorAll('.jm-road'))
    if (vis(el)) out.road.push(box(el, 'road', el.getAttribute('class')));

  const de = document.documentElement;
  out.page = {
    clientWidth: de.clientWidth, scrollWidth: de.scrollWidth,
    clipped: de.scrollWidth > de.clientWidth + 1
  };
  /* The label band each card reserves. Nothing may enter it, so it is
     reported separately from the card as a whole. */
  out.reserved = [...document.querySelectorAll('.jm-band')].filter(vis).map(el => {
    const r = el.getBoundingClientRect();
    const svgBox = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scale = vb.width ? svgBox.width / vb.width : 1;
    const bandPx = Number(el.dataset.band || 0) * scale;
    return { kind: 'reserved', name: 'band ' + el.dataset.month,
             x: r.x, y: r.y, w: r.width, h: bandPx, right: r.right, bottom: r.y + bandPx };
  });
  return out;
})()`;

const overlaps = (a, b, tol = 0.5) =>
  a.x < b.right - tol && b.x < a.right - tol &&
  a.y < b.bottom - tol && b.y < a.bottom - tol;

function runChrome(url, width) {
  return new Promise((resolve) => {
    const dir = mkdtempSync(join(tmpdir(), 'ovl-'));
    const out = join(dir, 'out.json');
    const args = [
      '--headless=new', '--disable-gpu', '--no-sandbox',
      '--force-prefers-reduced-motion', '--force-device-scale-factor=1',
      `--window-size=${Math.max(width + 40, 560)},1400`, '--virtual-time-budget=9000',
      `--user-data-dir=${dir}`,
      `--dump-dom`, url
    ];
    const p = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let dom = '';
    p.stdout.on('data', (d) => { dom += d; });
    p.on('close', () => {
      try { rmSync(dir, { recursive: true, force: true }); } catch (e) { /* fine */ }
      resolve(dom);
    });
  });
}

/* Chrome's --dump-dom cannot run arbitrary JS and return a value, so
   the probe is injected into a tiny harness page that loads the map in
   an iframe, measures it, and writes the result into the DOM where
   --dump-dom can read it back. */
/* The iframe is given the target width EXPLICITLY rather than 100%.
   Chrome will not open a window narrower than about 500px, so a
   --window-size=360 run silently laid the page out at 500 and the
   narrow widths were never actually tested. Sizing the frame makes
   360 mean 360. */
const harness = (target, width) => `<!doctype html><meta charset="utf-8">
<style>body{margin:0}</style>
<iframe id="f" src="${target}" style="width:${width}px;height:1300px;border:0"></iframe>
<pre id="r">PENDING</pre>
<script>
const f = document.getElementById('f');
f.addEventListener('load', () => {
  setTimeout(() => {
    try {
      const w = f.contentWindow;
      const res = w.eval(${JSON.stringify(PROBE)});
      document.getElementById('r').textContent = 'RESULT:' + JSON.stringify(res);
    } catch (e) {
      document.getElementById('r').textContent = 'RESULT:' + JSON.stringify({ error: String(e) });
    }
  }, 2200);
});
<\/script>`;

import { writeFileSync, unlinkSync } from 'node:fs';

let failures = 0, checked = 0;
const rows = [];

for (const demo of DEMOS) {
  for (const width of WIDTHS) {
    // the harness must be same-origin with the page, so it is written
    // into the served tree and removed afterwards
    const name = `_ovl-${demo}-${width}.html`;
    writeFileSync(join('..', name), harness(`journey.html?demo=${demo}`, width));
    const dom = await runChrome(`${BASE}/${name}`, width);
    try { unlinkSync(join('..', name)); } catch (e) { /* fine */ }

    const m = dom.match(/RESULT:(\{[\s\S]*?\})<\/pre>/);
    if (!m) { console.log(`  ?? demo=${demo} w=${width}: no measurement`); failures++; continue; }
    let d;
    try { d = JSON.parse(m[1]); } catch (e) { console.log(`  ?? demo=${demo} w=${width}: bad json`); failures++; continue; }
    if (d.error) { console.log(`  !! demo=${demo} w=${width}: ${d.error}`); failures++; continue; }
    if (d.skipped) { failures++; rows.push([demo, width, 'demo map missing', 1]); continue; }

    const problems = [];
    const others = [...d.stations, ...d.flags, ...d.traveller];

    // 1. nothing may touch a month label
    for (const lab of d.labels)
      for (const o of others)
        if (overlaps(lab, o)) problems.push(`${lab.name} overlapped by ${o.name}`);

    // 2. nothing may enter a reserved band
    for (const band of d.reserved)
      for (const o of others)
        if (overlaps(band, o)) problems.push(`${band.name} entered by ${o.name}`);

    // 3. labels may not overlap each other
    for (let i = 0; i < d.labels.length; i++)
      for (let j = i + 1; j < d.labels.length; j++)
        if (overlaps(d.labels[i], d.labels[j]))
          problems.push(`${d.labels[i].name} overlaps ${d.labels[j].name}`);

    // 4. stations may not overlap each other
    for (let i = 0; i < d.stations.length; i++)
      for (let j = i + 1; j < d.stations.length; j++)
        if (overlaps(d.stations[i], d.stations[j]))
          problems.push(`${d.stations[i].name} overlaps ${d.stations[j].name}`);

    // 5. nothing clipped at the right edge
    if (d.page.clipped) problems.push(`page scrolls horizontally (${d.page.scrollWidth} > ${d.page.clientWidth})`);

    checked++;
    failures += problems.length;
    rows.push([demo, width, problems.length ? problems.join('; ') : 'clean', problems.length]);
  }
}

console.log('\n demo  width  result');
console.log(' ' + '-'.repeat(74));
for (const [demo, width, msg, n] of rows) {
  console.log(` ${String(demo).padEnd(5)} ${String(width).padEnd(6)} ${n ? 'FAIL ' : 'ok   '}${msg}`);
}
console.log(`\n${checked} combinations measured, ${failures} problems\n`);
process.exit(failures ? 1 : 0);
