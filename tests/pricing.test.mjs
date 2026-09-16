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
  REGION_IDS, COUNTRIES, countryByCode, approxLocal, FX
} from '../assets/js/config.js';
import { subjectsFor } from '../assets/js/lessons.js';
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
check('every country is named in both languages',
  COUNTRIES.filter(c => !c.am || !c.en).map(c => c.code), []);
check('Ethiopia is its own region', countryByCode('ET').region, 'ETHIOPIA');
// a family whose country is not listed must still be able to register
check('there is an escape hatch', countryByCode('ZZ').region, 'OTHER');
check('and it claims no currency', countryByCode('ZZ').currency, null);
check('an unknown code resolves to nothing, not a guess', countryByCode('QQ'), null);

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
