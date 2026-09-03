/* ===========================================================
   store.js — the ONLY file in this project that touches storage.

   Phase 2: Firebase Auth + Firestore, loaded straight from the
   gstatic CDN as ES modules. No npm, no bundler, no build step —
   the site still deploys to GitHub Pages as plain static files.

   Every page talks to the backend through this module. No page
   imports firebase directly. If a page needs data, it gets a
   method here.

   Everything below is async. Auth state is not known synchronously
   on a page load, which is why ready() exists — see the note on it.
   =========================================================== */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, sendEmailVerification, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, getDocs, query, where, increment, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { firebaseConfig } from './config.js';
import { validateName, validateAge, validateTrack, validatePassword, validateEmail }
  from './validators.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------- auth readiness ----------------
   Firebase restores a session asynchronously. On a fresh page load
   auth.currentUser is null for a beat even when the visitor is
   perfectly signed in. Without awaiting this, every refresh bounces
   a signed-in parent back to the sign-in screen. Resolves on the
   first onAuthStateChanged callback; afterwards it is instant. */
let authUser = null;
let authKnown = false;
let readyPromise = null;

export const ready = () => {
  if (authKnown) return Promise.resolve(authUser);
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      onAuthStateChanged(auth, (u) => {
        authUser = u;
        authKnown = true;
        resolve(u);
      });
    });
  }
  return readyPromise;
};

/* ---------------- error messages ----------------
   A raw Firebase code ("auth/invalid-credential") means nothing to a
   parent in Seattle. Every throw out of this module is Amharic. */
const AM_ERRORS = {
  'auth/email-already-in-use': 'ይህ ኢሜይል አስቀድሞ ተመዝግቧል። ይግቡ ወይም ሌላ ኢሜይል ይጠቀሙ።',
  'auth/invalid-email': 'ትክክለኛ ኢሜይል አድራሻ ያስገቡ።',
  'auth/weak-password': 'የይለፍ ቃሉ በጣም ቀላል ነው። ቢያንስ ፮ ፊደል ይጠቀሙ።',
  'auth/user-not-found': 'በዚህ ኢሜይል የተመዘገበ መለያ የለም።',
  'auth/wrong-password': 'የይለፍ ቃሉ ትክክል አይደለም።',
  'auth/invalid-credential': 'ኢሜይሉ ወይም የይለፍ ቃሉ ትክክል አይደለም።',
  'auth/too-many-requests': 'ብዙ ጊዜ ተሞክሯል። ትንሽ ቆይተው እንደገና ይሞክሩ።',
  'auth/network-request-failed': 'የበይነመረብ ግንኙነት የለም። ግንኙነትዎን አረጋግጠው ይሞክሩ።',
  'permission-denied': 'ይህን መረጃ ለማየት ወይም ለመቀየር ፈቃድ የለዎትም።',
  'unavailable': 'አገልግሎቱ ለጊዜው አልተገኘም። ትንሽ ቆይተው ይሞክሩ።'
};

const amharicError = (e) => {
  const code = (e && e.code) ? String(e.code) : '';
  return AM_ERRORS[code]
      || AM_ERRORS[code.replace(/^auth\//, '')]
      || AM_ERRORS[code.replace(/^firestore\//, '')]
      || 'ያልታወቀ ችግር ተከስቷል። እባክዎ እንደገና ይሞክሩ።';
};

const fail = (e) => { throw new Error(amharicError(e)); };

/* ---------------- accounts + data ---------------- */

export const Store = {

  /* Creates the auth account first, then the profile doc, then sends
     the verification mail.

     The account belongs to the PARENT; the student is a profile under
     it. That is a COPPA requirement, not a UI preference, which is why
     only guardianName/email identify a person who can consent.

     Everything is re-validated here even though register.html already
     checked: a form is a courtesy, this is the boundary. The same
     functions run in both places so the two can never disagree.

     paid/role are written as false/'student' because the rules refuse a
     create that says otherwise — nobody registers themselves an admin
     or arrives pre-paid. */
  async createUser({ guardianName, email, password, studentName, age, track }) {
    for (const check of [
      validateName(guardianName),
      validateEmail(email),
      validatePassword(password),
      validateName(studentName),
      validateTrack(track),
      validateAge(age, track)
    ]) {
      if (!check.ok) throw new Error(check.message);
    }

    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) { fail(e); }

    const uid = cred.user.uid;
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        guardianName: guardianName.trim().replace(/\s+/g, ' '),
        email: email.trim(),
        studentName: studentName.trim().replace(/\s+/g, ' '),
        age: Number(age),
        track,
        role: 'student',
        paid: false,
        verified: false,
        studySeconds: 0,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
    } catch (e) { fail(e); }

    try { await sendEmailVerification(cred.user); } catch (e) { /* account exists; they can resend */ }

    return this.current();
  },

  async signIn({ email, password }) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) { fail(e); }
    await this.touch();
    return this.current();
  },

  async signOut() {
    try { await fbSignOut(auth); } catch (e) { fail(e); }
    authUser = null;
  },

  /* The profile doc, its progress subcollection, and emailVerified off
     the auth token merged into one object — the shape every page has
     always consumed. Returns null when signed out or doc-less. */
  async current() {
    await ready();
    const u = auth.currentUser;
    if (!u) return null;

    const ref = doc(db, 'users', u.uid);
    let snap;
    try { snap = await getDoc(ref); } catch (e) { fail(e); }
    if (!snap.exists()) return null;

    const data = snap.data();
    const progress = await this.progressOf(u.uid).catch(() => ({}));
    const emailVerified = !!u.emailVerified;

    // The token is the truth; the doc is a cached copy for the admin
    // roster. Correct it when they disagree, but a rules rejection here
    // must not break reading — carry on read-only.
    if (data.verified !== emailVerified) {
      try {
        await updateDoc(ref, { verified: emailVerified });
        data.verified = emailVerified;
      } catch (e) { /* read-only is fine */ }
    }

    return { ...data, uid: u.uid, email: u.email || data.email, emailVerified, progress };
  },

  async progressOf(uid) {
    const out = {};
    let snaps;
    try { snaps = await getDocs(collection(db, 'users', uid, 'progress')); }
    catch (e) { fail(e); }
    snaps.forEach((d) => { out[d.id] = d.data(); });
    return out;
  },

  /* Admin only — the rules reject this for everyone else, which is the
     point: otherwise it is a public list of children's names and emails. */
  async allUsers() {
    let snaps;
    try {
      snaps = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
    } catch (e) { fail(e); }

    const users = [];
    for (const d of snaps.docs) {
      const data = d.data();
      const progress = await this.progressOf(d.id).catch(() => ({}));
      users.push({ ...data, uid: d.id, progress });
    }
    return users;
  },

  /* Called with batched seconds, not every tick — see lesson.html.
     The rules cap a single bump at +120s so a tampered client cannot
     mint hours of fake attendance. */
  async addStudySeconds(seconds) {
    await ready();
    const u = auth.currentUser;
    if (!u) return null;
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        studySeconds: increment(seconds),
        lastSeen: serverTimestamp()
      });
    } catch (e) { fail(e); }
    return seconds;
  },

  async touch() {
    await ready();
    const u = auth.currentUser;
    if (!u) return;
    // The doc may not exist yet during registration; that is not an error.
    try { await updateDoc(doc(db, 'users', u.uid), { lastSeen: serverTimestamp() }); }
    catch (e) { /* ignore */ }
  },

  /* Best score wins — a retake can raise a mark but never lower it. */
  async saveQuiz(lessonId, score, of) {
    await ready();
    const u = auth.currentUser;
    if (!u) return null;

    const ref = doc(db, 'users', u.uid, 'progress', lessonId);
    let prevScore = 0;
    try {
      const prev = await getDoc(ref);
      if (prev.exists()) prevScore = Number(prev.data().score) || 0;
    } catch (e) { /* treat as first attempt */ }

    const record = {
      done: true,
      score: Math.max(Number(score), prevScore),
      of: Number(of),
      at: serverTimestamp()
    };
    try { await setDoc(ref, record); } catch (e) { fail(e); }
    return record;
  },

  async resendVerification() {
    await ready();
    const u = auth.currentUser;
    if (!u) return false;
    try { await sendEmailVerification(u); return true; }
    catch (e) { fail(e); }
  },

  /* Firebase caches emailVerified in the token, so a freshly-verified
     user still reads false until the user object is reloaded. */
  async refreshVerification() {
    await ready();
    const u = auth.currentUser;
    if (!u) return false;
    try { await u.reload(); } catch (e) { fail(e); }
    return !!auth.currentUser.emailVerified;
  },

  async resetPassword(email) {
    try { await sendPasswordResetEmail(auth, email); return true; }
    catch (e) { fail(e); }
  },

  /* Phase 1 left this here to flip `paid` from the browser. The rules
     now forbid any client write to `paid` — that is deliberate, since a
     student could otherwise grant themselves a free subscription from
     the console. Payment is confirmed by an admin (or, later, a Stripe
     webhook running server-side). Kept exported so nothing breaks on
     import; it explains itself rather than silently doing nothing. */
  async markPaidDemo() {
    throw new Error('ክፍያ ከአሳሽ ላይ ማስመዝገብ አይቻልም። ክፍያው ከተፈጸመ በኋላ በአስተዳዳሪ ይረጋገጣል።');
  },

  // localStorage seeding is gone; real data lives in Firestore now.
  async reset() { return null; }
};

/* Paste your Stripe Payment Link here once you've made one, e.g.
   'https://buy.stripe.com/xxxxxxxx'. Accepts Visa, Mastercard, and
   American Express with no backend — see README "Phase 3 — Payments". */
export const STRIPE_PAYMENT_LINK = '';

/* ---------------- shared formatting ---------------- */

/* Firestore hands back Timestamp objects; the old localStorage data and
   anything freshly written but not yet round-tripped are plain numbers.
   Everything that formats a time goes through this. */
export const toMillis = (t) => {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (t instanceof Date) return t.getTime();
  return 0;
};

export const fmtHours = (sec) => {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} ሰዓት ${m} ደቂቃ` : `${m} ደቂቃ`;
};

export const fmtAgo = (ts) => {
  const ms = toMillis(ts);
  if (!ms) return 'እስካሁን የለም';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 90) return 'አሁን';
  if (s < 3600) return `ከ${Math.floor(s / 60)} ደቂቃ በፊት`;
  if (s < 86400) return `ከ${Math.floor(s / 3600)} ሰዓት በፊት`;
  return `ከ${Math.floor(s / 86400)} ቀን በፊት`;
};

/* ---------------- the gate ----------------
   Painted over the whole page when a signed-in account has not yet
   confirmed its email address. Replacing document.body throws away the
   starfield canvas, so the markup re-creates it and the script is
   re-imported below. */
function paintVerificationGate(email) {
  document.body.innerHTML = `
<canvas id="sky"></canvas>
<div class="harag"></div>
<main class="shell section" style="max-width:520px">
  <div class="panel">
    <p class="eyebrow">ማረጋገጫ ያስፈልጋል</p>
    <h1 style="font-size:1.7rem;margin:0 0 10px">ኢሜይልዎን ያረጋግጡ</h1>
    <p class="muted small" style="margin:0 0 6px">
      የማረጋገጫ መልእክት ወደዚህ አድራሻ ልከናል፦
    </p>
    <p style="margin:0 0 14px"><b id="gateEmail"></b></p>
    <p class="muted small">
      በመልእክት ሳጥንዎ ውስጥ ካላገኙት እባክዎ የSpam ወይም Junk አቃፊውን ይፈትሹ።
      ካረጋገጡ በኋላ ከታች ያለውን «አረጋግጫለሁ» የሚለውን ይጫኑ።
    </p>
    <p id="gateMsg" class="note small" style="display:none"></p>
    <div class="row" style="margin-top:16px">
      <button class="btn btn--gold" id="gateDone" type="button">አረጋግጫለሁ</button>
      <button class="btn btn--ghost" id="gateResend" type="button">በድጋሚ ላክ</button>
      <button class="btn btn--ghost" id="gateOut" type="button">ውጣ</button>
    </div>
  </div>
</main>`;

  document.getElementById('gateEmail').textContent = email || '';

  const msg = document.getElementById('gateMsg');
  const say = (text, ok) => {
    msg.textContent = text;
    msg.className = ok ? 'note small' : 'note note--red small';
    msg.style.display = 'block';
  };

  document.getElementById('gateDone').addEventListener('click', async () => {
    try {
      const ok = await Store.refreshVerification();
      if (ok) location.reload();
      else say('ገና አልተረጋገጠም። መልእክቱን ከከፈቱ በኋላ እንደገና ይሞክሩ።', false);
    } catch (e) { say(e.message, false); }
  });

  document.getElementById('gateResend').addEventListener('click', async () => {
    try {
      await Store.resendVerification();
      say('የማረጋገጫ መልእክት በድጋሚ ተልኳል።', true);
    } catch (e) { say(e.message, false); }
  });

  document.getElementById('gateOut').addEventListener('click', async () => {
    await Store.signOut();
    location.href = 'index.html';
  });

  // body was replaced, so the starfield script has to run again
  const sky = document.createElement('script');
  sky.src = 'assets/js/sky.js?gate=' + Date.now();
  document.body.appendChild(sky);
}

/* The sign-in form lives on the homepage now (index.html#signin);
   login.html is only a forwarding stub kept for old bookmarks. Sending
   people straight to the real form avoids a double redirect. */
const SIGN_IN_URL = 'index.html#signin';

/* Returns the signed-in, verified user, or null having already handled
   the failure (redirect, or the gate above). Callers guard on truthiness. */
export const requireAuth = async () => {
  await ready();
  if (!auth.currentUser) { location.href = SIGN_IN_URL; return null; }

  let user = null;
  try { user = await Store.current(); }
  catch (e) { location.href = SIGN_IN_URL; return null; }
  if (!user) { location.href = SIGN_IN_URL; return null; }

  if (!user.emailVerified) {
    paintVerificationGate(user.email);
    return null;
  }
  return user;
};
