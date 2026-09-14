/* node tests/coverage.test.mjs

   Acceptance 8 is the one that matters here: seeking to the end must
   NOT complete a lesson. That is provable without a browser, so it is
   proved here rather than eyeballed. */

import {
  bucketCount, bucketAt, markBucket, coverageOf, isComplete,
  shortfallMessage, isSuspicious, BUCKET_SECONDS, REQUIRED_COVERAGE, SESSION_RATIO_FLOOR,
  sameVideoLength, serializeSeen, restoreSeen, tooManyBuckets, MAX_STORED_BUCKETS
} from '../assets/js/coverage.js';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

/* Simulates honest playback: one observation per second, as lesson.html
   polls getCurrentTime() while the player reports PLAYING. */
const watchFrom = (seen, from, to, duration) => {
  for (let t = from; t < to; t++) markBucket(seen, t, duration);
  return seen;
};

console.log('\nbucket maths');
check('600s splits into 120 buckets', bucketCount(600), 120);
check('602s rounds up to 121', bucketCount(602), 121);
check('zero duration has no buckets', bucketCount(0), 0);
check('NaN duration has no buckets', bucketCount(NaN), 0);
check('t=0 is bucket 0', bucketAt(0), 0);
check('t=4.9 is still bucket 0', bucketAt(4.9), 0);
check('t=5 is bucket 1', bucketAt(5), 1);
check('negative time is rejected', bucketAt(-1), null);

console.log('\nhonest viewing');
{
  const d = 600, seen = new Set();
  watchFrom(seen, 0, 600, d);
  check('watching all 600s covers 1.0', coverageOf(seen, d), 1);
  check('and completes', isComplete(seen, d), true);
}
{
  const d = 600, seen = new Set();
  watchFrom(seen, 0, 540, d);   // 90% exactly
  check('watching 90% completes', isComplete(seen, d), true);
}
{
  const d = 600, seen = new Set();
  watchFrom(seen, 0, 500, d);   // ~83%
  check('watching 83% does not complete', isComplete(seen, d), false);
}

console.log('\nacceptance 8: seeking cannot complete a lesson');
{
  const d = 600, seen = new Set();
  // press play, watch 2 seconds, drag the scrubber to the very end
  watchFrom(seen, 0, 2, d);
  markBucket(seen, 599, d);
  check('coverage after seek-to-end is tiny', coverageOf(seen, d) < 0.05, true);
  check('seek-to-end does NOT complete', isComplete(seen, d), false);
}
{
  const d = 600, seen = new Set();
  // a determined skipper: jump every 5s, landing once per bucket but
  // never actually playing through. Buckets are marked, so this DOES
  // reach coverage — documenting the known limit of the technique.
  for (let t = 0; t < 600; t += 5) markBucket(seen, t, d);
  check('deliberate bucket-by-bucket scrubbing does reach coverage', isComplete(seen, d), true);
}
{
  const d = 600, seen = new Set();
  // watching the first half then skipping the second
  watchFrom(seen, 0, 300, d);
  check('half-watched is 0.5', coverageOf(seen, d), 0.5);
  check('half-watched does not complete', isComplete(seen, d), false);
}

console.log('\nedge cases');
{
  const seen = new Set();
  check('no duration means no coverage', coverageOf(seen, 0), 0);
  check('empty set never completes', isComplete(new Set(), 600), false);
}
{
  const d = 12, seen = new Set();   // 3 buckets: 0-5, 5-10, 10-12
  check('short video bucket count', bucketCount(d), 3);
  watchFrom(seen, 0, 12, d);
  check('short video fully watched', coverageOf(seen, d), 1);
}
{
  const d = 600, seen = new Set();
  markBucket(seen, 700, d);   // past the end
  check('time beyond duration invents no bucket', seen.size, 0);
}
{
  const d = 600, seen = new Set();
  watchFrom(seen, 0, 100, d);
  watchFrom(seen, 0, 100, d);   // rewatching the same stretch
  check('rewatching does not double-count', coverageOf(seen, d), 100 / 600);
}

console.log('\nshortfall message');
{
  const d = 600, seen = new Set();
  watchFrom(seen, 0, 300, d);
  const msg = shortfallMessage(seen, d);
  check('states what was watched', msg.includes('50%'), true);
  check('states what is required', msg.includes('90%'), true);
}

console.log('\nsession sanity — high coverage earned too fast');
{
  const d = 600;
  // watched properly: 10 minutes of wall clock for a 10 minute video
  check('honest viewing is not suspicious', isSuspicious(1.0, 600, d), false);
  check('slightly rushed is not suspicious', isSuspicious(0.95, 420, d), false);
  // scrubbed every bucket in 40 seconds
  check('full coverage in 40s IS suspicious', isSuspicious(1.0, 40, d), true);
  check('exactly at the floor is not suspicious', isSuspicious(1.0, 300, d), false);
  check('just under the floor is suspicious', isSuspicious(1.0, 299, d), true);
  // incomplete viewing is not the flag's business — the quiz stays locked anyway
  check('low coverage is never flagged', isSuspicious(0.3, 5, d), false);
  check('unknown duration is never flagged', isSuspicious(1.0, 5, 0), false);
  check('negative session is never flagged', isSuspicious(1.0, -5, d), false);
  check('2x playback still banks wall clock, so not flagged',
    isSuspicious(1.0, 300, d), false);
}

console.log('\nconstants');
check('buckets are 5 seconds', BUCKET_SECONDS, 5);
check('threshold is 90%', REQUIRED_COVERAGE, 0.9);

console.log('\npersisting coverage: a lesson survives two sittings');
/* am1's real numbers, so these mean something concrete: 1685 seconds,
   337 buckets, 304 needed for 90%. */
const AM1 = 1685;
check('am1 is 337 buckets', bucketCount(AM1), 337);
check('90% of it is 304 buckets', Math.ceil(337 * REQUIRED_COVERAGE), 304);

{
  // first sitting: fifteen minutes, then the child closes the tab
  const first = new Set();
  for (let t = 0; t < 900; t += 1) markBucket(first, t, AM1);
  const stored = {
    seenBuckets: serializeSeen(first),
    bucketSeconds: BUCKET_SECONDS,
    videoSeconds: AM1
  };
  check('the first sitting alone does not complete', isComplete(first, AM1), false);
  check('it is stored sorted', stored.seenBuckets[0] < stored.seenBuckets[1], true);

  // second sitting: reopened, seeded, watched to the end
  const second = restoreSeen(stored, AM1);
  check('the second sitting starts where the first stopped', second.size, first.size);
  for (let t = 900; t < AM1; t += 1) markBucket(second, t, AM1);
  check('and NOW it completes', isComplete(second, AM1), true);
  // the whole point: without persistence the second sitting alone falls short
  const withoutPersistence = new Set();
  for (let t = 900; t < AM1; t += 1) markBucket(withoutPersistence, t, AM1);
  check('whereas the second sitting on its own would not',
    isComplete(withoutPersistence, AM1), false);
}

console.log('\na stored set is refused unless it matches THIS video');
/* Bucket indices are relative to a duration. A re-upload at a different
   length makes every stored index point somewhere else, so the record is
   discarded rather than silently mismapped. Every rejection returns an
   empty set — it fails closed, costing a rewatch, never granting
   coverage that was not earned. */
const good = { seenBuckets: [0, 1, 2], bucketSeconds: 5, videoSeconds: AM1 };
check('a matching record restores', restoreSeen(good, AM1).size, 3);
check('a video re-uploaded 3 minutes longer is refused',
  restoreSeen(good, AM1 + 180).size, 0);
check('a different bucket size is refused',
  restoreSeen({ ...good, bucketSeconds: 10 }, AM1).size, 0);
check('a missing record is empty, not a crash', restoreSeen(null, AM1).size, 0);
check('a record with no array is empty', restoreSeen({ videoSeconds: AM1 }, AM1).size, 0);
check('junk indices are dropped',
  restoreSeen({ ...good, seenBuckets: [0, 'x', -1, 1.5, null, 2] }, AM1).size, 2);
check('indices past the end of a SHORTENED video are dropped, the rest kept',
  restoreSeen({ seenBuckets: [0, 1, 5000], bucketSeconds: 5, videoSeconds: 100 }, 100).size, 2);
// a fraction of a second of wobble between reports is not a re-upload
check('a half-second difference still matches', sameVideoLength(AM1, AM1 + 0.5), true);
check('a five-second difference still matches', sameVideoLength(AM1, AM1 + 5), true);
check('a six-second difference does not', sameVideoLength(AM1, AM1 + 6), false);
check('zero or missing durations never match',
  [sameVideoLength(0, AM1), sameVideoLength(AM1, 0), sameVideoLength(undefined, AM1)],
  [false, false, false]);

console.log('\nthe stored array is capped, so a progress doc is not free storage');
check('the cap is 2000 buckets', MAX_STORED_BUCKETS, 2000);
check('am1 is comfortably under it', tooManyBuckets(AM1), false);
// 2000 buckets is 2h46m; the rules refuse a longer array, so the client
// must not offer one
check('a 3-hour video would exceed it', tooManyBuckets(3 * 60 * 60), true);
check('exactly at the cap is allowed', tooManyBuckets(MAX_STORED_BUCKETS * BUCKET_SECONDS), false);
check('one bucket over is not',
  tooManyBuckets(MAX_STORED_BUCKETS * BUCKET_SECONDS + 1), true);

console.log('\nserializing is stable, so an unchanged set writes identically');
{
  const a = new Set([5, 1, 3]);
  const b = new Set([3, 5, 1]);
  check('order does not matter', serializeSeen(a), serializeSeen(b));
  check('it sorts numerically, not as strings',
    serializeSeen(new Set([10, 9, 100])), [9, 10, 100]);
  check('an empty set is an empty array', serializeSeen(new Set()), []);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
