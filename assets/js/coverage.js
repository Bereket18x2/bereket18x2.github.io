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
