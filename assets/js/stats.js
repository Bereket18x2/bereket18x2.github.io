/* ===========================================================
   stats.js — the numbers the dashboard shows about a student.

   Pure functions over a progress map, so they can be tested in node
   without a browser or a database. Timestamps arrive from Firestore as
   Timestamp objects and from a fresh local write as plain numbers, so
   everything goes through toDate().
   =========================================================== */

/* Firestore Timestamp | number | Date -> Date, or null if unusable. */
export function toDate(t) {
  if (!t) return null;
  if (t instanceof Date) return isNaN(t) ? null : t;
  if (typeof t === 'number') return new Date(t);
  if (typeof t.toDate === 'function') { try { return t.toDate(); } catch (e) { return null; } }
  if (typeof t.seconds === 'number') return new Date(t.seconds * 1000);
  return null;
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/* Consecutive days of study, counting back from today. Yesterday still
   counts as current — a streak should survive until the day is over,
   not break the moment the clock passes midnight.

   `now` is injectable so the tests are not time-of-day dependent. */
export function streakFrom(progress, now = new Date()) {
  const days = new Set();
  for (const entry of Object.values(progress || {})) {
    const d = toDate(entry.completedAt) || toDate(entry.at);
    if (d) days.add(dayKey(d));
  }
  if (!days.size) return 0;

  const cursor = new Date(now);
  // if nothing today, allow the streak to be anchored to yesterday
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* Average as a percentage across answered quizzes. Lessons with a
   watched video but no quiz yet are not counted — they would drag the
   average down for work the student has not been marked on. */
export function averageScore(progress) {
  const marked = Object.values(progress || {})
    .filter(p => typeof p.score === 'number' && typeof p.of === 'number' && p.of > 0);
  if (!marked.length) return 0;
  const total = marked.reduce((sum, p) => sum + (p.score / p.of), 0);
  return Math.round((total / marked.length) * 100);
}

/* A lesson counts as complete when its quiz has been answered. */
export function completedCount(progress, lessons) {
  return lessons.filter(l => progress?.[l.id]?.done).length;
}

export function coverageOfLesson(progress, lessonId) {
  const c = progress?.[lessonId]?.coverage;
  return typeof c === 'number' ? Math.round(c * 100) : null;
}

/* Ge'ez numerals, for lesson ordering and counts. Handles 1–99, which
   covers any realistic number of lessons. */
const GEEZ_ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'];
const GEEZ_TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺'];

export function toGeez(n) {
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1 || num > 99) return String(n);
  return GEEZ_TENS[Math.floor(num / 10)] + GEEZ_ONES[num % 10];
}
