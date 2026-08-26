/* ===========================================================
   store.js — the ONLY file that touches storage.
   Right now it reads/writes localStorage. In phase 2 every
   function below gets swapped for a Firestore call and nothing
   else in the app has to change. Keep the signatures identical.
   =========================================================== */

const KEY = 'eotc.v1';

// in-memory fallback so the app still runs where localStorage is blocked
let _mem = null;
const safeRead = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; }
  catch (e) { return _mem; }
};
const safeWrite = (data) => {
  _mem = data;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* memory only */ }
};

const seed = () => ({
  currentUid: null,
  users: {
    'demo-1': {
      uid: 'demo-1', fullName: 'ሳራ ተስፋዬ', email: 'sara@example.com',
      role: 'student', age: 12, guardian: 'ወ/ሮ ሂሩት', location: 'Washington, DC', country: 'United States',
      verified: true,
      paid: true, createdAt: Date.now() - 86400000 * 21, lastSeen: Date.now() - 1000 * 60 * 8,
      studySeconds: 60 * 214, progress: { l1: { done: true, score: 3, of: 3 }, l2: { done: true, score: 2, of: 3 }, l3: { done: true, score: 3, of: 3 } }
    },
    'demo-2': {
      uid: 'demo-2', fullName: 'ናትናኤል አበበ', email: 'nati@example.com',
      role: 'student', age: 14, guardian: 'አቶ አበበ', location: 'Toronto, ON', country: 'Canada',
      verified: true,
      paid: true, createdAt: Date.now() - 86400000 * 19, lastSeen: Date.now() - 1000 * 60 * 60 * 30,
      studySeconds: 60 * 96, progress: { l1: { done: true, score: 3, of: 3 }, l2: { done: true, score: 1, of: 3 } }
    },
    'demo-3': {
      uid: 'demo-3', fullName: 'ሰላም ግርማ', email: 'selam@example.com',
      role: 'student', age: 9, guardian: 'ወ/ሮ አልማዝ', location: 'Stockholm', country: 'Sweden',
      verified: false,
      paid: false, createdAt: Date.now() - 86400000 * 3, lastSeen: Date.now() - 86400000 * 3,
      studySeconds: 60 * 12, progress: { l1: { done: false, score: 0, of: 3 } }
    }
  }
});

const db = () => {
  let d = safeRead();
  if (!d) { d = seed(); safeWrite(d); }
  return d;
};
const save = (d) => safeWrite(d);

/* ---------------- accounts ---------------- */

export const Store = {

  createUser({ fullName, email, password, age, guardian, location, country, role = 'student', verified = false }) {
    const d = db();
    const exists = Object.values(d.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error('ይህ ኢሜይል አስቀድሞ ተመዝግቧል።');
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum >= 16) {
      throw new Error('የተማሪው ዕድሜ ከ፲፮ ዓመት በታች መሆን አለበት።');
    }
    const uid = 'u' + Date.now().toString(36);
    d.users[uid] = {
      uid, fullName, email, password, role, age: ageNum, guardian, location, country,
      verified,                 // phase 1: confirmed via the on-page demo code below;
                                 // phase 2: swap for Firebase sendEmailVerification()
      paid: false,              // phase 2: flipped by the Stripe webhook
      createdAt: Date.now(), lastSeen: Date.now(),
      studySeconds: 0, progress: {}
    };
    d.currentUid = uid;
    save(d);
    return d.users[uid];
  },

  signIn({ email, password }) {
    const d = db();
    const u = Object.values(d.users).find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u) throw new Error('መለያ አልተገኘም።');
    if (u.password && u.password !== password) throw new Error('የይለፍ ቃሉ ትክክል አይደለም።');
    u.lastSeen = Date.now();
    d.currentUid = u.uid;
    save(d);
    return u;
  },

  signOut() { const d = db(); d.currentUid = null; save(d); },

  current() { const d = db(); return d.currentUid ? d.users[d.currentUid] : null; },

  allUsers() { return Object.values(db().users).filter(u => u.role === 'student'); },

  /* ---------------- attendance ---------------- */

  // called on a heartbeat while a lesson is genuinely playing
  addStudySeconds(seconds) {
    const d = db();
    const u = d.users[d.currentUid];
    if (!u) return null;
    u.studySeconds += seconds;
    u.lastSeen = Date.now();
    save(d);
    return u.studySeconds;
  },

  touch() {
    const d = db();
    const u = d.users[d.currentUid];
    if (!u) return;
    u.lastSeen = Date.now();
    save(d);
  },

  /* ---------------- progress ---------------- */

  saveQuiz(lessonId, score, of) {
    const d = db();
    const u = d.users[d.currentUid];
    if (!u) return null;
    const prev = u.progress[lessonId] || { score: 0 };
    u.progress[lessonId] = { done: true, score: Math.max(score, prev.score), of, at: Date.now() };
    u.lastSeen = Date.now();
    save(d);
    return u.progress[lessonId];
  },

  reset() { save(seed()); }
};

/* ---------------- shared formatting ---------------- */

export const fmtHours = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h} ሰዓት ${m} ደቂቃ` : `${m} ደቂቃ`;
};

export const fmtAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 90) return 'አሁን';
  if (s < 3600) return `ከ${Math.floor(s / 60)} ደቂቃ በፊት`;
  if (s < 86400) return `ከ${Math.floor(s / 3600)} ሰዓት በፊት`;
  return `ከ${Math.floor(s / 86400)} ቀን በፊት`;
};

export const requireAuth = () => {
  const u = Store.current();
  if (!u) { location.href = 'login.html'; return null; }
  return u;
};
