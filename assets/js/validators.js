/* ===========================================================
   validators.js — the enrollment rules, as pure functions.

   These live outside both register.html and store.js on purpose.
   The form and the storage layer must refuse exactly the same
   input; a copy in each would drift, and the copy inside store.js
   is the one that actually protects the database. The form calls
   these for a fast, friendly refusal, store.js calls them again
   because a form can be bypassed.

   Every validator returns { ok: true } or { ok: false, message },
   where message is Amharic and already explains WHY it was
   refused. Nothing here silently corrects a value.
   =========================================================== */

/* The two courses, and who each one is for.
   bible: 7–13 inclusive — the material is written for children.
   zema:  7 and up, no ceiling — adults learn chant too. */
/* `enrollable` gates whether a course is OFFERED, not whether it exists.
   A course can be closed to new enrolment while remaining perfectly valid
   for the families already in it: the track stays in the data model,
   existing accounts keep working, and the homepage keeps describing it.
   Only the registration form and the terms price table change.
   Both tracks are currently open — see the note on zema below. */
/* Capabilities, not assumptions. Zema is listen-and-learn: it has no
   quizzes, no scores, no pass mark and no exams, and a page must ask
   the track rather than assuming every course works like the Bible one.
   Anywhere a Zema student is shown ውጤት is a bug, so the check lives on
   the data instead of being repeated as an `if (track === 'zema')`
   somewhere a future page will forget. */
export const TRACKS = {
  bible: {
    id: 'bible',
    am: 'የቅዱሳት መጻሕፍት ትምህርት',
    en: 'Bible study',
    enrollable: true,
    hasQuizzes: true,
    hasExams: true,
    hasScores: true,
    min: 7,
    max: 13,
    eligibilityAm: 'የቅዱሳት መጻሕፍት ትምህርት ዕድሜያቸው ከ፯ እስከ ፲፫ ዓመት ለሆኑ ልጆች ነው።',
    eligibilityEn: 'Bible study is for children aged 7 to 13.'
  },
  zema: {
    id: 'zema',
    am: 'የዜማ ትምህርት ቤት',
    en: 'Zema school',
    /* OPEN, since 2026-09-10. The recordings exist.

       History, kept rather than deleted because the reasoning is what
       makes the flag worth having: Zema was deliberately CLOSED while its
       pricing was already built and tested — the flat $30, the all-ticked
       default, the $10 add-on all worked — because the lessons themselves
       were still placeholders, and taking $30 for unrecorded lessons is
       not shippable. An acceptance case was not a reason to open it.

       The whole course now reads this one flag: the registration form,
       the terms price table, the dashboard and the tests. Flipping it
       back to false closes enrolment again in one edit, and the skipped
       assertions in tests/pricing.test.mjs turn themselves off with it.
       That round trip is tested in both directions in
       tests/validators.test.mjs, so it stays a real switch. */
    enrollable: true,
    hasQuizzes: false,
    hasExams: false,
    hasScores: false,
    min: 7,
    max: null,
    eligibilityAm: 'የዜማ ትምህርት ቤት ከ፯ ዓመት ጀምሮ ለሁሉም ክፍት ነው።',
    eligibilityEn: 'Zema school is open from age 7 upward.'
  }
};

/* ---------------- roles ----------------

   Five, and the order matters: each one below reaches strictly further
   than the one above it.

     student          a child's account, opened by their parent
     pending_teacher  registered, waiting on approval — reaches NOTHING
     rejected         a refused request, kept so there is a history
     teacher          reads and manages ONLY their assigned students
     admin            the above, plus approving teachers and assigning
                      students. Created by hand in the Firebase console;
                      the rules deliberately refuse to mint one from a
                      browser, including for another admin.

   `staff` is what a page asks before showing anything about a child.
   Asking the capability rather than testing the id means a role added
   later gets the right answer by declaring it, instead of by being
   remembered at a dozen call sites. */
export const ROLES = {
  student:         { id: 'student',         am: 'ተማሪ',            staff: false },
  pending_teacher: { id: 'pending_teacher', am: 'በመጠባበቅ ላይ',      staff: false },
  rejected:        { id: 'rejected',        am: 'ያልተቀበለ',         staff: false },
  teacher:         { id: 'teacher',         am: 'መምህር',           staff: true  },
  admin:           { id: 'admin',           am: 'አስተዳዳሪ',         staff: true  }
};

/* An unknown role is treated as reaching nothing, which fails closed: a
   page that cannot identify the account shows no children rather than
   guessing that it is probably a teacher. */
export const isStaff = (role) => ROLES[role]?.staff === true;
export const roleLabel = (role) => ROLES[role]?.am ?? '—';

/* Registration may open exactly these two. 'teacher' and 'admin' are
   refused here AND in firestore.rules — the rules are what actually
   enforces it, since this file runs in a browser the registrant owns. */
export const REGISTERABLE_ROLES = ['student', 'pending_teacher'];

export const NAME_REFUSED = 'እባክዎ ሙሉ ሕጋዊ ስም ያስገቡ።';

/* Strings that are obviously not a name. Keyboard mashing, the word
   "test", and placeholder words people type to get past a form. */
const FILLER = new Set([
  'test', 'tests', 'testing', 'asdf', 'asdfg', 'asdfgh', 'sdf', 'qwe', 'qwer',
  'qwerty', 'abc', 'abcd', 'abcde', 'name', 'fullname', 'firstname', 'lastname',
  'none', 'null', 'undefined', 'nil', 'na', 'sample', 'demo', 'example',
  'user', 'parent', 'guardian', 'student', 'child', 'kid', 'anon', 'anonymous'
]);

// \p{L} covers Ethiopic as well as Latin, so an Amharic name passes
// the "contains letters" test without a separate range check.
const hasLetter = (s) => /\p{L}/u.test(s);
const lettersAndDigitsOnly = (s) => s.replace(/[^\p{L}\p{N}]/gu, '');
const isAllSameChar = (s) => s.length > 1 && [...s].every((c) => c === s[0]);

/* A full legal name: at least two parts, each at least two characters,
   each containing actual letters, none of them filler. Ethiopic
   syllables count as characters, so ሳራ (2 chars) is accepted. */
export function validateName(raw) {
  if (typeof raw !== 'string') return { ok: false, message: NAME_REFUSED };

  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, message: NAME_REFUSED };

  const parts = name.split(' ');
  if (parts.length < 2) return { ok: false, message: NAME_REFUSED };

  for (const part of parts) {
    const core = lettersAndDigitsOnly(part);
    if (core.length < 2) return { ok: false, message: NAME_REFUSED };
    if (!hasLetter(core)) return { ok: false, message: NAME_REFUSED };
    if (isAllSameChar(core)) return { ok: false, message: NAME_REFUSED };
    if (FILLER.has(core.toLowerCase())) return { ok: false, message: NAME_REFUSED };
  }

  return { ok: true };
}

/* Refuses out-of-range ages by naming the range that was expected.
   Never clamps: an 14-year-old is not quietly enrolled as 13. */
export function validateAge(rawAge, trackId) {
  const track = TRACKS[trackId];
  if (!track) return { ok: false, message: 'እባክዎ የትምህርት ክፍሉን ይምረጡ።' };

  const age = Number(rawAge);
  if (!Number.isInteger(age)) {
    return { ok: false, message: 'የተማሪውን ዕድሜ በሙሉ ቁጥር ያስገቡ።' };
  }

  const tooYoung = age < track.min;
  const tooOld = track.max !== null && age > track.max;
  if (tooYoung || tooOld) {
    return {
      ok: false,
      message: `${track.eligibilityAm} ያስገቡት ዕድሜ ${age} ስለሆነ በዚህ ክፍል መመዝገብ አልተቻለም።`
    };
  }

  return { ok: true };
}

export function validateTrack(trackId) {
  return TRACKS[trackId]
    ? { ok: true }
    : { ok: false, message: 'እባክዎ የትምህርት ክፍሉን ይምረጡ።' };
}

export const enrollableTracks = () => Object.values(TRACKS).filter(t => t.enrollable);

/* Ask these rather than testing the track id. An unknown track is treated
   as having nothing, which fails closed: a page that cannot identify the
   course shows no scores rather than showing the wrong ones. */
export const hasScores = (trackId) => TRACKS[trackId]?.hasScores === true;
export const hasQuizzes = (trackId) => TRACKS[trackId]?.hasQuizzes === true;
export const hasExams = (trackId) => TRACKS[trackId]?.hasExams === true;

/* Registration uses this rather than validateTrack: an existing zema
   student is perfectly valid, but a NEW enrolment into a course with no
   recorded lessons is not. */
export function validateEnrollableTrack(trackId) {
  const track = TRACKS[trackId];
  if (!track) return { ok: false, message: 'እባክዎ የትምህርት ክፍሉን ይምረጡ።' };
  if (!track.enrollable) {
    return { ok: false, message: `${track.am} ገና አልተከፈተም። ትምህርቶቹ ሲዘጋጁ ምዝገባ ይጀምራል።` };
  }
  return { ok: true };
}

/* ---------------- teacher comments ----------------

   A note a teacher leaves on a child's record. Three things make it safe
   enough to exist at all, and all three are enforced by firestore.rules
   as well as here:

     it is bounded          — 1000 characters, so it stays a note about
                              this week's lesson and not a file on a child
     it names its author    — `by` must equal the writer's own uid
     the parent can read it — nothing is recorded about a child that the
                              parent cannot see on their own dashboard

   The last one is the reason the field is defensible. A private note a
   family cannot read is a different thing wearing the same name. */
export const COMMENT_MAX_CHARS = 1000;

export function validateComment(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return { ok: false, message: 'አስተያየቱ ባዶ ነው።' };
  if (t.length > COMMENT_MAX_CHARS) {
    return { ok: false, message: `አስተያየት ከ${COMMENT_MAX_CHARS} ፊደል መብለጥ አይችልም።` };
  }
  return { ok: true };
}

export function validatePassword(pw) {
  return (typeof pw === 'string' && pw.length >= 8)
    ? { ok: true }
    : { ok: false, message: 'የይለፍ ቃል ቢያንስ ፰ ፊደል ሊኖረው ይገባል።' };
}

/* Deliberately loose. Firebase Auth is the real authority on whether an
   address exists; this only catches a typo before the network call. */
export function validateEmail(email) {
  return (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ? { ok: true }
    : { ok: false, message: 'ትክክለኛ የኢሜይል አድራሻ ያስገቡ።' };
}
