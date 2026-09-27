/* node tests/stats.test.mjs */

import { toDate, streakFrom, averageScore, completedCount, coverageOfLesson, toGeez,
         percentOf, weightedAverage }
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

console.log('\nthe weighted average the teacher roster shows');
/* Total marks over total marks available — the only average a Firestore
   aggregate can produce, because sum()/sum() is computable server-side
   and a mean of per-lesson ratios is not. */
check('no marks is 0', weightedAverage({}), 0);
check('3/3 is 100', weightedAverage({ a: { score: 3, of: 3 } }), 100);
check('video-only entries are excluded, same as averageScore',
  weightedAverage({ a: { score: 3, of: 3 }, b: { videoCompleted: true } }), 100);
check('of:0 is ignored', weightedAverage({ a: { score: 0, of: 0 } }), 0);
check('percentOf is the same arithmetic the aggregate does',
  percentOf(5, 6), 83);
check('percentOf refuses to divide by zero', percentOf(0, 0), 0);
check('and does not invent a figure from nothing', percentOf(null, null), 0);

/* THE ONE THAT MATTERS. The two averages agree whenever quizzes are the
   same length, and diverge when they are not — which is the whole
   reason both exist rather than one. If a future change makes them
   identical, these say so out loud instead of leaving two functions
   where one would do. */
const SAME_LENGTH = { a: { score: 3, of: 3 }, b: { score: 2, of: 3 } };
check('with equal-length quizzes the two agree',
  weightedAverage(SAME_LENGTH), averageScore(SAME_LENGTH));

// 2/2 and 5/10: per-lesson mean is (100 + 50) / 2 = 75; by marks it is
// 7/12 = 58, because the ten-question quiz weighs five times the other
const MIXED = { a: { score: 2, of: 2 }, b: { score: 5, of: 10 } };
check('with unequal quizzes the per-lesson mean is 75', averageScore(MIXED), 75);
check('and the weighted one is 58', weightedAverage(MIXED), 58);
check('so they are genuinely different metrics, not a duplicate',
  weightedAverage(MIXED) === averageScore(MIXED), false);

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
