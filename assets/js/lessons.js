/* ===========================================================
   lessons.js — the curriculum, as track -> subject -> lessons.

   A subject is what a certificate is earned for, what an exam covers,
   and what the dashboard groups by. Lessons belong to a subject; the
   track is read from the subject rather than stored twice.

   ---------------------------------------------------------------
   THE LESSON LIST IS EMPTY ON PURPOSE, AND THAT IS A SUPPORTED STATE.

   The subjects below are the real curriculum. The sub-topics under each
   are being written and have not arrived yet, so LESSONS is `[]`.

   Every page already handles this: a subject with no lessons says
   "ትምህርቶቹ በቅርቡ ይጀምራሉ" rather than rendering an empty box that looks
   broken. Adding a lesson later is a DATA EDIT IN THIS FILE ONLY —
   append an object to LESSONS with a `subject` matching one of the ids
   below, and it appears on the dashboard, counts toward that subject's
   certificate, and becomes reachable in lesson.html. No page changes,
   no test changes, no rules changes.

   The one thing that used to need a second edit was the free preview,
   and it no longer does — see FREE_PREVIEW_ID at the bottom.
   ---------------------------------------------------------------

   Drop a YouTube ID into `youtube` and the lesson goes live. Use
   UNLISTED videos: playable by anyone with the link, not findable on
   YouTube, and free to stream. See README.

   ZEMA CARRIES NO QUESTIONS. It is listen-and-learn: attendance is the
   whole of its progress. A Zema lesson must simply omit `questions`;
   the absence is the mechanism, so no page can accidentally render a
   score for a Zema student.
   =========================================================== */

/* A lesson should run 10-12 minutes. Anything outside 9-13 is either a
   mistyped `minutes` or the wrong upload; both are worth catching before
   a child sits through it. */
export const LESSON_MIN_MINUTES = 9;
export const LESSON_MAX_MINUTES = 13;

/* ---------------- subjects ----------------

   Order here is the order a student sees, and `num` is the Ge'ez numeral
   shown beside it. Both tracks are numbered from ፩ within themselves.

   `id` is a stable ASCII key. It is written onto a student's
   `selectedSubjects` when they enrol and read back for years, so once a
   family has been sold a subject its id must not be renamed — a rename
   silently un-enrols them from a course they paid for.

   `badge` is the title a certificate awards for finishing the subject —
   printed as the thing the child is now called, and read aloud by their
   family.

   NONE OF THESE HAS BEEN APPROVED BY A መምህር. They need the same sign-off
   as the signature lines on the certificate itself, and for the same
   reason: naming what a child has become in a tradition is not a
   developer's call. The four Zema titles below (ጾመ ድጓ, ምዕራፍ, ቅዳሴ,
   ዝማሬ መዋሥዕት) were written here following the pattern of the others; the
   rest predate them and were never reviewed either.

   They are unusually easy to overlook because they already read
   plausibly — nothing about them announces that nobody qualified chose
   them. See docs/CHURCH-DECISIONS.md §5. Changing one is a data edit
   here and nowhere else.

   `descAm` is ONE SENTENCE of Amharic shown under the subject on the
   registration form, so a parent choosing for their child can see what
   the course actually covers. Every one is deliberately EMPTY: these
   describe EOTC teaching and are the parish's words to write, not a
   developer's to invent. The form renders the sentence when it is
   present and renders nothing at all when it is not — a parent never
   sees a placeholder. Filling them in is a data edit here and nowhere
   else. */
export const SUBJECTS = [
  // ---- Bible study — ages 7 to 13 ----
  { id: 'amestu',      track: 'bible', num: '፩', am: 'አምስቱ አዕማደ ምስጢራት', en: 'The Five Pillars of Mystery', badge: 'የምስጢራት ዐዋቂ', descAm: '' },
  { id: 'sirate',      track: 'bible', num: '፪', am: 'ሥርዓተ ቤተ ክርስቲያን',   en: 'Order of the Church',        badge: 'የሥርዓት ጠባቂ', descAm: '' },
  { id: 'meshaftarik', track: 'bible', num: '፫', am: 'የመጽሐፍ ቅዱስ ታሪክ',    en: 'Bible History',              badge: 'የታሪክ ዐዋቂ', descAm: '' },
  { id: 'betekrtarik', track: 'bible', num: '፬', am: 'የቤተ ክርስቲያን ታሪክ',   en: 'Church History',             badge: 'የአበው ታሪክ ዐዋቂ', descAm: '' },
  { id: 'sinemigbar',  track: 'bible', num: '፭', am: 'ክርስቲያናዊ ሥነ ምግባር',  en: 'Christian Conduct',          badge: 'የመልካም ምግባር ባለቤት', descAm: '' },

  // ---- Zema — age 7 and up, no ceiling ----
  { id: 'wudase',      track: 'zema',  num: '፩', am: 'ውዳሴ ማርያም',        en: 'Wudase Mariam',   badge: 'የውዳሴ ማርያም ዘማሪ', descAm: '' },
  { id: 'mezmur',      track: 'zema',  num: '፪', am: 'መዝሙረ ዳዊት',        en: 'Mezmure Dawit',   badge: 'የመዝሙር ባለቤት', descAm: '' },
  { id: 'aquaquam',    track: 'zema',  num: '፫', am: 'አቋቋም',            en: 'Aquaquam',        badge: 'የአቋቋም ሰልጣኝ', descAm: '' },
  { id: 'tsomedigua',  track: 'zema',  num: '፬', am: 'ጾመ ድጓ',           en: 'Tsome Digua',     badge: 'የጾመ ድጓ ዘማሪ', descAm: '' },
  { id: 'miraf',       track: 'zema',  num: '፭', am: 'ምዕራፍ',            en: 'Miraf',           badge: 'የምዕራፍ ዐዋቂ', descAm: '' },
  { id: 'kidase',      track: 'zema',  num: '፮', am: 'ቅዳሴ',             en: 'Kidase',          badge: 'የቅዳሴ ዘማሪ', descAm: '' },
  { id: 'zimare',      track: 'zema',  num: '፯', am: 'ዝማሬ መዋሥዕት',       en: 'Zimare Mewasit',  badge: 'የዝማሬ መዋሥዕት ዘማሪ', descAm: '' }
];

/* ---------------- lessons ----------------

   Empty until the sub-topics are written. See the header: this is a
   supported state, not a gap to patch around.

   The shape, for whoever fills it in:

     {
       id: 'am1',            // unique across ALL lessons, never reused
       num: '፩',             // position within its subject
       subject: 'amestu',    // must match a SUBJECTS id above
       title: 'የትምህርቱ ርዕስ',
       teacher: 'መምህር ...',
       minutes: 11,          // 9-13, or it warns in the console
       youtube: 'VIDEO_ID',  // unlisted
       summary: 'አንድ ዓረፍተ ነገር።',
       questions: [ ... ]    // BIBLE ONLY — omit entirely for Zema
     }
*/
export const LESSONS = [];

/* ---------------- lookups ---------------- */

export const findLesson = (id) => LESSONS.find(l => l.id === id);
export const subjectById = (id) => SUBJECTS.find(s => s.id === id);
export const subjectsFor = (track) => SUBJECTS.filter(s => s.track === track);
export const lessonsForSubject = (subjectId) => LESSONS.filter(l => l.subject === subjectId);

/* The track of a lesson comes from its subject — stored once, so the two
   can never disagree. */
export const trackOfLesson = (lesson) => subjectById(lesson && lesson.subject)?.track ?? null;
export const lessonsFor = (track) =>
  LESSONS.filter(l => trackOfLesson(l) === track);

/* ---------------- the free preview ----------------

   DERIVED, not a hardcoded id. terms.html promises parents that the
   first lesson is free to watch before they pay, and that promise has to
   survive the curriculum being rewritten — a constant pointing at a
   lesson that no longer exists would silently withdraw the free preview
   while the terms still advertised it.

   So it is whatever the first Bible lesson turns out to be, in the order
   a student meets them: the first subject that has any lessons, and its
   first lesson. Append a lesson to `amestu` and it becomes the preview
   automatically, with no second edit anywhere.

   null while there are no lessons at all, which is honest — there is
   nothing to preview yet, and nothing claims otherwise. */
function firstLessonOfTrack(track) {
  for (const subject of subjectsFor(track)) {
    const first = LESSONS.find(l => l.subject === subject.id);
    if (first) return first.id;
  }
  return null;
}

export const FREE_PREVIEW_ID = firstLessonOfTrack('bible');

// Guards against null: with no curriculum, no id is "the free one", and
// isFree(undefined) must not accidentally become true.
export const isFree = (id) => FREE_PREVIEW_ID !== null && id === FREE_PREVIEW_ID;

/* ---------------- duration sanity ----------------
   Returns the lessons whose DECLARED minutes fall outside the range.
   This catches a typo in the metadata. It cannot catch a 22-minute video
   labelled 11 — only the player knows that, so lesson.html compares the
   real getDuration() against these minutes once the video is ready. */
export function outOfRangeLessons(lessons = LESSONS) {
  return lessons.filter(l =>
    typeof l.minutes === 'number' &&
    (l.minutes < LESSON_MIN_MINUTES || l.minutes > LESSON_MAX_MINUTES));
}

// One grouped warning at load rather than one per lesson, so a handful of
// placeholders does not bury everything else in the console.
const offenders = outOfRangeLessons();
if (offenders.length) {
  console.warn(
    `[lessons] ${offenders.length} lesson(s) declare a length outside ` +
    `${LESSON_MIN_MINUTES}-${LESSON_MAX_MINUTES} minutes:`,
    offenders.map(l => `${l.id} (${l.minutes}m)`).join(', ')
  );
}
