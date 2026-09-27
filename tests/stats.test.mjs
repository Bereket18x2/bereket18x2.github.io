/* node tests/stats.test.mjs */

import { toDate, streakFrom, averageScore, completedCount, coverageOfLesson, toGeez,
         percentOf }
  from '../assets/js/stats.js';
import { readFileSync } from 'node:fs';
import { braced } from './extract.mjs';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

const NOW = new Date(2026, 8, 3, 12, 0, 0);          // 3 Sep 2026, midday
const daysAgo = (n) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };
// mimics a Firestore Timestamp
const ts = (d) => ({ seconds: Math.floor(d.getTime() / 1000), toDate: () => d });

console.log('\ntoDate');
check('passes a Date through', toDate(new Date(2026, 0, 1)).getFullYear(), 2026);
check('accepts a number', toDate(NOW.getTime()).getTime(), NOW.getTime());
check('accepts a Firestore Timestamp', toDate(ts(NOW)).getTime(), NOW.getTime());
check('null for missing', toDate(null), null);
check('null for junk', toDate({}), null);

console.log('\nstreak');
check('no progress is no streak', streakFrom({}, NOW), 0);
check('today only is 1', streakFrom({ l1: { at: ts(daysAgo(0)) } }, NOW), 1);
check('yesterday only still counts', streakFrom({ l1: { at: ts(daysAgo(1)) } }, NOW), 1);
check('three consecutive days', streakFrom({
  a: { at: ts(daysAgo(0)) }, b: { at: ts(daysAgo(1)) }, c: { at: ts(daysAgo(2)) }
}, NOW), 3);
check('a gap ends the streak', streakFrom({
  a: { at: ts(daysAgo(0)) }, b: { at: ts(daysAgo(1)) }, c: { at: ts(daysAgo(4)) }
}, NOW), 2);
check('stale progress is no streak', streakFrom({ a: { at: ts(daysAgo(5)) } }, NOW), 0);
check('two lessons same day count once', streakFrom({
  a: { at: ts(daysAgo(0)) }, b: { at: ts(daysAgo(0)) }
}, NOW), 1);
check('completedAt is used when present', streakFrom({
  a: { completedAt: ts(daysAgo(0)) }
}, NOW), 1);

console.log('\naverage score');
check('no quizzes is 0', averageScore({}), 0);
check('3/3 is 100', averageScore({ a: { score: 3, of: 3 } }), 100);
// equal-length quizzes, so this reads the same under either definition
check('mixed rounds', averageScore({ a: { score: 3, of: 3 }, b: { score: 2, of: 3 } }), 83);
check('video-only entries are excluded', averageScore({
  a: { score: 3, of: 3 }, b: { videoCompleted: true, coverage: 0.95 }
}), 100);
check('of:0 is ignored', averageScore({ a: { score: 0, of: 0 } }), 0);

console.log('\ncompleted count / coverage');
const lessons = [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }];
check('counts done lessons', completedCount({ l1: { done: true }, l2: { done: true } }, lessons), 2);
check('watched-but-not-quizzed is not done',
  completedCount({ l1: { videoCompleted: true } }, lessons), 0);
check('empty progress', completedCount({}, lessons), 0);
check('coverage as percent', coverageOfLesson({ l1: { coverage: 0.93 } }, 'l1'), 93);
check('missing coverage is null', coverageOfLesson({ l1: {} }, 'l1'), null);
check('missing lesson is null', coverageOfLesson({}, 'l9'), null);

console.log("\nGe'ez numerals");
check('1', toGeez(1), '፩');
check('6', toGeez(6), '፮');
check('10', toGeez(10), '፲');
check('12', toGeez(12), '፲፪');
check('20', toGeez(20), '፳');
check('55', toGeez(55), '፶፭');
check('99', toGeez(99), '፺፱');
check('0 falls through', toGeez(0), '0');
check('100 falls through', toGeez(100), '100');

console.log('\nthe average is weighted, and the old mean is what must not come back');
/* One definition now, used by the family's dashboard and the teacher's
   roster alike: total marks over total marks available. They showed 75%
   and 58% for the same child while there were two. */
check('percentOf is the same arithmetic the aggregate does', percentOf(5, 6), 83);
check('percentOf refuses to divide by zero', percentOf(0, 0), 0);
check('and does not invent a figure from nothing', percentOf(null, null), 0);

/* THE FLIPPED ONE. 2/2 and 5/10: by marks it is 7/12 = 58%. The old
   per-lesson mean was (100 + 50) / 2 = 75%.

   The assertion is written against BOTH numbers on purpose — the one it
   must return and the one it must not. Reinstating the mean of ratios,
   by any route, fails here and the failure names the figure it came
   back as. */
const MIXED = { a: { score: 2, of: 2 }, b: { score: 5, of: 10 } };
const unweightedMean = (progress) => {
  const marked = Object.values(progress).filter(p => p.of > 0);
  return Math.round(marked.reduce((t, p) => t + p.score / p.of, 0) / marked.length * 100);
};
check('an unequal pair weighs the ten-mark quiz more', averageScore(MIXED), 58);
check('the per-lesson mean, which it must NOT be, is 75', unweightedMean(MIXED), 75);
check('and averageScore does not return it',
  averageScore(MIXED) === unweightedMean(MIXED), false);

/* The two definitions agree whenever quizzes are the same length, which
   is why the split went unnoticed until quiz lengths varied. Kept so
   that the equal-length case is still pinned. */
const SAME_LENGTH = { a: { score: 3, of: 3 }, b: { score: 2, of: 3 } };
check('with equal-length quizzes both definitions give the same answer',
  averageScore(SAME_LENGTH), unweightedMean(SAME_LENGTH));

// and the exclusions the old one had are still the exclusions
check('no marks is 0', averageScore({}), 0);
check('video-only entries are excluded',
  averageScore({ a: { score: 3, of: 3 }, b: { videoCompleted: true } }), 100);
check('of:0 is ignored', averageScore({ a: { score: 0, of: 0 } }), 0);

/* One definition means one call site shape: nothing may reintroduce a
   second average function under another name. */
{
  const src = readFileSync(new URL('../assets/js/stats.js', import.meta.url), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('stats.js exports exactly one average',
    (code.match(/export function \w*[Aa]verage\w*/g) || []).length, 1);
  check('and no weightedAverage survives beside it',
    /weightedAverage/.test(code), false);
}

/* The roster's two numbers come from Store.rosterStatsOf, which cannot
   be exercised here without Firestore. What CAN be checked is that the
   read pattern it replaced has not come back: allUsers() and
   myStudents() must not fetch a progress subcollection per student. */
console.log('\nthe roster does not read a progress subcollection per student');
{
  const store = readFileSync(new URL('../assets/js/store.js', import.meta.url), 'utf8');
  /* Comments stripped first. Both functions carry a note explaining why
     they no longer pull progress, and that note names progressOf() —
     so matching the raw source flags the explanation as if it were the
     bug. A test that fails on its own documentation teaches people to
     delete the documentation. */
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const fn of ['async allUsers()', 'async myStudents()']) {
    const body = code(braced(store, fn, `${fn} in store.js`));
    check(`${fn} does not call progressOf`, /progressOf\(/.test(body), false);
    check(`${fn} does not read a progress collection`,
      /'progress'/.test(body), false);
  }
  // and the aggregate path is actually what the roster uses
  const agg = code(braced(store, 'async rosterStatsOf(', 'rosterStatsOf in store.js'));
  check('rosterStatsOf aggregates rather than listing',
    /getAggregateFromServer/.test(agg) && !/getDocs\(/.test(agg), true);
  check('it counts completions server-side', /count\(\)/.test(agg), true);
  check('and sums marks rather than reading them', /sum\('score'\)/.test(agg), true);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
