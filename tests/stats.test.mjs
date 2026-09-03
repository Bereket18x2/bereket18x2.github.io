/* node tests/stats.test.mjs */

import { toDate, streakFrom, averageScore, completedCount, coverageOfLesson, toGeez }
  from '../assets/js/stats.js';

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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
