/* Plain node, no dependencies, no build step:
     node tests/validators.test.mjs

   Covers acceptance items 1–5 from the enrollment spec. These are the
   rules that decide whether a child is allowed into a course, so they
   are worth being able to prove rather than eyeball. */

import {
  validateName, validateAge, validateTrack, validatePassword, validateEmail,
  validateEnrollableTrack, enrollableTracks, TRACKS,
  validateQuestion, validateAnswer, QUESTION_MAX_CHARS, ANSWER_MAX_CHARS,
  COMMENT_MAX_CHARS
} from '../assets/js/validators.js';
import { CONSENT_VERSION } from '../assets/js/config.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;

// structural comparison, so an array assertion does not silently fail on
// reference inequality the way === would
const check = (label, actual, expected) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
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

console.log('\nenrolment is gated separately from validity');
/* Both tracks are open: Zema's recordings now exist, so the flag that
   held it closed has been flipped. The gate itself still has to work in
   BOTH directions, or closing a course again is a change nobody has
   tested — hence the synthetic closed track below. */
accepts('zema is a VALID track', () => validateTrack('zema'));
accepts('zema is enrollable', () => validateEnrollableTrack('zema'));
accepts('bible is enrollable', () => validateEnrollableTrack('bible'));
refuses('unknown track is not enrollable', () => validateEnrollableTrack('history'));
check('both tracks are offered', enrollableTracks().map(t => t.id), ['bible', 'zema']);
check('both tracks exist', Object.keys(TRACKS), ['bible', 'zema']);
check('an adult zema student passes the age gate', validateAge(30, 'zema').ok, true);

/* Closing a course again must remain one edit away. */
TRACKS.shut = { ...TRACKS.zema, id: 'shut', enrollable: false };
refuses('a track with enrollable:false is refused', () => validateEnrollableTrack('shut'));
check('and says it opens later',
  validateEnrollableTrack('shut').message.includes('ገና አልተከፈተም'), true);
check('a closed track is left out of the offer',
  enrollableTracks().some(t => t.id === 'shut'), false);
delete TRACKS.shut;

console.log('\ntrack config sanity');
check('bible max is 13', TRACKS.bible.max, 13);
check('zema has no ceiling', TRACKS.zema.max, null);
check('both start at 7', TRACKS.bible.min === 7 && TRACKS.zema.min === 7, true);

console.log('\na question a child asks about their own understanding');
check('a real question passes', validateQuestion('ይህ ቃል ምን ማለት ነው?').ok, true);
check('empty is refused', validateQuestion('   ').ok, false);
check('a non-string is refused', validateQuestion(null).ok, false);
/* 300, not 1000. A comment is a teacher writing a record; a question is
   a couple of sentences, because an uncapped box stops being a question
   and becomes a file a child wrote about themselves. */
check('the cap is 300', QUESTION_MAX_CHARS, 300);
check('at the cap is fine', validateQuestion('x'.repeat(300)).ok, true);
check('over the cap is refused', validateQuestion('x'.repeat(301)).ok, false);
check('and it says to be brief rather than just refusing',
  validateQuestion('x'.repeat(301)).message.includes('በአጭሩ'), true);
check('a question is shorter than a teacher note, deliberately',
  QUESTION_MAX_CHARS < COMMENT_MAX_CHARS, true);
// the cap is duplicated as a literal in firestore.rules, which cannot
// import this file — so assert the two agree rather than hoping
{
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  /* The block, bounded by the NEXT sibling match rather than by a
     character count — a fixed window silently stops covering the end of
     the block the moment somebody adds a comment to it, which is exactly
     how an assertion quietly stops asserting. */
  const from = rules.indexOf('match /questions/');
  const rest = rules.slice(from + 1);
  const next = rest.indexOf('\n      match /');
  const block = next === -1 ? rest : rest.slice(0, next);
  check('firestore.rules caps the question at the same number',
    block.includes(`text.size() <= ${QUESTION_MAX_CHARS}`), true);
  check('and caps the answer at the same number as a comment',
    block.includes(`answer.size() <= ${ANSWER_MAX_CHARS}`), true);
  // the split that makes the whole feature safe
  check('the rules forbid a student writing an answer at create',
    block.includes('request.resource.data.answer == null'), true);
  /* The name is the difference between being answered by a person and
     being answered by an institution, so the rules require it rather
     than leaving it to the client to remember. */
  check('an answer must carry the teacher\'s name',
    block.includes('request.resource.data.answeredByName.size() > 0'), true);
  check('and the student cannot write that name either',
    block.includes('request.resource.data.answeredByName == null'), true);
  check('and nobody deletes a question', /allow delete: if false;/.test(block), true);
}

console.log('\nan answer gets a teacher\'s room');
check('a real answer passes', validateAnswer('ምክንያቱም…').ok, true);
check('empty is refused', validateAnswer('').ok, false);
check('the cap matches a comment', ANSWER_MAX_CHARS, COMMENT_MAX_CHARS);
check('over the cap is refused', validateAnswer('x'.repeat(ANSWER_MAX_CHARS + 1)).ok, false);

/* ACCEPTANCE 7. privacy.html lists what is collected EXHAUSTIVELY, so a
   new field that is not described there makes the policy false — and
   CLAUDE.md says that is not permitted in either direction. These read
   the shipped page rather than trusting that somebody remembered. */
console.log('\nacceptance 7: the policy describes the feature, and the version moved');
{
  const privacy = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
  check('the policy mentions questions and answers', privacy.includes('ጥያቄዎችና የመምህሩ መልሶች'), true);
  check('it says the parent sees both halves', privacy.includes('ጥያቄውንም መልሱንም'), true);
  check('it says asking is not compulsory', privacy.includes('ግዴታ አይደለም'), true);
  check('it says the question cannot be edited once answered', privacy.includes('አይታረሙም'), true);
  check('it names who may read it', privacy.includes('የተመደበው መምህር ብቻ ነው'), true);
  check('and says the teacher who answers is named to the child',
    privacy.includes('የመምህሩ ስም'), true);
  // the version a parent agreed to has to move when the substance does
  check('CONSENT_VERSION is no longer the pre-questions text',
    CONSENT_VERSION !== '2026-09-15', true);
  check('and it is still a date, not a number',
    /^\d{4}-\d{2}-\d{2}$/.test(CONSENT_VERSION), true);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
