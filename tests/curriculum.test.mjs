/* node tests/curriculum.test.mjs

   Acceptance 1 and 2 for the curriculum restructure. The one that matters
   most is that a Zema student can never be shown a score: that is asserted
   at the data level, not just the UI level, because data that does not
   exist cannot be rendered by mistake. */

import {
  SUBJECTS, LESSONS, subjectsFor, subjectById, lessonsForSubject, lessonsFor,
  trackOfLesson, outOfRangeLessons, isFree, FREE_PREVIEW_ID,
  LESSON_MIN_MINUTES, LESSON_MAX_MINUTES
} from '../assets/js/lessons.js';
import { TRACKS, hasScores, hasQuizzes, hasExams } from '../assets/js/validators.js';
import { isLessonComplete, completedCount, subjectProgress } from '../assets/js/stats.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

console.log('\nstructure — the curriculum itself');
/* Acceptance 1 and 2: these are the exact subjects, in this order, and
   nothing else. Asserted by NAME rather than by count, because a count
   passes just as happily when the wrong subject is in the list. */
check('the five Bible subjects, in order',
  subjectsFor('bible').map(s => s.am),
  ['አምስቱ አዕማደ ምስጢራት', 'ሥርዓተ ቤተ ክርስቲያን', 'የመጽሐፍ ቅዱስ ታሪክ',
   'የቤተ ክርስቲያን ታሪክ', 'ክርስቲያናዊ ሥነ ምግባር']);
check('the seven Zema subjects, in order',
  subjectsFor('zema').map(s => s.am),
  ['ውዳሴ ማርያም', 'መዝሙረ ዳዊት', 'አቋቋም', 'ጾመ ድጓ', 'ምዕራፍ', 'ቅዳሴ', 'ዝማሬ መዋሥዕት']);
check('twelve subjects and no others', SUBJECTS.length, 12);
// ወንጌለ ዮሐንስ was removed from the Zema track; it must not survive anywhere
check('ወንጌለ ዮሐንስ appears nowhere',
  SUBJECTS.some(s => s.am.includes('ወንጌለ ዮሐንስ') || s.id === 'wengele'), false);
check('each track numbers itself from ፩',
  [subjectsFor('bible')[0].num, subjectsFor('zema')[0].num], ['፩', '፩']);
check('the numerals run to ፭ and ፯',
  [subjectsFor('bible').at(-1).num, subjectsFor('zema').at(-1).num], ['፭', '፯']);
check('every lesson belongs to a real subject',
  LESSONS.every(l => !!subjectById(l.subject)), true);
check('every lesson resolves to a track',
  LESSONS.every(l => ['bible', 'zema'].includes(trackOfLesson(l))), true);
check('subject ids are unique',
  new Set(SUBJECTS.map(s => s.id)).size, SUBJECTS.length);
check('lesson ids are unique',
  new Set(LESSONS.map(l => l.id)).size, LESSONS.length);
check('every subject carries a badge title',
  SUBJECTS.every(s => typeof s.badge === 'string' && s.badge.length > 0), true);
/* The one-sentence Amharic descriptions are the parish's to write. The
   slot must EXIST on every subject so filling it stays a data edit, and
   the form renders nothing while it is empty. */
check('every subject has a description slot',
  SUBJECTS.every(s => typeof s.descAm === 'string'), true);
// every description is empty for now, and that is the shipped state
check('none has been written yet, so the form shows none',
  SUBJECTS.every(s => s.descAm === ''), true);
check('lessonsFor(bible) equals the union of its subjects',
  lessonsFor('bible').length,
  subjectsFor('bible').reduce((n, s) => n + lessonsForSubject(s.id).length, 0));

console.log('\nacceptance 1: a Zema student can never be shown a score');
check('no Zema lesson carries questions',
  lessonsFor('zema').filter(l => l.questions && l.questions.length).length, 0);
/* Stated as an invariant over whatever lessons exist, rather than as
   "some Bible lesson has questions" — the latter fails while the
   curriculum is empty and would have to be deleted rather than kept. */
check('no Zema lesson will ever carry questions, however many are added',
  lessonsFor('zema').every(l => !l.questions), true);
check('zema declares no scores', hasScores('zema'), false);
check('zema declares no quizzes', hasQuizzes('zema'), false);
check('zema declares no exams', hasExams('zema'), false);
check('bible declares all three',
  [hasScores('bible'), hasQuizzes('bible'), hasExams('bible')], [true, true, true]);
check('an unknown track fails closed',
  [hasScores('nope'), hasQuizzes('nope'), hasExams('nope')], [false, false, false]);

console.log('\ncompletion means different things per track');
// Bible: the quiz was answered. Zema: the video was genuinely watched.
check('bible lesson complete on done',
  isLessonComplete({ done: true, score: 2, of: 3 }, { scored: true }), true);
check('bible lesson NOT complete on video alone',
  isLessonComplete({ videoCompleted: true }, { scored: true }), false);
check('zema lesson complete on video',
  isLessonComplete({ videoCompleted: true }, { scored: false }), true);
check('zema lesson not complete without video',
  isLessonComplete({}, { scored: false }), false);
check('missing entry is never complete',
  isLessonComplete(undefined, { scored: false }), false);

console.log('\nsubject progress');
{
  const lessons = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const progress = { a: { done: true }, b: { done: true } };
  const sp = subjectProgress(progress, lessons, { scored: true });
  check('done count', sp.done, 2);
  check('total', sp.total, 3);
  check('not complete at 2 of 3', sp.complete, false);
  const all = subjectProgress({ a: { done: true }, b: { done: true }, c: { done: true } },
    lessons, { scored: true });
  check('complete at 3 of 3', all.complete, true);
  const empty = subjectProgress({}, [], { scored: true });
  check('an empty subject is not "complete"', empty.complete, false);
  check('an empty subject has ratio 0', empty.ratio, 0);
}

console.log('\nacceptance 2: duration sanity');
check('flags a 20-minute lesson',
  outOfRangeLessons([{ id: 'x', minutes: 20 }]).map(l => l.id), ['x']);
check('flags a 5-minute lesson',
  outOfRangeLessons([{ id: 'x', minutes: 5 }]).map(l => l.id), ['x']);
check('accepts 10, 11, 12',
  outOfRangeLessons([{ minutes: 10 }, { minutes: 11 }, { minutes: 12 }]).length, 0);
check('boundaries are inclusive',
  outOfRangeLessons([{ minutes: LESSON_MIN_MINUTES }, { minutes: LESSON_MAX_MINUTES }]).length, 0);
check('ignores a lesson with no declared minutes',
  outOfRangeLessons([{ id: 'x' }]).length, 0);

console.log('\nacceptance 2: the homepage advertises what we actually teach');
/* The homepage sold ወንጌለ ዮሐንስ in prose long after it was a subject, and
   nothing caught it — the curriculum data was right and the marketing
   copy was stale. These read the shipped HTML so the two cannot part
   company again without a test failing. */
{
  /* Comments stripped: what a parent reads is the markup, not the notes
     to the next developer, and the note beside this copy names the
     retired subject in order to explain why it was removed. */
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '');
  const unnamed = SUBJECTS.filter(s => !home.includes(s.am));
  check('every current subject is named on the homepage',
    unnamed.map(s => s.am), []);
  check('no retired subject is still advertised',
    /ወንጌለ ዮሐንስ|Wengele Yohannes/.test(home), false);
}

console.log('\nthe badge titles awaiting a መምህር are listed accurately');
/* docs/CHURCH-DECISIONS.md §5 prints every earned title so a መምህር can
   approve or replace the list. That table is what somebody signs off,
   so it has to be what actually ships — a title changed in the code but
   not in the document would be approved in one form and printed in
   another. Same drift class as the homepage above. */
{
  const doc = readFileSync(new URL('../docs/CHURCH-DECISIONS.md', import.meta.url), 'utf8');
  const absent = SUBJECTS.filter(s => !doc.includes(`| ${s.am} | ${s.badge} |`));
  check('every subject and its title appear in the decisions table',
    absent.map(s => `${s.am} / ${s.badge}`), []);
  check('and the table lists no more than the twelve that exist',
    (doc.match(/^\| [^|]*\| የ[^|]*\|$/gm) || []).length, SUBJECTS.length);
}

console.log('\nacceptance 3: subjects with no lessons stay a supported state');
/* Eleven of the twelve subjects have no lessons and must keep saying
   "ትምህርቶቹ በቅርቡ ይጀምራሉ።" rather than rendering an empty box. Written
   against whatever the curriculum currently holds, so it keeps meaning
   something as lessons are added one at a time — and only stops
   applying when every subject is populated, which is the day the
   handling could honestly be removed. */
{
  const populated = SUBJECTS.filter(s => lessonsForSubject(s.id).length > 0);
  const empty = SUBJECTS.filter(s => lessonsForSubject(s.id).length === 0);
  check('some subjects are still empty, so the coming-soon line is live',
    empty.length > 0, true);
  check('every subject is either populated or empty, none broken',
    populated.length + empty.length, SUBJECTS.length);
  check('an empty subject reports zero rather than throwing',
    empty.every(s => lessonsForSubject(s.id).length === 0), true);
  check('a track always returns a list, never undefined',
    [Array.isArray(lessonsFor('bible')), Array.isArray(lessonsFor('zema'))], [true, true]);
  // 0 of 0 must not read as "finished", or an empty subject would award
  // a certificate for nothing
  check('an empty subject is 0 of 0 and NOT complete',
    (() => { const sp = subjectProgress({}, lessonsForSubject(empty[0].id), { scored: true });
             return [sp.done, sp.total, sp.complete]; })(), [0, 0, false]);

  // the shipped state today, stated plainly so a change to it is visible
  check('exactly one subject has content so far', populated.length, 1);
  check('and it is አምስቱ አዕማደ ምስጢራት', populated[0].id, 'amestu');
  check('leaving eleven empty', empty.length, 11);
}

console.log('\nthe duration rule is NOT widened to fit a long video');
/* am1 runs 28 minutes, well outside 9-13, and warns at load. The rule
   exists to catch the next mistyped upload, so a real video that breaks
   it must not be an argument for relaxing it. */
{
  const flagged = outOfRangeLessons();
  check('the long lesson is flagged', flagged.map(l => l.id), ['am1']);
  check('the bounds are still 9 and 13',
    [LESSON_MIN_MINUTES, LESSON_MAX_MINUTES], [9, 13]);
  check('a compliant lesson would not be flagged',
    outOfRangeLessons([{ id: 'ok', minutes: 11 }]).length, 0);
}

console.log('\nthe draft lesson is marked as unreviewed');
/* The teacher name, summary and questions on am1 were not written by a
   መምህር. `draft: true` is how that is findable in the data rather than
   only in a comment. */
{
  const draft = LESSONS.filter(l => l.draft);
  check('am1 is flagged draft', draft.map(l => l.id), ['am1']);
  check('its teacher is a visible placeholder, not an invented name',
    /ይተካ/.test(LESSONS.find(l => l.id === 'am1').teacher), true);
}

console.log('\nfree preview is DERIVED, so it survives a curriculum rewrite');
/* terms.html promises parents the first lesson is free. A hardcoded id
   would have withdrawn that promise silently the moment the curriculum
   was replaced, while the terms went on advertising it. */
if (LESSONS.length === 0) {
  check('no lessons means no free preview, and nothing claims otherwise',
    FREE_PREVIEW_ID, null);
  check('isFree is false for everything, including undefined',
    [isFree('l1'), isFree(undefined), isFree(null)], [false, false, false]);
} else {
  check('the free lesson exists', !!LESSONS.find(l => l.id === FREE_PREVIEW_ID), true);
  check('it is the first lesson of the first Bible subject that has any',
    FREE_PREVIEW_ID, lessonsFor('bible')[0].id);
  check('it is free', isFree(FREE_PREVIEW_ID), true);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
