/* node tests/certificate.test.mjs

   Acceptance 7: an expired Bible student still sees and can download
   their certificates.

   The load-bearing assertion is the last group. certificateSVG takes a
   name, a subject and a date — it has no way to consult `paid`,
   `paidUntil` or `accessActive`, so a certificate CANNOT be withheld
   from a family whose term has ended. That is enforced by the shape of
   the function rather than by remembering not to add the check. */

import { certificateSVG, certificateFilename } from '../assets/js/certificate.js';
import { CERTIFICATE_SIGNATORIES } from '../assets/js/config.js';
import { SUBJECTS, subjectById, lessonsForSubject } from '../assets/js/lessons.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

const DAY = new Date('2026-09-08T12:00:00Z');
const amestu = subjectById('amestu');
const svg = certificateSVG({
  studentName: 'ሳራ ተስፋዬ', subject: amestu, lessonCount: 2, date: DAY
});

console.log('\nit is a real, standalone SVG');
check('starts as an svg element', svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), true);
check('closes', svg.trim().endsWith('</svg>'), true);
// shorter since the signature block was removed — see below
check('declares its size', /width="1000" height="750"/.test(svg), true);
// a downloaded file has no stylesheet, so a var() would render as nothing
check('carries no CSS custom properties', /var\(--/.test(svg), false);
check('carries no external reference', /https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg', '')), false);

console.log('\nit names the child, the subject and the badge');
check('the student', svg.includes('ሳራ ተስፋዬ'), true);
check('the subject', svg.includes(amestu.am), true);
check('the badge the subject awards', svg.includes(amestu.badge), true);
check('the school', svg.includes('ፍኖተ ያሬድ'), true);
check('the date it was earned', svg.includes('2026-09-08'), true);
check('the lesson count in Geez', svg.includes('፪'), true);
// the harag interlace carries meaning; a certificate without it is the
// wrong object, so its two stroke colours must both be present
check('the harag band is drawn', svg.includes('#E8A73C') && svg.includes('#B22F30'), true);

console.log('\nthere is no signature block, and no blank line where one was');
/* The names were placeholders because whose name goes on a document
   about a child is the parish's decision, not a developer's. But a ruled
   line with nothing on it reads as an unfinished document — worse for a
   family to receive than a certificate that simply does not carry a
   signature at all. So the block is absent until
   docs/CHURCH-DECISIONS.md §5 is answered, and these assert that nothing
   was left behind half-removed. */
check('no placeholder name survives anywhere',
  /TEACHER_NAME|PRIEST_NAME|PARISH_NAME/.test(svg), false);
check('no ruled line is left waiting for a signature',
  (svg.match(/<line /g) || []).length, 0);
check('and no orphaned role label', /የደብሩ አስተዳዳሪ/.test(svg), false);

/* The constants are parked in config.js so restoring the block is one
   change rather than a rediscovery. certificate.js must NOT import them:
   the file imports nothing by design, which is what keeps it testable in
   node without a resolvable import map. */
{
  const source = readFileSync(new URL('../assets/js/certificate.js', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('certificate.js holds no signatory constant of its own',
    /SIGNATORIES|TEACHER_NAME/.test(code), false);
  check('and still imports nothing at all',
    /\bimport\b|\brequire\(/.test(code), false);
}
check('the parked constants live in config.js instead',
  [CERTIFICATE_SIGNATORIES.teacher, CERTIFICATE_SIGNATORIES.priest,
   CERTIFICATE_SIGNATORIES.parish],
  ['TEACHER_NAME', 'PRIEST_NAME', 'PARISH_NAME']);

/* This line stays whatever else changes. terms.html §4 tells parents the
   service carries no accreditation from any diocese, and a certificate
   implying otherwise would make that statement false. */
check('the not-an-accreditation line is still present',
  svg.includes('የሀገረ ስብከት እውቅና አይደለም'), true);
check('and it still says what the document IS',
  svg.includes('የተሳትፎና የማጠናቀቅ ማረጋገጫ'), true);
check('the date survived the removal', svg.includes('2026-09-08'), true);

console.log('\nnames are escaped, because a name is text a parent typed');
const nasty = certificateSVG({
  studentName: '<script>alert(1)</script> & "co"', subject: amestu, date: DAY
});
check('no raw script tag survives', /<script>/.test(nasty), false);
check('the angle brackets are escaped', nasty.includes('&lt;script&gt;'), true);
check('the ampersand is escaped', nasty.includes('&amp;'), true);
check('the quotes are escaped', nasty.includes('&quot;'), true);

console.log('\nit degrades rather than breaking');
check('a missing badge just omits the line',
  certificateSVG({ studentName: 'A B', subject: { am: 'ትምህርት' }, date: DAY }).includes('«'), false);
check('a bare string subject still works',
  certificateSVG({ studentName: 'A B', subject: 'ዜማ', date: DAY }).includes('ዜማ'), true);
check('zero lessons omits the count line',
  /ትምህርቶች</.test(certificateSVG({ studentName: 'A B', subject: amestu, lessonCount: 0, date: DAY })), false);
check('an unusable date leaves the stamp empty rather than "Invalid Date"',
  certificateSVG({ studentName: 'A B', subject: amestu, date: 'nonsense' }).includes('Invalid'), false);

console.log('\nfilenames a parent can find again');
check('slug + subject', certificateFilename('ሳራ ተስፋዬ', 'amestu'), 'finote-yared-ሳራ-ተስፋዬ-amestu.svg');
check('spaces collapse', certificateFilename('A   B', 'sirate'), 'finote-yared-A-B-sirate.svg');
check('a missing name still produces a file', certificateFilename('', 'amestu'), 'finote-yared-student-amestu.svg');

console.log('\nacceptance 7: a finished term cannot withhold a certificate');
/* Every argument the function accepts. None of them is an access flag,
   so there is no input by which an expired account could be given a
   different result from a paid one. */
const forExpired = certificateSVG({
  studentName: 'ሳራ ተስፋዬ', subject: amestu, lessonCount: 2, date: DAY
});
check('an expired family gets a byte-identical certificate', forExpired, svg);
const src = (await import('node:fs')).readFileSync(
  new URL('../assets/js/certificate.js', import.meta.url), 'utf8');
// the comment block explains WHY; these assert the code kept the promise
const body = src.slice(src.indexOf('export function certificateSVG'));
check('the generator never reads paid', /\bpaid\b/.test(body), false);
check('the generator never reads paidUntil', /paidUntil/.test(body), false);
check('the generator never reads accessActive', /accessActive/.test(body), false);

console.log('\nevery subject can actually produce one');
for (const s of SUBJECTS) {
  const out = certificateSVG({
    studentName: 'ተማሪ ስም', subject: s, lessonCount: lessonsForSubject(s.id).length, date: DAY
  });
  check(`${s.id} renders`, out.includes(s.am) && out.trim().endsWith('</svg>'), true);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
