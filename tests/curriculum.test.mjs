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

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

console.log('\nstructure');
check('five Bible subjects', subjectsFor('bible').length, 5);
check('five Zema subjects', subjectsFor('zema').length, 5);
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
check('lessonsFor(bible) equals the union of its subjects',
  lessonsFor('bible').length,
  subjectsFor('bible').reduce((n, s) => n + lessonsForSubject(s.id).length, 0));

console.log('\nacceptance 1: a Zema student can never be shown a score');
check('no Zema lesson carries questions',
  lessonsFor('zema').filter(l => l.questions && l.questions.length).length, 0);
check('Bible lessons do carry questions',
  lessonsFor('bible').filter(l => l.questions && l.questions.length).length > 0, true);
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

console.log('\nfree preview');
check('l1 is free', isFree(FREE_PREVIEW_ID), true);
check('another lesson is not', isFree('l2'), false);
check('the free lesson exists', !!LESSONS.find(l => l.id === FREE_PREVIEW_ID), true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
