/* ===========================================================
   lessons.js — the curriculum, as track -> subject -> lessons.

   A subject is what a certificate is earned for, what an exam covers,
   and what the dashboard groups by. Lessons belong to a subject; the
   track is read from the subject rather than stored twice.

   ---------------------------------------------------------------
   MOST SUBJECTS HAVE NO LESSONS YET, AND THAT IS A SUPPORTED STATE.

   One subject — አምስቱ አዕማደ ምስጢራት — now has a single real lesson. The
   other ELEVEN have none, and each says "ትምህርቶቹ በቅርቡ ይጀምራሉ።" rather
   than rendering an empty box that looks broken. Do not remove that
   handling to tidy up: it is what eleven of the twelve subjects
   currently render.

   Adding a lesson is a DATA EDIT IN THIS FILE ONLY — append an object
   to LESSONS with a `subject` matching one of the ids below, and it
   appears on the dashboard, counts toward that subject's certificate,
   and becomes reachable in lesson.html. No page changes, no rules
   changes.

   The free preview needs no second edit either — it is derived, so the
   first Bible lesson to exist becomes it. See FREE_PREVIEW_ID below.
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

   One so far. The other eleven subjects are still empty, which the
   pages handle — see the header.

   The shape, for whoever fills the rest in:

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
export const LESSONS = [
  /* ---------------------------------------------------------------
     THE FIRST REAL LESSON. Added to test the attendance system against
     an actual video; everything about it that a person must write is
     still waiting on a መምህር, and is marked below.

     `draft: true` says so in the data, so `grep draft assets/js` finds
     everything unreviewed. Nothing reads the flag — it is a marker for
     people, not a switch.

     WHAT IS REAL:   the YouTube id, the subject, the position.
     WHAT IS NOT:    the teacher's name, the summary, the three
                     questions. See the notes on each.

     The declared 28 minutes is VERIFIED, not assumed. Measured through
     the IFrame API's getDuration(), the same source lesson.html uses:
     1685 seconds, or 28.08 minutes. So the figure is right to within
     five seconds, and lesson.html's onReady check — which warns when
     declared and actual differ by more than 1.5 minutes — will stay
     quiet for this lesson.

     The load-time 9-13 warning DOES fire, and is meant to. The rule is
     not widened to accommodate one long video, because the rule is what
     catches the next mistyped upload — a 22-minute file labelled 11.

     At 1685s the video is 337 five-second buckets, so the 90% threshold
     needs 304 of them: about 25.3 minutes of real playback. See the
     note on coverage persistence in docs/PAYMENTS.md — that is a long
     time for a child to hold in one sitting.
     --------------------------------------------------------------- */
  {
    id: 'am1',
    num: '፩',
    subject: 'amestu',
    draft: true,

    /* Names the subject and the position, and claims nothing about the
       video's specific content, which no one here has watched. Replace
       with the actual topic. */
    title: 'አምስቱ አዕማደ ምስጢራት — ትምህርት ፩',

    // NOT a real person. A መምህር's name goes on work they taught, and
    // inventing one would put a teacher's name against a lesson they
    // never gave. Replace before a family sees this.
    teacher: 'መምህር (ስም ይተካ)',

    minutes: 28,
    youtube: 'nHDmjS-wUX4',

    // The summary describes what the video covers; nobody here has
    // watched it, so it says who fills it in rather than guessing.
    summary: 'የትምህርቱ ማጠቃለያ በመምህሩ ይሞላል።',

    /* PLACEHOLDER QUESTIONS — for a መምህር to replace.

       These stick to the naming and counting of the five pillars, which
       is standard catechesis and not a matter of interpretation. They
       are deliberately shallow: a real question set should follow what
       this particular video actually teaches, and should be written by
       whoever teaches it. Do not treat these as a model for depth. */
    questions: [
      {
        q: 'አምስቱ አዕማደ ምስጢራት ስንት ናቸው?',
        options: ['ሦስት', 'አራት', 'አምስት', 'ሰባት'],
        answer: 2,
        why: 'ስማቸው እንደሚያመለክተው አምስት ናቸው።'
      },
      {
        q: 'ከአምስቱ አዕማደ ምስጢራት አንዱ ያልሆነው የትኛው ነው?',
        options: ['ምስጢረ ሥላሴ', 'ምስጢረ ሥጋዌ', 'ምስጢረ ጥምቀት', 'ምስጢረ ጾም'],
        answer: 3,
        why: 'አምስቱ፦ ምስጢረ ሥላሴ፣ ምስጢረ ሥጋዌ፣ ምስጢረ ጥምቀት፣ ምስጢረ ቁርባን እና ምስጢረ ትንሣኤ ሙታን ናቸው። ጾም ከአጽዋማት እንጂ ከአዕማደ ምስጢራት አይደለም።'
      },
      {
        q: 'የመጀመሪያው አምደ ምስጢር የትኛው ነው?',
        options: ['ምስጢረ ቁርባን', 'ምስጢረ ሥላሴ', 'ምስጢረ ትንሣኤ ሙታን', 'ምስጢረ ጥምቀት'],
        answer: 1,
        why: 'ምስጢረ ሥላሴ የመጀመሪያው ነው።'
      }
    ]
  }
];

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
