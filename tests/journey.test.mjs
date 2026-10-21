/* node tests/journey.test.mjs

   The 24-week road: its data, and the logic that decides where a child
   is standing on it.

   journey.js is deliberately free of DOM and of imports from lessons.js
   and stats.js, so all of it runs here. The one thing it DOES depend on
   is that its subject ids still resolve against SUBJECTS — CLAUDE.md
   says the curriculum lives in lessons.js and nowhere else, and the
   homepage once advertised a subject that had been removed. That is the
   assertion that keeps this file from quietly becoming a second
   curriculum. */

import {
  WEEKS, MONTHS, TOTAL_WEEKS, EXAM_WEEKS, HERO_TITLE, GENDER_KEY,
  monthOfWeek, weeksOfMonth, isExamWeek, examLabel,
  weekComplete, weeksCompleted, completedSet, currentWeek,
  badgesEarned, allComplete, celebrate, heroLine, imperative,
  demoWeeks, demoCompletedSet
} from '../assets/js/journey.js';
import { SUBJECTS, LESSONS } from '../assets/js/lessons.js';
import { readFileSync } from 'node:fs';
import { braced } from './extract.mjs';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

console.log('\nthe shape of the road');
check('twenty-four weeks', TOTAL_WEEKS, 24);
check('and the table has that many', WEEKS.length, 24);
check('numbered 1..24 in order', WEEKS.map(w => w.week), Array.from({ length: 24 }, (_, i) => i + 1));
check('six months', MONTHS.length, 6);
check('four weeks each', MONTHS.map(m => m.to - m.from + 1), [4, 4, 4, 4, 4, 4]);
check('covering every week with no gap and no overlap',
  MONTHS.flatMap(m => weeksOfMonth(m.n).map(w => w.week)),
  Array.from({ length: 24 }, (_, i) => i + 1));
check('every week belongs to exactly one month',
  WEEKS.filter(w => !monthOfWeek(w.week)).map(w => w.week), []);
check('week 1 is the first month', monthOfWeek(1).n, 1);
check('week 24 is the last', monthOfWeek(24).n, 6);
check('each month has an emoji and a name',
  MONTHS.filter(m => !m.emoji || !m.am).map(m => m.n), []);

console.log('\nthe two exams are gates, not steps');
check('exactly two', Object.keys(EXAM_WEEKS).map(Number), [12, 24]);
check('week 12 is one', isExamWeek(12), true);
check('week 24 is the other', isExamWeek(24), true);
check('week 11 is not', isExamWeek(11), false);
check('and each is named', [examLabel(12), examLabel(24)].filter(Boolean).length, 2);
// each exam closes its month, which is what makes it a gate
check('each exam falls at the end of a month',
  [12, 24].filter(w => monthOfWeek(w).to !== w), []);

/* THE LOAD-BEARING ONE. Every subject id in the week table must still
   name a real subject. Without this, journey.js becomes a second
   curriculum that drifts from lessons.js — the exact failure CLAUDE.md
   warns about. */
console.log('\nit references the curriculum rather than restating it');
const ids = new Set(SUBJECTS.map(s => s.id));
const strays = [...new Set(WEEKS.flatMap(w => Object.keys(w.topics)))].filter(k => !ids.has(k));
check('every topic key is a real subject id', strays, []);
check('every week carries all five Bible subjects',
  WEEKS.filter(w => Object.keys(w.topics).length !== 5).map(w => w.week), []);
// and the file does not name a subject in prose anywhere
{
  const src = readFileSync(new URL('../assets/js/journey.js', import.meta.url), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /* Scoped to the Bible track, which is the curriculum this road
     covers. The Zema subject ምዕራፍ ("chapter") would otherwise match
     inside month 3's theme name, ፩ኛ ምዕራፍ ፍጻሜ — that is the parish's
     own wording for a stage of the journey, not a restated subject,
     and a check that flags it teaches people to ignore this test. */
  check('no Bible subject name is hardcoded in the code',
    SUBJECTS.filter(s => s.track === 'bible' && code.includes(s.am)).map(s => s.id), []);
}
// every mapped lesson id must exist, or a week can never complete
const lessonIds = new Set(LESSONS.map(l => l.id));
check('every mapped lesson id exists in LESSONS',
  WEEKS.flatMap(w => w.lessons).filter(id => !lessonIds.has(id)), []);

console.log('\nwhen a week is finished');
const done = () => true, notDone = () => false;
check('a week with no lessons is never complete',
  weekComplete({ week: 2, lessons: [] }, {}, done), false);
check('a week whose lessons are all done is complete',
  weekComplete({ week: 1, lessons: ['a', 'b'] }, { a: {}, b: {} }, done), true);
check('one unfinished lesson is enough to hold it open',
  weekComplete({ week: 1, lessons: ['a', 'b'] }, { a: {} }, (e) => !!e), false);
check('a missing week object is not complete', weekComplete(null, {}, done), false);

console.log('\nthe road is walked in order');
/* A stray completion beyond a gap must not move the traveller past a
   station the child has not reached — the drawn road would cross a
   hole. The frontier is the unbroken run; completedSet still reports
   the truth per station. */
const two = [{ week: 1, lessons: ['a'] }, { week: 2, lessons: ['b'] }];
check('an unbroken run counts', weeksCompleted.call(null, { a: {}, b: {} }, done) >= 0, true);
check('nothing done is zero', weeksCompleted({}, notDone), 0);
check('current week with nothing done is 1', currentWeek(0), 1);
check('current week after 9 is 10', currentWeek(9), 10);
check('current week never runs past the end', currentWeek(24), 24);
check('and clamps beyond it', currentWeek(99), 24);

console.log('\nbadges follow completed months');
check('none at the start', badgesEarned(0), []);
check('none at week 3', badgesEarned(3), []);
check('the first at week 4', badgesEarned(4), [1]);
check('two by week 8', badgesEarned(8), [1, 2]);
check('three by the mid exam', badgesEarned(12), [1, 2, 3]);
check('all six at the end', badgesEarned(24), [1, 2, 3, 4, 5, 6]);
check('not complete at 23', allComplete(23), false);
check('complete at 24', allComplete(24), true);
check('the title exists', HERO_TITLE, 'ሙሉ መንፈሳዊ ጀግና');

console.log('\nAmharic imperatives are gendered, and the default is plural');
/* በርታ to a boy, በርቺ to a girl, በርቱ to someone whose gender we have
   not been told. Getting this wrong addresses a child as the wrong
   person every time they open the page. */
check('strong, to a boy', imperative('strong', 'boy'), 'በርታ');
check('strong, to a girl', imperative('strong', 'girl'), 'በርቺ');
check('strong, not yet told', imperative('strong', 'neutral'), 'በርቱ');
check('no form given falls back to the plural', imperative('strong'), 'በርቱ');
/* Fails polite, not wrong: a corrupted localStorage value must not
   address a girl as a boy. */
check('an unrecognised form falls back to the plural', imperative('strong', 'alien'), 'በርቱ');
check('an unknown phrase returns nothing rather than guessing', imperative('nope', 'boy'), '');
check('the three forms are genuinely different',
  new Set(['boy', 'girl', 'neutral'].map(f => imperative('strong', f))).size, 3);

console.log('\ncelebration praises the distance walked');
const lines = [0, 3, 9, 15, 24].map(n => celebrate(n, 'girl'));
check('a line for every stage', lines.filter(Boolean).length, 5);
check('all in Amharic', lines.filter(l => !/[\u1200-\u137F]/.test(l)), []);
/* Never counts down what is left. "only 15 weeks to go" makes a tired
   child feel further behind, not further along. */
check('none mentions what remains', lines.filter(l => /ቀረው|ይቀራል/.test(l)), []);
check('a girl is addressed as a girl', /በርቺ|ቀጥዪ/.test(celebrate(3, 'girl')), true);
check('a boy as a boy', /በርታ|ቀጥል/.test(celebrate(3, 'boy')), true);
check('and nobody is misgendered by default', /በርቱ|ቀጥሉ/.test(celebrate(3)), true);
check('the finish line is gendered too', /በርቺ/.test(heroLine('girl')), true);
check('the gender key is namespaced', GENDER_KEY.startsWith('fy-'), true);

/* ---- the Ethiopia countdown is GONE ----
   Removed at the parish's request. These assert it did not survive in
   a corner, because a half-removed feature is how a stale date gets
   shown to a family a year later. */
console.log('\nthe Ethiopia countdown is fully removed');
{
  const src = readFileSync(new URL('../assets/js/journey.js', import.meta.url), 'utf8');
  check('no trip constant', /ETHIOPIA_TRIP/.test(src), false);
  check('no countdown function', /weeksUntilTrip/.test(src), false);
  const page = readFileSync(new URL('../journey.html', import.meta.url), 'utf8');
  check('no countdown markup', /jmTrip|ወደ ኢትዮጵያ ጉዞ/.test(page), false);
  check('no aeroplane left behind', page.includes('✈'), false);
  const css = readFileSync(new URL('../assets/css/style.css', import.meta.url), 'utf8');
  check('no countdown styles', /jm-trip/.test(css), false);
  // and the old fixed encouragement line is gone with it
  check('the old encouragement line is gone', /ጥሩ ጅምር ነው/.test(page + src), false);
  check('and its function with it', /export function encouragement/.test(src), false);
}

console.log('\ndemo mode never reaches a child\'s record');
check('absent is null', demoWeeks(''), null);
check('?demo=0 is zero, not absent', demoWeeks('?demo=0'), 0);
check('?demo=9', demoWeeks('?demo=9'), 9);
check('?demo=24', demoWeeks('?demo=24'), 24);
check('out of range clamps rather than throws', demoWeeks('?demo=99'), 24);
check('negative clamps to zero', demoWeeks('?demo=-5'), 0);
check('nonsense is ignored', demoWeeks('?demo=abc'), null);
check('a fraction floors', demoWeeks('?demo=7.9'), 7);
check('the set it implies is the first N', [...demoCompletedSet(3)], [1, 2, 3]);
check('and zero implies none', [...demoCompletedSet(0)], []);
/* The guarantee that matters: demo is a rendering input only. If the
   page ever wrote it, a review session would corrupt a real record. */
{
  const page = readFileSync(new URL('../journey.html', import.meta.url), 'utf8');
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('journey.html never writes to Firestore at all',
    /(setDoc|updateDoc|addDoc|deleteDoc)\s*\(/.test(code), false);
  check('and reads progress only for the signed-in child',
    /progressOf\(u\.uid\)/.test(code), true);
  check('no other uid is ever read', /progressOf\((?!u\.uid)/.test(code), false);
}

console.log('\nthe video is one tap away, and Zema is left alone');
{
  const page = readFileSync(new URL('../journey.html', import.meta.url), 'utf8');
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /* The player, not the raw YouTube URL: lesson.html is what records
     watch time and coverage, and a direct link would lose that and
     hand out the unlisted address. */
  check('video buttons open the site player', /lesson\.html\?id=/.test(code), true);
  check('and never the raw YouTube address', /youtube\.com|youtu\.be/.test(code), false);
  check('a missing video says so instead of nothing',
    page.includes('ቪዲዮ በቅርቡ ይመጣል'), true);
  check('there is a continue button above the map',
    page.includes('ትምህርቱን ቀጥል') || /jmContinueSlot/.test(page), true);

  /* A Zema child sees no weeks, no percentage, no badges. */
  check('the Zema view exists', /jmZemaList/.test(page), true);
  check('and is chosen by track', /track === 'zema'/.test(code), true);
  check('it returns before any week logic', /\$\('jmZema'\)\.style\.display = 'block';\s*return;/.test(code), true);

  check('the gender choice is offered on the page', /data-gender="girl"/.test(page), true);
  check('and stored only on the device', /localStorage\.setItem\(GENDER_KEY/.test(code), true);
  check('no gender is ever written to Firestore',
    /(setDoc|updateDoc|addDoc)[^;]*gender/i.test(code), false);
}

console.log('\nthe map module stays pure geometry');
{
  const src = readFileSync(new URL('../assets/js/journey-map.js', import.meta.url), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('it never touches storage', /firebase|firestore|Store\./i.test(code), false);
  check('and never names a child', /studentName|guardianName|email/.test(code), false);
}
{
  const src = readFileSync(new URL('../assets/js/journey-anim.js', import.meta.url), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /* Reduced motion is honoured by SKIPPING, not shortening — a child
     who gets motion sick should not be shown a faster version. */
  check('every animator checks reduced motion',
    (code.match(/REDUCED\(\)/g) || []).length >= 5, true);
  check('confetti is capped', /count = 3\d/.test(code), true);
  const bar = braced(src, 'export function growBar', 'growBar');
  check('the bar animates transform, not width', /scaleX/.test(bar) && !/width:/.test(bar), true);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
