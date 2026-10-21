/* ===========================================================
   journey-map.js — the road, as geometry and SVG.

   ONE MONTH PER ROW. That is the whole design, and it is what fixes
   the three overlap problems the first version had.

   The first version used a 6-column grid. Months are 4 weeks, so a
   month never lined up with a row: month 1 held weeks 1-4 while the
   row held 1-6, which meant a month card ended in the middle of a row,
   the road crossed between cards sideways, and the turn at the row end
   swung through the next card's left edge and behind its label.

   24 = 4 x 6. With four columns, every month is exactly one row, so:
     - a month card is a row, and nothing crosses between cards
     - the road runs straight along a row and turns only at its end
     - the turn is a short U in a reserved gutter OUTSIDE the cards
     - each card reserves a band at the top that nothing may enter

   On a phone the same thing happens with two columns, and a month is
   then two rows — still one card, still a serpentine, still turning in
   the gutter.

   Everything here is pure geometry plus one render call. It touches no
   Firestore and knows nothing about a child.
   =========================================================== */

import { WEEKS, MONTHS, TOTAL_WEEKS, isExamWeek, examLabel, monthOfWeek } from '@journey';

const WEEKS_PER_MONTH = 4;

/* BAND is the label strip at the top of every card. FLAG_LANE sits
   under it and is the only place an exam pennant may rise into. The
   two together are the headroom reserved above every station, which
   is what keeps a flag off a month title at any width. */
const DESKTOP = {
  cols: 4, gapX: 190, gapY: 168, padX: 116, padY: 104,
  band: 30, flagLane: 36, cardPad: 34, turnOut: 60, r: 19, rExam: 26
};
const MOBILE = {
  cols: 2, gapX: 152, gapY: 118, padX: 96, padY: 92,
  band: 28, flagLane: 32, cardPad: 26, turnOut: 48, r: 17, rExam: 23
};

export const pickLayout = (width) => (width < 720 ? MOBILE : DESKTOP);

/* Station centres. Odd grid rows run backwards, which is what makes
   the path a serpentine rather than a carriage return. */
export function stationPoints(layout, total = TOTAL_WEEKS) {
  const pts = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / layout.cols);
    const inRow = i % layout.cols;
    const col = row % 2 === 0 ? inRow : layout.cols - 1 - inRow;
    pts.push({
      week: i + 1, row, col,
      x: layout.padX + col * layout.gapX,
      y: layout.padY + row * layout.gapY,
      // which side this row turns on, so a flag and a U-turn agree
      endSide: row % 2 === 0 ? 1 : -1
    });
  }
  return pts;
}

/* A month's card: the box around its stations, grown upward by the
   reserved band and flag lane. Returned separately from the stations
   so the overlap checker can assert the band stays empty. */
export function monthCards(layout, pts) {
  return MONTHS.map((m) => {
    const mine = pts.filter(p => p.week >= m.from && p.week <= m.to);
    if (!mine.length) return null;
    const xs = mine.map(p => p.x), ys = mine.map(p => p.y);
    const top = Math.min(...ys) - (layout.band + layout.flagLane + layout.r);
    return {
      month: m,
      x: Math.min(...xs) - layout.cardPad,
      y: top,
      width: (Math.max(...xs) - Math.min(...xs)) + layout.cardPad * 2,
      height: (Math.max(...ys) - top) + layout.cardPad + layout.r,
      // the strip the label lives in; nothing else may enter it
      band: { y: top, height: layout.band }
    };
  }).filter(Boolean);
}

export const canvasSize = (layout, pts) => ({
  width: layout.padX * 2 + (layout.cols - 1) * layout.gapX,
  height: layout.padY + (pts.length ? pts[pts.length - 1].y : 0) + layout.padY
});

/* The road: straight runs along each row, joined by a U-turn in the
   gutter at the row's end.

   Built explicitly rather than by fitting a curve through all 24
   points. A smooth spline through the whole set has no idea where the
   cards are, and its turns bulged inward across them — which was the
   bug. Here the only curve is the turn, and its control points are
   pushed `turnOut` into the gutter, which is outside every card by
   construction (turnOut > cardPad). */
export function roadPath(layout, pts) {
  if (pts.length < 2) return '';
  const rows = [];
  for (const p of pts) (rows[p.row] ||= []).push(p);

  let d = '';
  rows.forEach((row, i) => {
    const first = row[0], last = row[row.length - 1];
    d += (i === 0 ? `M${first.x} ${first.y}` : ` L${first.x} ${first.y}`);
    d += ` L${last.x} ${last.y}`;

    const next = rows[i + 1];
    if (!next) return;
    /* The U-turn. Both ends sit at the same x — the serpentine makes
       sure of it — so this is a vertical hop with its control points
       thrown sideways into the gutter. */
    const out = last.x + last.endSide * layout.turnOut;
    d += ` C${out} ${last.y} ${out} ${next[0].y} ${next[0].x} ${next[0].y}`;
  });
  return d;
}

const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/* The traveller, in two forms.

   Both are drawn from primitives — nobody's character, and no face, so
   a child of any background reads it as themselves. The girl's form
   differs by a skirt and longer hair; everything else, including the
   lantern and the walk, is identical, because the two should feel like
   the same journey rather than two different offers. */
export function traveller(form = 'neutral') {
  const g = svgEl('g', { class: 'jm-traveller', 'aria-hidden': 'true' });
  g.append(
    svgEl('line', { x1: 12, y1: -17, x2: 18, y2: -12, class: 'jm-lantern-arm' }),
    svgEl('circle', { cx: 19, cy: -7, r: 5, class: 'jm-lantern' })
  );
  if (form === 'girl') {
    g.append(
      // longer hair, behind the head
      svgEl('path', { d: 'M-8 -27 q-3 10 -1 15 M8 -27 q3 10 1 15', class: 'jm-hair' }),
      svgEl('circle', { cx: 0, cy: -27, r: 7.5, class: 'jm-head' }),
      svgEl('path', { d: 'M0 -20 L0 -9 M0 -16 L-9 -10 M0 -16 L9 -12', class: 'jm-body' }),
      // skirt, then legs below it
      svgEl('path', { d: 'M-8 2 L0 -9 L8 2 Z', class: 'jm-skirt' }),
      svgEl('path', { d: 'M-4 2 L-6 10 M4 2 L6 10', class: 'jm-body' })
    );
  } else {
    g.append(
      svgEl('circle', { cx: 0, cy: -27, r: 7.5, class: 'jm-head' }),
      svgEl('path', { d: 'M0 -20 L0 -5 M0 -16 L-9 -10 M0 -16 L9 -12 M0 -5 L-7 8 M0 -5 L7 8',
                      class: 'jm-body' })
    );
  }
  return g;
}

/* Renders the whole map into `host`.
   state = { completed:Set<number>, current:number, avatar:'boy'|'girl'|'neutral' }
   Returns the handles journey-anim.js and the page need. */
export function renderMap(host, state) {
  const layout = pickLayout(host.clientWidth || window.innerWidth);
  const pts = stationPoints(layout);
  const cards = monthCards(layout, pts);
  const { width, height } = canvasSize(layout, pts);
  const d = roadPath(layout, pts);

  host.textContent = '';
  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'jm-svg',
    role: 'group',
    'aria-label': `የ${TOTAL_WEEKS} ሳምንት የትምህርት ጉዞ ካርታ`
  });

  /* Month cards, drawn first. Each carries its emoji and its name in
     the reserved band, so the region is never identified by colour
     alone. */
  const gCards = svgEl('g', { class: 'jm-bands', 'aria-hidden': 'true' });
  for (const c of cards) {
    gCards.append(
      svgEl('rect', {
        x: c.x, y: c.y, width: c.width, height: c.height, rx: 24,
        class: `jm-band jm-band--${c.month.hue}`, 'data-month': c.month.n,
        // the reserved label strip, in user units, for tools/overlap-check.mjs
        'data-band': c.band.height
      }),
      Object.assign(svgEl('text', {
        x: c.x + 16, y: c.y + c.band.height - 9,
        class: 'jm-band-label', 'data-month': c.month.n
      }), { textContent: `${c.month.emoji} ${c.month.am}` })
    );
  }
  svg.appendChild(gCards);

  svg.appendChild(svgEl('path', { d, class: 'jm-road jm-road--base', 'aria-hidden': 'true' }));
  const walked = svgEl('path', { d, class: 'jm-road jm-road--walked', 'aria-hidden': 'true' });
  svg.appendChild(walked);

  const stationEls = new Map();
  const gStations = svgEl('g', { class: 'jm-stations' });
  for (const p of pts) {
    const done = state.completed.has(p.week);
    const isCurrent = p.week === state.current && !done;
    const exam = isExamWeek(p.week);
    const month = monthOfWeek(p.week);
    const status = done ? 'ተጠናቋል' : isCurrent ? 'አሁን ያሉበት' : 'ገና አልተከፈተም';
    const r = exam ? layout.rExam : layout.r;

    const g = svgEl('g', {
      class: 'jm-station' + (done ? ' is-done' : '') + (isCurrent ? ' is-current' : '') +
             (exam ? ' is-exam' : ''),
      transform: `translate(${p.x} ${p.y})`,
      role: 'button',
      tabindex: '0',
      'data-week': String(p.week),
      'aria-label': `ሳምንት ${p.week}${exam ? ' — ' + examLabel(p.week) : ''} — ${status}`
    });

    if (isCurrent) g.appendChild(svgEl('circle', { r: r + 9, class: 'jm-pulse' }));
    g.appendChild(svgEl('circle', { r, class: 'jm-disc' + (month ? ` jm-disc--${month.hue}` : '') }));

    /* The exam pennant, anchored to its own station and kept inside
       the flag lane — above the disc, beside it on the gutter side,
       and by construction below the label band. The pole is 12 tall
       and the lane is at least 32, so there is clearance even at the
       mobile scale. */
    if (exam) {
      const side = p.endSide;
      g.append(
        svgEl('path', { d: `M${side * (r - 3)} ${-r + 2} L${side * (r - 3)} ${-r - 12}`,
                        class: 'jm-flagpole' }),
        svgEl('path', {
          d: `M${side * (r - 3)} ${-r - 12} L${side * (r + 15)} ${-r - 7} ` +
             `L${side * (r - 3)} ${-r - 2} Z`,
          class: 'jm-flag'
        })
      );
    }

    if (done) {
      g.appendChild(svgEl('path', { d: 'M-6 1 L-2 6 L7 -5', class: 'jm-check' }));
      /* A four-point star OUTSIDE the disc, not a dot on its rim. The
         first version put a small gold circle on the edge of the
         circle, which read as a rendering artefact rather than as a
         mark of achievement. */
      const sx = -(r + 7), sy = -(r - 2);
      g.appendChild(svgEl('path', {
        d: `M${sx} ${sy - 5} L${sx + 1.6} ${sy - 1.6} L${sx + 5} ${sy} ` +
           `L${sx + 1.6} ${sy + 1.6} L${sx} ${sy + 5} L${sx - 1.6} ${sy + 1.6} ` +
           `L${sx - 5} ${sy} L${sx - 1.6} ${sy - 1.6} Z`,
        class: 'jm-star'
      }));
    } else if (isCurrent) {
      g.appendChild(Object.assign(svgEl('text', { class: 'jm-week-num', y: 6 }),
        { textContent: String(p.week) }));
    } else {
      g.append(
        svgEl('rect', { x: -6, y: -2, width: 12, height: 10, rx: 2, class: 'jm-lock' }),
        svgEl('path', { d: 'M-3.5 -2 V-5.5 a3.5 3.5 0 0 1 7 0 V-2', class: 'jm-shackle' })
      );
    }

    gStations.appendChild(g);
    stationEls.set(p.week, g);
  }
  svg.appendChild(gStations);

  const avatar = traveller(state.avatar);
  svg.appendChild(avatar);
  host.appendChild(svg);

  return { svg, walked, avatar, pts, cards, stationEls, layout, size: { width, height } };
}

export const pointOf = (pts, week) =>
  pts.find(p => p.week === week) || pts[0] || { x: 0, y: 0 };

/* Where a week sits along the road, as a fraction of total length.

   Measured on the real path rather than assumed from the station
   index: the rows are straight and the turns are curved, so segments
   are not equal length and index/23 would drift from the drawn road —
   leaving the traveller beside the line instead of on it. */
export function fractionOfWeek(pathEl, pts, week) {
  const total = pathEl.getTotalLength();
  if (!total) return 0;
  const target = pointOf(pts, week);
  // coarse scan then refine; 200 samples is plenty for a 24-point road
  let best = 0, bestD = Infinity;
  for (let i = 0; i <= 200; i++) {
    const l = (i / 200) * total;
    const p = pathEl.getPointAtLength(l);
    const dist = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
    if (dist < bestD) { bestD = dist; best = l; }
  }
  return best / total;
}
