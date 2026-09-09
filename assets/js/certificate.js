/* ===========================================================
   certificate.js — what a child earned, as a file they keep.

   A certificate is produced per SUBJECT, because a subject is the unit
   a badge is named for and an exam covers. It is built as a standalone
   SVG string: no build step, no library, and a file that opens in any
   browser and prints on any printer.

   WHY THIS EXISTS AT ALL: access ends at paidUntil, and that is not a
   lockout. A family whose term has finished — or who cannot afford the
   next one — keeps everything their child earned. Losing your
   certificates because your parents ran out of money is the wrong lesson
   from a church school, so nothing here consults `paid`, `paidUntil` or
   `accessActive`. It takes a name, a subject and a date, and that is
   deliberately all it can see.

   ON THE HARDCODED COLOURS: CLAUDE.md says design tokens only, and this
   is the one place that cannot obey it. A downloaded .svg is opened
   outside the site with no stylesheet and no :root to inherit from, so a
   var(--accent) would render as nothing at all. The palette is
   duplicated here, once, with the token it mirrors named beside it — so
   a change to style.css has exactly one other place to visit.

   Nothing is imported here on purpose. The caller passes the subject it
   already has, which keeps this a pure function of its arguments and
   therefore testable in node without a browser, a database or a
   resolvable import map.
   =========================================================== */

/* Mirrors :root in assets/css/style.css — keep in step. */
const INK = {
  ground:  '#111726',   // --bg
  panel:   '#19202F',   // --surface
  line:    '#2C3648',   // --line
  text:    '#EFE3C8',   // --text
  dim:     '#A99E88',   // --text-dim
  gold:    '#E8A73C',   // --accent
  crimson: '#B22F30'    // --danger
};

const SCHOOL_AM = 'ፍኖተ ያሬድ';

/* XML escaping. A student's name is text a parent typed, and it lands
   inside markup — the same care the dashboard takes with a teacher's
   note. An unescaped ampersand alone makes the file refuse to open. */
const x = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/* The harag interlace band, drawn rather than referenced, so the file
   carries its own ornament. It means something — it is not decoration —
   which is why a certificate that dropped it would be the wrong object. */
function harag(y, width) {
  const runs = [];
  for (let cx = 0; cx < width; cx += 40) {
    runs.push(
      `<path d="M${cx} ${y + 13}C${cx + 6} ${y + 2} ${cx + 14} ${y + 2} ${cx + 20} ${y + 13}` +
      `S${cx + 34} ${y + 24} ${cx + 40} ${y + 13}" stroke="${INK.gold}"/>`,
      `<path d="M${cx} ${y + 13}C${cx + 6} ${y + 24} ${cx + 14} ${y + 24} ${cx + 20} ${y + 13}` +
      `S${cx + 34} ${y + 2} ${cx + 40} ${y + 13}" stroke="${INK.crimson}"/>`
    );
  }
  return `<g fill="none" stroke-width="2" stroke-linecap="round">${runs.join('')}</g>`;
}

/* Ge'ez numerals carry meaning here too, so the lesson count is set in
   them where it fits. Falls back to Arabic digits above 99. */
const ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'];
const TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺'];
const geez = (n) => (Number.isInteger(n) && n > 0 && n < 100)
  ? TENS[Math.floor(n / 10)] + ONES[n % 10] : String(n);

/* `date` is passed in rather than read from the clock, so the same
   inputs always produce the same file — which is what makes this
   testable without freezing time. */
export function certificateSVG({ studentName, subject, lessonCount = 0, date = new Date() }) {
  const subjectName = (subject && subject.am) || String(subject || '');
  const badge = subject && subject.badge;
  const W = 1000, H = 700;
  const when = date instanceof Date ? date : new Date(date);
  const stamp = isNaN(when) ? '' : when.toISOString().slice(0, 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="የምስክር ወረቀት">
<title>${x(studentName)} — ${x(subjectName)}</title>
<defs>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0B1020"/>
    <stop offset="100%" stop-color="${INK.ground}"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#ground)"/>
<rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="${INK.panel}" stroke="${INK.line}" stroke-width="2" rx="10"/>
<rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="none" stroke="${INK.gold}" stroke-width="1" rx="6" opacity="0.55"/>

<g transform="translate(80 96)">${harag(0, W - 160)}</g>

<g font-family="'Noto Serif Ethiopic','Noto Sans Ethiopic',serif" text-anchor="middle">
  <text x="${W / 2}" y="190" fill="${INK.gold}" font-size="26" letter-spacing="6">${x(SCHOOL_AM)}</text>
  <text x="${W / 2}" y="252" fill="${INK.text}" font-size="46" font-weight="700">የምስክር ወረቀት</text>

  <text x="${W / 2}" y="322" fill="${INK.dim}" font-size="21">ይህ የምስክር ወረቀት የተሰጠው ለ</text>
  <text x="${W / 2}" y="386" fill="${INK.text}" font-size="42" font-weight="700">${x(studentName)}</text>

  <text x="${W / 2}" y="446" fill="${INK.dim}" font-size="21">የሚከተለውን ትምህርት በሚገባ ስላጠናቀቀ ነው</text>
  <text x="${W / 2}" y="502" fill="${INK.gold}" font-size="34" font-weight="700">${x(subjectName)}</text>
  ${badge
    ? `<text x="${W / 2}" y="542" fill="${INK.text}" font-size="22">«${x(badge)}»</text>` : ''}
  ${lessonCount
    ? `<text x="${W / 2}" y="580" fill="${INK.dim}" font-size="18">${x(geez(lessonCount))} ትምህርቶች</text>` : ''}
</g>

<g transform="translate(80 ${H - 128})">${harag(0, W - 160)}</g>

<g font-family="'Noto Sans Ethiopic',sans-serif" fill="${INK.dim}" font-size="16">
  <text x="80" y="${H - 62}">ቀን፦ ${x(stamp)}</text>
  <text x="${W - 80}" y="${H - 62}" text-anchor="end">${x(SCHOOL_AM)}</text>
</g>
</svg>`;
}

/* A filename a parent can find again in six months. */
export function certificateFilename(studentName, subjectId) {
  const slug = String(studentName || 'student').trim().replace(/\s+/g, '-').slice(0, 40);
  return `finote-yared-${slug}-${subjectId}.svg`;
}
