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
   The Zema lessons are placeholders a teacher has not yet replaced, and
   enrolling a child into an empty course would be selling something that
   isn't there. The track stays in the data model — existing zema accounts
   keep working, the homepage keeps describing the course — it simply is
   not on the registration form until it has real content. Flip it back to
   true once the lessons are recorded. */
export const TRACKS = {
  bible: {
    id: 'bible',
    am: 'የቅዱሳት መጻሕፍት ትምህርት',
    en: 'Bible study',
    enrollable: true,
    min: 7,
    max: 13,
    eligibilityAm: 'የቅዱሳት መጻሕፍት ትምህርት ዕድሜያቸው ከ፯ እስከ ፲፫ ዓመት ለሆኑ ልጆች ነው።',
    eligibilityEn: 'Bible study is for children aged 7 to 13.'
  },
  zema: {
    id: 'zema',
    am: 'የዜማ ትምህርት ቤት',
    en: 'Zema school',
    enrollable: false,   // placeholder lessons — see the note above
    min: 7,
    max: null,
    eligibilityAm: 'የዜማ ትምህርት ቤት ከ፯ ዓመት ጀምሮ ለሁሉም ክፍት ነው።',
    eligibilityEn: 'Zema school is open from age 7 upward.'
  }
};

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
