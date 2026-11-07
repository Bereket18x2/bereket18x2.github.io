/* node tests/pricing.test.mjs

   The §2 pricing, asserted against the ONE place the figures live. If a
   parish edits PRICING in config.js, this file is what tells them
   whether anything else silently disagreed — the registration form, the
   terms table and the teacher's payment box all read the same constants,
   so a number that drifts here has drifted everywhere.

   Acceptance 1-4 live here. Acceptance 5 and 8-13 are enforced by the
   rules and asserted in tools/rules.test.mjs against the emulator. */

import {
  PRICING, priceFor, priceToAddSubjects, termMonthsFor, addMonths,
  REGION_IDS, COUNTRIES, countryByCode, approxLocal, FX, flagEmoji, searchCountries
} from '../assets/js/config.js';
import { subjectsFor } from '../assets/js/lessons.js';
import { readFileSync } from 'node:fs';
import { between } from './extract.mjs';
import { TRACKS, ROLES, isStaff, REGISTERABLE_ROLES, validateComment,
         COMMENT_MAX_CHARS, enrollableTracks, validateTrack, validateCountry }
  from '../assets/js/validators.js';

let pass = 0, fail = 0, skipped = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

/* A test that is correct but cannot pass yet, with the reason attached.
   `why` is printed every run so a skip has to keep justifying itself
   rather than quietly becoming permanent. */
const skip = (label, why) => {
  skipped++;
  console.log(`  skip  ${label}\n        ${why}`);
};

console.log('\nBible is $50/month, $135 prepaid — and the SAVING is the assertion');
check('monthly is $50', PRICING.bible.monthlyUSD, 50);
check('the course runs three months', PRICING.bible.termMonths, 3);
check('three months at the monthly rate is $150', PRICING.bible.termFullUSD, 150);
check('prepaid is $135', PRICING.bible.termPrepaidUSD, 135);

/* THE LOAD-BEARING ONE. The prepaid figure once stayed at $105 while the
   monthly price went $40 -> $50, and the term discount silently tripled
   from $15 to $45 — a 30% giveaway nobody decided on, which would have
   been found in the bank rather than here.

   Asserting the SAVING rather than the price is what makes that loud:
   change either number without the other and this fails immediately,
   naming the discount you did not mean to offer. Move it deliberately by
   editing the expected value, which is a decision someone has to write
   down. */
check('the prepaid saving is $15', PRICING.bible.termSavingUSD, 15);
check('which is 10% off the full term, not a third of it',
  Math.round(PRICING.bible.termSavingUSD / PRICING.bible.termFullUSD * 100), 10);
// and the saving must be DERIVED, or the page could advertise a discount
// the recorded payment does not actually give
check('the saving is the difference, not a typed-in number',
  PRICING.bible.termFullUSD - PRICING.bible.termPrepaidUSD, PRICING.bible.termSavingUSD);
check('priceFor bible monthly', priceFor('bible'), 50);
check('priceFor bible prepaid term', priceFor('bible', { prepaidTerm: true }), 135);

console.log('\nacceptance 2 + 3: Zema is flat, whatever is ticked');
check('zema is $40', PRICING.zema.flatUSD, 40);
check('priceFor zema', priceFor('zema'), 40);
check('there are seven zema subjects to tick', subjectsFor('zema').length, 7);

/* Acceptance 2: Zema registration opens with every subject ticked.

   These two were SKIPPED while the recordings did not exist, and they
   now run unmodified — which was the point of skipping them rather than
   deleting them. The branch stays: if Zema is ever closed again the
   assertions turn themselves off with a printed reason, instead of
   failing and tempting someone to delete them. */
if (TRACKS.zema.enrollable) {
  check('zema is enrollable, so the form can open with all seven ticked',
    TRACKS.zema.enrollable, true);
  check('and the form offers it', enrollableTracks().map(t => t.id).includes('zema'), true);
} else {
  skip('acceptance 2: zema registration opens with all subjects ticked',
    'TRACKS.zema.enrollable is false — the course is closed to new enrolment. ' +
    'Turns back on with the flag; the form and pricing are already built.');
  skip('acceptance 4 in situ: adding a subject after enrolment',
    'same reason — no Zema enrolment exists to add a subject to. The $10 ' +
    'arithmetic below is still asserted.');
  // what must stay true WHILE it is closed
  check('a closed zema is not offered', enrollableTracks().map(t => t.id), ['bible']);
  check('but zema is still a valid track for existing accounts',
    validateTrack('zema').ok, true);
}
// the whole justification for defaulting every box to ticked
check('one subject costs the same as seven',
  priceFor('zema', { prepaidTerm: false }), priceFor('zema', { prepaidTerm: true }));

console.log('\nacceptance 4: adding a subject afterwards is $10 each');
check('add-on is $10', PRICING.zema.addSubjectUSD, 10);
check('one subject', priceToAddSubjects(1), 10);
check('three subjects', priceToAddSubjects(3), 30);
check('none', priceToAddSubjects(0), 0);
check('nonsense is not free money', priceToAddSubjects(-4), 0);
check('unticking all seven then re-adding them costs more than the course',
  priceToAddSubjects(7) > PRICING.zema.flatUSD, true);

console.log('\nacceptance 6: a Zema student has nothing score-shaped');
check('zema has no scores', TRACKS.zema.hasScores, false);
check('zema has no quizzes', TRACKS.zema.hasQuizzes, false);
check('zema has no exams', TRACKS.zema.hasExams, false);
check('bible does have scores', TRACKS.bible.hasScores, true);

console.log('\nterm lengths, so paidUntil is derived rather than typed');
check('bible monthly buys one month', termMonthsFor('bible'), 1);
check('bible prepaid buys three', termMonthsFor('bible', { prepaidTerm: true }), 3);
check('zema buys the same three-month term', termMonthsFor('zema'), 3);
check('an unknown track buys nothing', termMonthsFor('nonsense'), 0);

console.log('\naddMonths');
check('plain case', addMonths(new Date('2026-09-08T12:00:00'), 3), '2026-12-08');
check('one month', addMonths(new Date('2026-09-08T12:00:00'), 1), '2026-10-08');
check('across a year', addMonths(new Date('2026-11-30T12:00:00'), 3), '2027-02-28');
// 31 Jan + 1 month must not roll into March
check('short month does not overflow', addMonths(new Date('2026-01-31T12:00:00'), 1), '2026-02-28');
check('zero months is today', addMonths(new Date('2026-09-08T12:00:00'), 0), '2026-09-08');

console.log('\nacceptance 10 + 13: roles');
check('five roles', Object.keys(ROLES).length, 5);
check('registration may open exactly two', REGISTERABLE_ROLES, ['student', 'pending_teacher']);
check('teacher is not registerable', REGISTERABLE_ROLES.includes('teacher'), false);
check('admin is not registerable', REGISTERABLE_ROLES.includes('admin'), false);
// staff is the capability every page asks before showing a child
check('a pending teacher is not staff', isStaff('pending_teacher'), false);
check('a rejected teacher is not staff', isStaff('rejected'), false);
check('a student is not staff', isStaff('student'), false);
check('a teacher is staff', isStaff('teacher'), true);
check('an admin is staff', isStaff('admin'), true);
// fails closed: an unrecognised role must not be treated as a teacher
check('an unknown role is not staff', isStaff('superuser'), false);
check('no role at all is not staff', isStaff(undefined), false);

console.log('\nwhere the family is: countries and regions');
check('six regions', REGION_IDS,
  ['ETHIOPIA', 'AFRICA', 'NORTH_AMERICA', 'EUROPE', 'ASIA', 'OTHER']);
check('every country sits in a real region',
  COUNTRIES.filter(c => !REGION_IDS.includes(c.region)).map(c => c.code), []);
check('country codes are unique',
  new Set(COUNTRIES.map(c => c.code)).size, COUNTRIES.length);
check('every code is ISO 3166-1 alpha-2 shaped',
  COUNTRIES.filter(c => !/^[A-Z]{2}$/.test(c.code)).map(c => c.code), []);
check('every country has an English name — what the combobox shows',
  COUNTRIES.filter(c => !c.en || !c.en.trim()).map(c => c.code), []);
/* `am` is optional now that the list is every country rather than the
   forty-odd that were translated by hand. The escape hatch is the one
   row that MUST carry Amharic, because "Another country" is a message to
   a parent rather than the name of a place. */
check('the escape hatch is named in Amharic', countryByCode('ZZ').am, 'ሌላ አገር');
check('a currency is three uppercase letters, or nothing at all',
  COUNTRIES.filter(c => c.currency !== null && !/^[A-Z]{3}$/.test(c.currency)).map(c => c.code), []);
/* Both directions. A currency typed wrong in COUNTRIES shows no local
   figure and nobody notices; a rate keyed to a currency no country uses
   is dead weight that looks maintained. */
check('every rate in the FX table belongs to a country on the list',
  Object.keys(FX.perUSD).filter(cur => !COUNTRIES.some(c => c.currency === cur)), []);
check('Ethiopia is its own region', countryByCode('ET').region, 'ETHIOPIA');
// a family whose country is not listed must still be able to register
check('there is an escape hatch', countryByCode('ZZ').region, 'OTHER');
check('and it claims no currency', countryByCode('ZZ').currency, null);
check('and it stays at the bottom of the unfiltered list',
  COUNTRIES[COUNTRIES.length - 1].code, 'ZZ');
check('an unknown code resolves to nothing, not a guess', countryByCode('QQ'), null);

/* ACCEPTANCE 3 for the combobox. THE LOAD-BEARING ONE for this list.

   A country whose region came back undefined would fall silently out of
   regional pricing — priceFor() would hand it the base price and nothing
   anywhere would say a mapping was missing. The list is 248 long and was
   generated, so "somebody will notice" is not a plan. */
check('EVERY country maps to one of the six regions, with none left over',
  COUNTRIES.filter(c => !REGION_IDS.includes(c.region)).length, 0);
check('and no region is empty, which would mean a bucket nobody is in',
  REGION_IDS.filter(r => !COUNTRIES.some(c => c.region === r)), []);
// the list is the whole world, not a shortlist that quietly shrank
check('it is the full ISO list rather than a handful', COUNTRIES.length > 240, true);

console.log('\nacceptance 4: flags come from the code, not from image files');
check('Ethiopia', flagEmoji('ET'), '\u{1F1EA}\u{1F1F9}');
check('the United States', flagEmoji('US'), '\u{1F1FA}\u{1F1F8}');
check('lowercase works too, since a code may arrive either way', flagEmoji('gb'), flagEmoji('GB'));
// ZZ is not a place, so it has no flag; the row shows its name alone
check('the escape hatch has no flag', flagEmoji('ZZ'), '');
check('nonsense gets nothing rather than a broken glyph', flagEmoji('QQQ'), '');
check('so does a missing code', flagEmoji(null), '');
check('every country produces a two-codepoint flag, or none',
  COUNTRIES.filter(c => c.code !== 'ZZ' && [...flagEmoji(c.code)].length !== 2).map(c => c.code), []);
// each half is a regional indicator, which is the whole trick
check('a flag is built from regional indicators only',
  [...flagEmoji('ET')].every(ch => ch.codePointAt(0) >= 0x1F1E6 && ch.codePointAt(0) <= 0x1F1FF), true);

console.log('\nacceptance 1: what a parent types finds what they meant');
check('"eth" puts Ethiopia first', searchCountries('eth')[0].code, 'ET');
check('"united" finds all three',
  searchCountries('united').map(c => c.code).sort(), ['AE', 'GB', 'US']);
check('"germ" finds Germany', searchCountries('germ').map(c => c.code), ['DE']);
// a prefix must outrank a substring, or the picker feels broken
check('"in" offers India before Argentina', searchCountries('in')[0].code, 'IN');
/* Accent folding, so a phone keyboard is enough. CLDR is correct and a
   parent is not wrong — both spellings have to work. */
check('"turkiye" finds Türkiye', searchCountries('turkiye').map(c => c.code), ['TR']);
check('"turkey" finds it too', searchCountries('turkey').map(c => c.code), ['TR']);
check('"cote" finds Côte d\u2019Ivoire', searchCountries('cote')[0].code, 'CI');
check('"ivory coast" finds it as well', searchCountries('ivory coast').map(c => c.code), ['CI']);
check('the code itself works', searchCountries('et')[0].code, 'ET');
check('case does not matter', searchCountries('ETHIOPIA')[0].code, 'ET');
check('an empty query shows everything', searchCountries('').length, COUNTRIES.length);
check('and so does whitespace', searchCountries('   ').length, COUNTRIES.length);
check('nothing matches nonsense, and it does not throw',
  searchCountries('zzzzqqq'), []);

/* The Firestore enrollment boundary must recognize the same 248 country
   mappings as the browser. A regional price cannot be based on a region
   invented by someone editing a network request. */
{
  const ruleText = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const { braced } = await import('./extract.mjs');
  const fn = braced(ruleText, 'function countryMatchesRegion', 'country/region rule');
  for (const region of REGION_IDS) {
    const row = fn.split('\n').find(line => line.includes("d.region == '" + region + "'"));
    const actual = row ? [...row.matchAll(/'([A-Z]{2})'/g)].map(m => m[1]) : [];
    const expected = COUNTRIES.filter(c => c.region === region).map(c => c.code);
    check('Firestore country mapping matches config for ' + region,
      actual, expected);
  }
}

/* ---- and the same assertions against the markup that actually ships ----

   The combobox is only worth having if the page really carries one.
   These read register.html as a file, the way tests/landing.test.mjs
   reads index.html, so a refactor that quietly reverts the control fails
   here rather than in front of a parent. */
console.log('\nacceptance 2, 4, 6, 7: the control register.html actually ships');
{
  const REG = readFileSync(new URL('../register.html', import.meta.url), 'utf8');
  /* From the combobox to the field's own message line, bounded by those
     two ids rather than by a count of characters either side. The
     previous version reached back a magic 900 characters and forward 60,
     which would have stopped covering the field the moment the markup
     grew — silently, with every assertion below still green. Same bug
     the questions-rules slice had. See tests/extract.mjs. */
  const field = between(REG, 'id="countryCombo"', 'id="countryMsg"',
                        'the country field in register.html');

  check('the field is a combobox', /role="combobox"/.test(field), true);
  check('with a listbox it controls', /role="listbox"/.test(field), true);
  check('and it says which one', /aria-controls="countryList"/.test(field), true);
  check('it announces whether it is open', /aria-expanded="false"/.test(field), true);
  check('and that the list is what completes it', /aria-autocomplete="list"/.test(field), true);
  // acceptance 7: nothing preselected, and the stored value starts empty
  check('the visible input carries no value', /id="country"[^>]*\svalue=/.test(field), false);
  check('and the stored code starts empty', /id="countryCode" value=""/.test(field), true);
  // the <select> it replaced must not still be lurking
  check('there is no country <select> left', /<select[^>]*id="country/.test(REG), false);
  check('nor the old filter box', /countryFilter/.test(REG), false);
  // acceptance 4, stated against the shipped page rather than the module
  check('no flag image file is referenced anywhere on the page',
    /flags?[-/][a-z]{2}\.(png|svg|gif|webp)|flagcdn|flagpedia/i.test(REG), false);
  // acceptance 6 + the Amharic requirement
  check('the empty-results message is in Amharic', REG.includes('አገር አልተገኘም'), true);
  check('and the escape hatch is reachable from the list', REG.includes("countryByCode(row.dataset.code)"), true);
  // acceptance 2: every key the spec names is handled
  for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab']) {
    check(`${key} is handled`, REG.includes(`'${key}'`), true);
  }
  /* The list scrolls, the page does not. `block: 'nearest'` is the line
     that keeps that promise — anything else drags the form out from
     under a thumb on a phone. */
  check("the highlight scrolls the list, not the page", REG.includes("block: 'nearest'"), true);
}

console.log('\ncountry validation');
check('a real country passes', validateCountry(countryByCode('US')).ok, true);
check('nothing chosen is refused', validateCountry(null).ok, false);
check('and says what to do', validateCountry(null).message.includes('አገር'), true);
check('a malformed code is refused', validateCountry({ code: 'usa', region: 'OTHER' }).ok, false);
check('a country with no region is refused', validateCountry({ code: 'US' }).ok, false);

console.log('\nregional pricing is an explicit table, never computed');
check('the table names every region',
  Object.keys(PRICING.byRegion).sort(), REGION_IDS.slice().sort());
// no variation is set today; the mechanism exists so setting it is data
check('no region overrides the base price yet',
  Object.values(PRICING.byRegion).filter(v => v !== null), []);
check('so every region pays the base', REGION_IDS.map(r => priceFor('bible', { region: r })),
  REGION_IDS.map(() => 50));
check('an unknown region falls back to the base, it does not guess',
  priceFor('bible', { region: 'ATLANTIS' }), 50);
check('and no region is consulted when none is given', priceFor('zema'), 40);

console.log('\nlocal figures are approximate, and never the charge');
check('the rate table is dated', /^\d{4}-\d{2}-\d{2}$/.test(FX.asOf), true);
check('USD returns nothing — there is nothing to approximate',
  approxLocal(50, 'USD'), null);
check('a currency we have no rate for returns nothing rather than a guess',
  approxLocal(50, 'XYZ'), null);
check('a missing currency returns nothing', approxLocal(50, null), null);
{
  const kes = approxLocal(50, 'KES');
  check('a known currency returns a whole number', Number.isInteger(kes.amount), true);
  check('it carries the rate date so a parent can judge its age', kes.asOf, FX.asOf);
  check('and names the currency', kes.currency, 'KES');
}
/* ETB is deliberately unset. The birr has moved a great deal since the
   2024 float, a figure entered from memory would be badly wrong, and a
   parent in Addis is exactly who would notice. Showing nothing is
   honest. Fill the rate in from a real source and this flips by itself —
   which is why the assertion names the reason, not just the null. */
check('ETB shows nothing rather than a number nobody verified',
  approxLocal(50, 'ETB'), null);
check('because no ETB rate is set at all', 'ETB' in FX.perUSD, false);
// every currency a listed country uses either has a rate or shows nothing;
// what must never happen is a rate of zero or a negative
check('no rate is zero or negative',
  Object.entries(FX.perUSD).filter(([, r]) => !(r > 0)).map(([c]) => c), []);

console.log('\nteacher comments are bounded');
check('empty is refused', validateComment('   ').ok, false);
check('a normal note is fine', validateComment('ጥሩ እየሠራ ነው።').ok, true);
check('at the limit is fine', validateComment('x'.repeat(COMMENT_MAX_CHARS)).ok, true);
check('over the limit is refused', validateComment('x'.repeat(COMMENT_MAX_CHARS + 1)).ok, false);
check('a non-string is refused', validateComment(null).ok, false);

console.log(`\n${pass} passed, ${fail} failed${skipped ? `, ${skipped} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
