/* Plain node, no dependencies, no build step:
     node tests/validators.test.mjs

   Covers acceptance items 1–5 from the enrollment spec. These are the
   rules that decide whether a child is allowed into a course, so they
   are worth being able to prove rather than eyeball. */

import {
  validateName, validateAge, validateTrack, validatePassword, validateEmail, TRACKS
} from '../assets/js/validators.js';

let pass = 0, fail = 0;

const check = (label, actual, expected) => {
  if (actual === expected) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${expected}, got ${actual}`); }
};

const accepts = (label, fn) => check(label, fn().ok, true);
const refuses = (label, fn) => check(label, fn().ok, false);

console.log('\nnames');
accepts('ሳራ ተስፋዬ (Amharic, two parts)', () => validateName('ሳራ ተስፋዬ'));
accepts('Bereket Elias', () => validateName('Bereket Elias'));
accepts('three parts', () => validateName('አበበ ከበደ ተስፋዬ'));
accepts('collapses double spaces', () => validateName('Sara   Tesfaye'));
accepts('hyphenated part', () => validateName('Mary-Jane Wilson'));
refuses('single word', () => validateName('Bereket'));
refuses('acceptance 5: xxxx', () => validateName('xxxx'));
refuses('xxxx xxxx', () => validateName('xxxx xxxx'));
refuses('asdf asdf', () => validateName('asdf asdf'));
refuses('test user', () => validateName('test user'));
refuses('--- ---', () => validateName('--- ---'));
refuses('one-letter part', () => validateName('A Wilson'));
refuses('digits only', () => validateName('123 456'));
refuses('empty', () => validateName('   '));
refuses('not a string', () => validateName(null));

console.log('\nage gates — bible (7–13 inclusive)');
accepts('acceptance 1: 13 + bible', () => validateAge(13, 'bible'));
accepts('7 + bible (lower bound)', () => validateAge(7, 'bible'));
accepts('10 + bible', () => validateAge(10, 'bible'));
refuses('acceptance 2: 14 + bible', () => validateAge(14, 'bible'));
refuses('acceptance 3: 6 + bible', () => validateAge(6, 'bible'));
refuses('30 + bible', () => validateAge(30, 'bible'));

console.log('\nage gates — zema (7+, no ceiling)');
accepts('acceptance 4: 30 + zema', () => validateAge(30, 'zema'));
accepts('7 + zema (lower bound)', () => validateAge(7, 'zema'));
accepts('99 + zema', () => validateAge(99, 'zema'));
refuses('acceptance 3: 6 + zema', () => validateAge(6, 'zema'));

console.log('\nage gates — malformed');
refuses('non-integer 10.5', () => validateAge(10.5, 'bible'));
refuses('empty string', () => validateAge('', 'bible'));
refuses('not a number', () => validateAge('ten', 'bible'));
refuses('unknown track', () => validateAge(10, 'chant'));
refuses('missing track', () => validateAge(10, undefined));

console.log('\nrefusal messages name the range');
check('bible refusal cites ፯ and ፲፫',
  /፯/.test(validateAge(14, 'bible').message) && /፲፫/.test(validateAge(14, 'bible').message), true);
check('bible refusal echoes the age given',
  validateAge(14, 'bible').message.includes('14'), true);
check('zema refusal cites ፯',
  /፯/.test(validateAge(6, 'zema').message), true);
check('no message is empty',
  [validateAge(14, 'bible'), validateAge(6, 'zema'), validateName('x')]
    .every(r => typeof r.message === 'string' && r.message.length > 5), true);

console.log('\ntrack / password / email');
accepts('bible track', () => validateTrack('bible'));
accepts('zema track', () => validateTrack('zema'));
refuses('unknown track', () => validateTrack('history'));
accepts('8-char password', () => validatePassword('12345678'));
refuses('7-char password', () => validatePassword('1234567'));
accepts('normal email', () => validateEmail('parent@example.org'));
refuses('no domain', () => validateEmail('parent@'));
refuses('no @', () => validateEmail('parent.example.org'));

console.log('\ntrack config sanity');
check('bible max is 13', TRACKS.bible.max, 13);
check('zema has no ceiling', TRACKS.zema.max, null);
check('both start at 7', TRACKS.bible.min === 7 && TRACKS.zema.min === 7, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
