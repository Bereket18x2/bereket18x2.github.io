/* node tests/coverage.test.mjs

   Acceptance 8 is the one that matters here: seeking to the end must
   NOT complete a lesson. That is provable without a browser, so it is
   proved here rather than eyeballed. */

import {
  bucketCount, bucketAt, markBucket, coverageOf, isComplete,
  shortfallMessage, BUCKET_SECONDS, REQUIRED_COVERAGE
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

console.log('\nconstants');
check('buckets are 5 seconds', BUCKET_SECONDS, 5);
check('threshold is 90%', REQUIRED_COVERAGE, 0.9);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
