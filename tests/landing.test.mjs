/* node tests/landing.test.mjs

   What the landing page CLAIMS, checked against what the site actually
   is. Every assertion here exists because the page once said something
   untrue and nothing caught it:

     - it listed lesson topics that had been deleted from the curriculum
     - it quoted $25 for a course that costs $40
     - it showed Visa/Mastercard/Amex logos for a payment method that
       does not exist and is blocked on the parish
     - it advertised an iOS and Android app nobody intends to build

   None of those was a bug in the code. They were true once, the code
   moved, and the marketing copy stayed where it was. So these read the
   SHIPPED HTML rather than any module.

   Comments are stripped before every check: the page now carries notes
   explaining what was removed and why, and those notes name the very
   strings being searched for. Matching them would be testing the
   documentation instead of the page. */

import { readFileSync } from 'node:fs';
import { SUBJECTS, subjectsFor } from '../assets/js/lessons.js';
import { PRICING } from '../assets/js/config.js';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

const RAW = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const HTML = RAW.replace(/<!--[\s\S]*?-->/g, '');
// markup only — the module script legitimately contains price templates
const MARKUP = HTML.replace(/<script[\s\S]*?<\/script>/g, '');

console.log('\nthe page does not promise what does not exist');
check('no App Store or Google Play section',
  /App Store|Google Play/i.test(HTML), false);
check('no card brand logos',
  /card-chip|VISA|Mastercard|Amex|American Express/i.test(HTML), false);
check('no blessing sign-off in the About section',
  /blessing|እግዚአብሔር ይባርክ|እግዚአብሔር ይስጥልኝ/.test(HTML), false);

console.log('\nno price is hardcoded in the markup');
/* Prices render from PRICING at runtime. A figure typed into the HTML
   is one that cannot follow config.js, which is how $25 outlived the
   price it named. */
const hardcoded = MARKUP.match(/\$\s?\d+/g) || [];
check('no dollar figure appears in the markup', hardcoded, []);
// and the real figures are reachable from the one place they live
check('PRICING still holds the numbers the page will render',
  [PRICING.bible.monthlyUSD, PRICING.bible.termPrepaidUSD, PRICING.zema.flatUSD],
  [40, 105, 30]);

console.log('\nthe curriculum it advertises is the curriculum that exists');
check('every current subject is named on the page',
  SUBJECTS.filter(s => !HTML.includes(s.am)).map(s => s.am), []);
/* The exact topics the old About paragraph sold after they were
   deleted. Named individually so a failure says which one came back. */
for (const [label, needle] of [
  ['ወንጌለ ዮሐንስ', /ወንጌለ ዮሐንስ|Wengele Yohannes/],
  ['ሃይማኖተ አበው', /ሃይማኖተ አበው|Faith of the Fathers/],
  ['ሥርዓተ ቅዳሴ as a lesson', /ሥርዓተ ቅዳሴ|Divine Liturgy/],
  ['ንስሐ', /ንስሐ|repentance/i],
  ['ቅዱሳን መላእክት', /ቅዱሳን መላእክት|holy angels/i]
]) {
  check(`the retired topic "${label}" is gone`, needle.test(HTML), false);
}

console.log('\nAmharic first, English through the toggle');
/* i18n.js defaults to 'am' and swaps textContent from data-am/data-en.
   An element carrying only data-en can never be shown in Amharic, which
   on an Amharic site is the wrong way round. */
const enOnly = [...MARKUP.matchAll(/<[a-z][^>]*\sdata-en="[^"]*"[^>]*>/gi)]
  .filter(m => !/\sdata-am="/.test(m[0]));
check('every bilingual element carries Amharic as well as English',
  enOnly.length, 0);
check('the page declares itself Amharic', /<html lang="am">/.test(RAW), true);
check('a language toggle exists to reach English',
  /class="lang-toggle"/.test(MARKUP), true);

console.log('\ngetting started is not a dead end');
check('the call to action reaches registration',
  /href="register\.html"/.test(MARKUP), true);
/* A parent who clicks through must already know how payment works,
   because there is no card flow waiting for them on the other side. */
check('payment is explained as going through the church',
  /ክፍያ በቤተ ክርስቲያኑ በኩል ይፈጸማል/.test(MARKUP), true);
check('and that registering asks for no payment',
  /መመዝገብ ወዲያውኑ ክፍያ አይጠይቅም/.test(MARKUP), true);

console.log('\nthe rendered sections have somewhere to render into');
// the markup holds the hooks; lessons.js and config.js hold the content
for (const id of ['homeSubjects', 'homeBiblePrice', 'homeZemaPrice', 'certPreview']) {
  check(`#${id} exists`, new RegExp(`id="${id}"`).test(MARKUP), true);
}
check('both tracks will render', [subjectsFor('bible').length, subjectsFor('zema').length], [5, 7]);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
