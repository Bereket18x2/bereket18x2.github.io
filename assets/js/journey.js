/* ===========================================================
   journey.js — the 24-week road, as data and pure logic.

   No DOM here. Everything in this file is a plain value or a pure
   function of its arguments, which is what makes it testable in node
   without a browser (tests/journey.test.mjs) and what keeps the map,
   the animation and the page from each growing their own idea of what
   "week 9 is finished" means.

   WHAT THIS IS NOT. It is not a second curriculum. `SUBJECTS` in
   lessons.js stays the only list of subjects, and nothing here restates
   it — each week REFERENCES subject ids, and tests/journey.test.mjs
   fails if any id stops resolving. CLAUDE.md's rule exists because the
   homepage once advertised a subject that had been removed.

   HOW A WEEK BECOMES COMPLETE. Each week names the lesson ids that
   belong to it. A week is complete when every one of them is complete
   by the SAME rule the dashboard uses (stats.js isLessonComplete), so a
   child cannot be finished here and unfinished there.

   Today every `lessons` array is empty, because LESSONS in lessons.js
   holds one draft lesson and nothing else. That is deliberate and it is
   honest: with no lessons mapped, no week completes, and a real student
   sees 0/24 rather than a number somebody invented. Fill the arrays as
   the curriculum is written and the map starts moving by itself.
   =========================================================== */

/* ---------------- the six months ----------------
   Theme, emoji and badge name per month. These came from the parish
   brief rather than from a developer; the per-SUBJECT badge titles in
   lessons.js are a different set and still await a መምህር's sign-off —
   see docs/CHURCH-DECISIONS.md §5. */
export const MONTHS = [
  { n: 1, emoji: '🌱', am: 'የመሠረት ወር',     from: 1,  to: 4,  hue: 'sprout' },
  { n: 2, emoji: '🔥', am: 'የጥልቀት ወር',     from: 5,  to: 8,  hue: 'ember' },
  { n: 3, emoji: '⭐', am: '፩ኛ ምዕራፍ ፍጻሜ',  from: 9,  to: 12, hue: 'star' },
  { n: 4, emoji: '📖', am: 'የታሪክ ወር',      from: 13, to: 16, hue: 'scroll' },
  { n: 5, emoji: '💎', am: 'የበጎ ምግባር ወር',   from: 17, to: 20, hue: 'gem' },
  { n: 6, emoji: '🏆', am: 'የድል ወር',        from: 21, to: 24, hue: 'crown' }
];

export const TOTAL_WEEKS = 24;

/* Weeks that are a gate rather than a step. Drawn larger, with a
   banner, and announced differently to a screen reader. */
export const EXAM_WEEKS = { 12: 'የመንፈቅ ፈተና', 24: 'የመጨረሻ ፈተና' };

/* The title for finishing all six. */
export const HERO_TITLE = 'ሙሉ መንፈሳዊ ጀግና';

/* ---------------- the 24 weeks ----------------

   EDIT THIS TABLE. One entry per week:

     week     1-24, and the array is in order
     topics   what each subject covers that week, keyed by SUBJECT ID
              from lessons.js. EMPTY ON PURPOSE — a developer writing
              120 topic titles for an Orthodox curriculum would be
              inventing the thing a መምህር is for, and the project has
              been bitten by exactly that before. An empty string falls
              back to the subject's own name in the UI, so the card
              reads sensibly until somebody fills it in.
     lessons  lesson ids from LESSONS that must ALL be complete for the
              week to count. Empty today; see the header note.

   The five subject ids are: amestu, sirate, meshaftarik, betekrtarik,
   sinemigbar. They are not repeated as names anywhere here. */
const blankTopics = () => ({
  amestu: '', sirate: '', meshaftarik: '', betekrtarik: '', sinemigbar: ''
});

export const WEEKS = Array.from({ length: TOTAL_WEEKS }, (_, i) => ({
  week: i + 1,
  topics: blankTopics(),
  lessons: []
}));

/* One real mapping, so the wiring is exercised by something rather than
   being entirely theoretical: the single draft lesson in lessons.js
   belongs to week 1. Delete or extend as the curriculum arrives. */
WEEKS[0].lessons = ['am1'];

/* ---------------- lookups ---------------- */

export const monthOfWeek = (week) =>
  MONTHS.find(m => week >= m.from && week <= m.to) || null;

export const weeksOfMonth = (monthNumber) => {
  const m = MONTHS.find(x => x.n === monthNumber);
  return m ? WEEKS.filter(w => w.week >= m.from && w.week <= m.to) : [];
};

export const isExamWeek = (week) => Object.hasOwn(EXAM_WEEKS, week);
export const examLabel = (week) => EXAM_WEEKS[week] || null;

/* ---------------- progress ----------------

   `isComplete` is injected rather than imported so this file stays
   free of stats.js and therefore free of any import-map concern — and
   so a caller cannot accidentally use a different completion rule than
   the dashboard does. journey.html passes the real one. */
export function weekComplete(weekEntry, progress, isComplete) {
  if (!weekEntry || !Array.isArray(weekEntry.lessons) || !weekEntry.lessons.length) return false;
  return weekEntry.lessons.every(id => isComplete(progress?.[id]));
}

/* How many weeks are finished, counted from the START and stopping at
   the first gap.

   A ROAD IS WALKED IN ORDER. If week 7 were somehow complete while
   week 6 was not, "7 weeks done" would put the traveller past a
   station the child has not reached, and the drawn road would cross a
   gap. Counting the unbroken run from week 1 is what keeps the picture
   and the data telling the same story. `completedSet` below still
   reports the truth per station, so a stray completion is drawn as
   complete even when it is beyond the frontier. */
export function weeksCompleted(progress, isComplete) {
  let n = 0;
  for (const w of WEEKS) {
    if (!weekComplete(w, progress, isComplete)) break;
    n++;
  }
  return n;
}

export const completedSet = (progress, isComplete) =>
  new Set(WEEKS.filter(w => weekComplete(w, progress, isComplete)).map(w => w.week));

/* The station the child is standing on: the first unfinished week, or
   the last week once everything is done. Never null, so the traveller
   always has somewhere to be. */
export const currentWeek = (done) => Math.min(done + 1, TOTAL_WEEKS);

/* A month's badge is earned when every week in it is complete. */
export function badgesEarned(done) {
  return MONTHS.filter(m => done >= m.to).map(m => m.n);
}

export const allComplete = (done) => done >= TOTAL_WEEKS;

/* ---------------- speaking to the child ----------------

   AMHARIC IMPERATIVES ARE GENDERED. "Be strong" is በርታ to a boy and
   በርቺ to a girl; በርቱ is the plural, and it is what a respectful
   stranger says to someone whose gender they do not know. Getting this
   wrong is not a typo — it is addressing a child as the wrong person,
   every time they open the page.

   There is NO gender field on the account and this does not add one.
   Collecting one would mean another field about a minor, which
   CLAUDE.md says to justify before adding, and nothing else on the
   site needs it. So the choice lives in localStorage on the child's
   own device, it is optional, and until it is made every sentence
   uses the plural — which is correct Amharic rather than a placeholder.

   `form` is 'boy' | 'girl' | 'neutral'. Anything unrecognised falls
   back to neutral, so a corrupted localStorage value is polite rather
   than wrong. */
export const GENDER_KEY = 'fy-journey-gender';

const IMPERATIVE = {
  strong:   { boy: 'በርታ',        girl: 'በርቺ',        neutral: 'በርቱ' },
  continue: { boy: 'እንዲህ ቀጥል',   girl: 'እንዲህ ቀጥዪ',   neutral: 'እንዲህ ቀጥሉ' },
  look:     { boy: 'ተመልከት',      girl: 'ተመልከቺ',      neutral: 'ተመልከቱ' }
};

export function imperative(kind, form = 'neutral') {
  const row = IMPERATIVE[kind];
  if (!row) return '';
  return row[form] || row.neutral;
}

/* Said when a week is finished or a badge is earned. Praise for the
   distance walked, never a reminder of what is left — "only 15 weeks
   to go" makes a tired child feel further behind, not further along. */
export function celebrate(done, form = 'neutral', total = TOTAL_WEEKS) {
  const strong = imperative('strong', form);
  const carry = imperative('continue', form);
  if (done <= 0) return `ጉዞው ዛሬ ይጀምራል። ${strong}!`;
  if (done >= total) return 'ሁሉንም ጨርሰሃል። እንኳን ደስ አለህ!';
  const r = total ? done / total : 0;
  if (r < 0.25) return `ሳምንት ${done} ተጠናቀቀ። ${strong}!`;
  if (r < 0.5)  return `ሳምንት ${done} ተጠናቀቀ። ${carry}!`;
  if (r < 0.75) return `ግማሽ መንገድ አልፈሃል። ${carry}!`;
  return `መድረሻው ተቃርቧል። ${strong}!`;
}

/* The finish screen, which is the one place the sentence is about the
   child rather than about the road. */
export const heroLine = (form = 'neutral') =>
  `ሃያ አራቱንም ሳምንታት ጨርሰሃል። ${imperative('strong', form)}!`;

/* ---------------- demo mode ----------------

   ?demo=N fakes N completed weeks so every state can be reviewed
   without a Firestore account or a written curriculum. It is read from
   the URL, clamped, and NEVER written anywhere — it exists only in the
   rendering path, so no demo value can reach a child's record.

   Returns null when absent or unparseable, and the page then uses real
   progress. Out-of-range values clamp rather than throw: ?demo=99 is
   somebody checking the finish line, not an attack. */
export function demoWeeks(search = '') {
  const raw = new URLSearchParams(search).get('demo');
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(TOTAL_WEEKS, Math.floor(n)));
}

/* The completed set a demo implies: the first N weeks, in order. */
export const demoCompletedSet = (n) =>
  new Set(Array.from({ length: Math.max(0, n) }, (_, i) => i + 1));
