/* ===========================================================
   coverage.js — did the student actually watch the lesson?

   A timer answers "was this tab open for 20 minutes", which is not the
   same question. Seeking to the end of a video would satisfy a timer
   and satisfy an ENDED event, and teaches nobody anything.

   So instead the video is divided into fixed buckets and a bucket is
   marked only when playback is actually observed inside it. Skipping
   forward leaves a hole that cannot be filled without going back and
   watching that part. Coverage is the fraction of buckets seen.

   Pure functions, no DOM, no player — so the rule that decides whether
   a lesson counts can be tested without a browser.
   =========================================================== */

export const BUCKET_SECONDS = 5;
export const REQUIRED_COVERAGE = 0.9;

/* How many buckets a video of this length is divided into. */
export function bucketCount(duration) {
  const d = Number(duration);
  if (!isFinite(d) || d <= 0) return 0;
  return Math.ceil(d / BUCKET_SECONDS);
}

/* Which bucket a playback position falls in. */
export function bucketAt(currentTime) {
  const t = Number(currentTime);
  if (!isFinite(t) || t < 0) return null;
  return Math.floor(t / BUCKET_SECONDS);
}

/* Records one observation. `seen` is a Set the caller owns and reuses
   across the whole lesson. Returns the set so calls can be chained. */
export function markBucket(seen, currentTime, duration) {
  const total = bucketCount(duration);
  const idx = bucketAt(currentTime);
  if (total === 0 || idx === null) return seen;
  // The final partial bucket is still a real bucket; clamp into range so
  // a currentTime that briefly exceeds duration does not invent one.
  if (idx >= total) return seen;
  seen.add(idx);
  return seen;
}

export function coverageOf(seen, duration) {
  const total = bucketCount(duration);
  if (total === 0) return 0;
  return Math.min(1, seen.size / total);
}

export function isComplete(seen, duration, required = REQUIRED_COVERAGE) {
  return coverageOf(seen, duration) >= required;
}

/* ---------------- persisting coverage across sessions ----------------

   `seen` used to live only in memory, so 90% had to be reached in one
   unbroken sitting. At am1's 28 minutes that is ~25 minutes held in one
   go by a child who may be on a phone — and a reload started them at
   zero. The failure mode was not a cheat getting through, it was an
   honest student giving up.

   So the set is stored on the progress document and reloaded. The
   functions below are the whole of the rule, kept pure so the merge and
   the invalidation can be tested without a browser or a database.

   WHAT IS STORED (users/{uid}/progress/{lessonId}):
     seenBuckets    the indices themselves — a COUNT cannot be merged
                    across sessions without double-counting a stretch
                    that was watched twice
     bucketSeconds  what an index means
     videoSeconds   what the indices were measured against
     coverage       derived, so existing readers need no change

   The last two exist for one reason: bucket indices are relative to a
   duration. Re-upload the video at a different length and every stored
   index silently points somewhere else. Better to discard the record
   and make the student rewatch than to credit them for buckets of a
   video that no longer exists. */

/* A stored set is only worth anything if it was measured against the
   same video. Durations wobble by a fraction of a second between
   reports, so one bucket of tolerance; a real re-upload moves them by
   far more than that. */
export function sameVideoLength(storedSeconds, actualSeconds, tolerance = BUCKET_SECONDS) {
  const a = Number(storedSeconds), b = Number(actualSeconds);
  if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0) return false;
  return Math.abs(a - b) <= tolerance;
}

/* Set -> storable array. Sorted so two writes of the same coverage are
   byte-identical, which makes a diff in the console mean something. */
export function serializeSeen(seen) {
  return [...seen].filter(Number.isInteger).sort((a, b) => a - b);
}

/* Storable record -> Set, refusing anything that does not match the
   video in front of us. Fails CLOSED: every rejection path returns an
   empty set, so a corrupt or stale record costs a rewatch rather than
   granting coverage that was never earned.

   Out-of-range indices are dropped individually rather than voiding the
   whole record — a shortened video should keep the buckets that still
   exist. */
export function restoreSeen(record, duration, bucketSeconds = BUCKET_SECONDS) {
  const out = new Set();
  if (!record || !Array.isArray(record.seenBuckets)) return out;
  if (Number(record.bucketSeconds) !== bucketSeconds) return out;
  if (!sameVideoLength(record.videoSeconds, duration)) return out;

  const total = bucketCount(duration);
  for (const i of record.seenBuckets) {
    if (Number.isInteger(i) && i >= 0 && i < total) out.add(i);
  }
  return out;
}

/* The rules cap seenBuckets at this length, so the client must not try
   to write more. 2000 buckets is a 2h46m video at 5s each — far beyond
   anything this school will publish, and short enough that a student
   cannot use their own progress document as free storage. */
export const MAX_STORED_BUCKETS = 2000;

export function tooManyBuckets(duration) {
  return bucketCount(duration) > MAX_STORED_BUCKETS;
}

/* ---------------- session sanity ----------------

   Coverage says which parts of the video were observed. It cannot say how
   long the student was actually there. Someone who drags the scrubber
   bucket by bucket marks every bucket in under a minute — the known limit
   of this technique, documented in docs/PAYMENTS.md.

   Comparing wall-clock time against video length catches that case: high
   coverage earned in far less time than the video runs is not viewing.

   This FLAGS, it never blocks. The flag is written by the client, so a
   determined student simply omits it; it exists to catch carelessness and
   to give a teacher something to look at, not to enforce anything. A false
   positive costs a child an unfair suspicion, so the threshold is
   deliberately generous — half the video's length. */
export const SESSION_RATIO_FLOOR = 0.5;

export function isSuspicious(coverage, sessionSeconds, duration) {
  const d = Number(duration);
  const s = Number(sessionSeconds);
  if (!isFinite(d) || d <= 0) return false;
  if (!isFinite(s) || s < 0) return false;
  // only meaningful once they claim to have watched enough to complete
  if (Number(coverage) < REQUIRED_COVERAGE) return false;
  return s < d * SESSION_RATIO_FLOOR;
}

/* Amharic explanation of a shortfall, naming how much was actually
   watched — a bare refusal invites the student to just try again. */
export function shortfallMessage(seen, duration) {
  const pct = Math.round(coverageOf(seen, duration) * 100);
  const need = Math.round(REQUIRED_COVERAGE * 100);
  return `ትምህርቱ በሙሉ አልታየም። እስካሁን ${pct}% ብቻ ተመልክተዋል፤ ጥያቄዎቹ ለመክፈት ቢያንስ ${need}% ማየት ያስፈልጋል።`;
}
