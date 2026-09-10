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
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, getDocs, query, where, orderBy, increment, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* Bare specifiers, resolved by the import map in each page's <head>.
   This is the reason for the map: versioning these relatively would let
   a freshly-fetched store.js pull a stale config.js, which is exactly
   the staleness the cache-bust exists to prevent. */
import { firebaseConfig, CONSENT_VERSION } from '@config';
import { validateName, validateAge, validateEnrollableTrack, validatePassword,
         validateEmail, validateComment, TRACKS, isStaff } from '@validators';

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

/* A UI-only hint, so assets/js/nav.js can show a sign-out link on pages
   that must not load the Firebase SDK at all — privacy.html and
   terms.html are read by people who have not registered, and are linked
   from the consent gate.

   It is NOT a credential and must never gate anything. Forging it buys a
   visitor a sign-out link for a session they do not have. Access is
   decided by requireAuth() and firestore.rules, both of which ignore it.
   Written here because this callback is the single place in the codebase
   that learns whether someone is signed in. */
const SESSION_HINT = 'eotc.signedin';
const setSessionHint = (signedIn) => {
  try {
    if (signedIn) localStorage.setItem(SESSION_HINT, '1');
    else localStorage.removeItem(SESSION_HINT);
  } catch (e) { /* private mode; the link simply will not appear */ }
};

export const ready = () => {
  if (authKnown) return Promise.resolve(authUser);
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      onAuthStateChanged(auth, (u) => {
        authUser = u;
        authKnown = true;
        setSessionHint(!!u);
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

/* Set when the verification mail could not be sent during registration,
   so the gate can say so instead of implying a message is on its way. */
let lastVerificationError = null;

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
  /* A teacher's request to join. Created as 'pending_teacher' and nothing
     else — the rules refuse any other role at create, so approval is an
     admin's act rather than a registrant's claim. A pending account can
     read its own document and no student data at all. */
  async createTeacherRequest({ fullName, email, password, phone, subjects, parish, consentGiven }) {
    if (!consentGiven) throw new Error('ለመቀጠል ሁኔታዎቹን መቀበል ያስፈልጋል።');
    for (const check of [validateName(fullName), validateEmail(email), validatePassword(password)]) {
      if (!check.ok) throw new Error(check.message);
    }
    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new Error('የሚያስተምሩትን ትምህርት ቢያንስ አንድ ይምረጡ።');
    }
    if (!String(parish || '').trim()) throw new Error('የሚያገለግሉበትን ደብር ይጻፉ።');

    let cred;
    try { cred = await createUserWithEmailAndPassword(auth, email, password); }
    catch (e) { fail(e); }

    const uid = cred.user.uid;
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        role: 'pending_teacher',
        fullName: fullName.trim().replace(/\s+/g, ' '),
        /* cred.user.email, not the typed string. The rules pin this field
           to request.auth.token.email so an account cannot be registered
           under someone else's address, and Firebase normalises the case
           on the token — writing what was typed would fail the check for
           anyone who capitalises their own email. */
        email: cred.user.email,
        phone: String(phone || '').trim(),
        teachesSubjects: subjects,
        parish: String(parish).trim(),
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        consentGivenAt: serverTimestamp(),
        consentVersion: CONSENT_VERSION
      });
    } catch (e) { fail(e); }

    lastVerificationError = null;
    try { await sendEmailVerification(cred.user); }
    catch (e) {
      lastVerificationError = amharicError(e);
      console.error('sendEmailVerification failed:', e && e.code, e && e.message);
    }
    return this.current();
  },

  async createUser({ guardianName, email, password, studentName, age, track,
                     selectedSubjects, prepaidTerm = false, consentGiven }) {
    if (!TRACKS[track]) throw new Error('እባክዎ የትምህርት ክፍሉን ይምረጡ።');

    /* Bible is bought either by the month or as the whole three-month
       term at a discount; Zema is one flat price. `plan` records which,
       and the rules lock it after create — a student who could write it
       would buy the three-month term at the one-month price. There is no
       auto-renewal in either case: the term ends and the parent chooses
       again. */
    const plan = (track === 'bible' && prepaidTerm) ? 'term' : 'monthly';

    /* Consent is checked here as well as in the form, and required again by
       the rules on create, so an account cannot exist without a consent
       record attached to it. */
    if (!consentGiven) {
      throw new Error('ለመቀጠል የወላጅ/አሳዳጊ ማረጋገጫውን ምልክት ማድረግ ያስፈልጋል።');
    }

    for (const check of [
      validateName(guardianName),
      validateEmail(email),
      validatePassword(password),
      validateName(studentName),
      validateEnrollableTrack(track),
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
        // the normalised address off the credential — see the note in
        // createTeacherRequest; the rules compare this to the token
        email: cred.user.email,
        studentName: studentName.trim().replace(/\s+/g, ' '),
        age: Math.trunc(Number(age)),
        track,
        plan,
        /* What the parent actually enrolled in. Locked by the rules after
           create: a student who could edit it would open the curriculum
           for nothing — the same class of hole as writing your own plan.
           Adding a Zema subject later goes through requestSubjects(),
           which writes a REQUEST rather than this field. */
        selectedSubjects: Array.isArray(selectedSubjects) ? selectedSubjects : [],
        role: 'student',
        paid: false,
        verified: false,
        studySeconds: 0,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        /* serverTimestamp() rather than a client clock: the rules check
           consentGivenAt == request.time, so a browser cannot backdate
           when consent was given. consentVersion records WHICH text was
           agreed to, so a later policy change is detectable. */
        consentGivenAt: serverTimestamp(),
        consentVersion: CONSENT_VERSION
      });
    } catch (e) { fail(e); }

    /* The account exists whether or not the mail goes out, so a send
       failure must not fail registration — but it must not vanish
       either. Swallowing it silently leaves a parent staring at an
       empty inbox with nothing to act on. Record it, log the real code
       for diagnosis, and show it on the verification gate. */
    lastVerificationError = null;
    try {
      await sendEmailVerification(cred.user);
    } catch (e) {
      lastVerificationError = amharicError(e);
      console.error('sendEmailVerification failed:', e && e.code, e && e.message);
    }

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
    // cleared here as well as in the auth callback, so the sign-out link
    // disappears immediately rather than on the next page load
    setSessionHint(false);
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

  /* A lesson writes its progress doc twice and the two writes carry
     different shapes — the video half here, the quiz half below. Both
     merge, so neither erases the other. */
  async saveVideoCompletion(lessonId, coverage, sessionSeconds = 0, suspicious = false) {
    await ready();
    const u = auth.currentUser;
    if (!u) return null;

    const record = {
      videoCompleted: true,
      coverage: Math.min(1, Math.max(0, Number(coverage) || 0)),
      /* Wall clock actually spent on this lesson, stored next to coverage
         so a teacher can see the two side by side. `suspicious` is the
         comparison already made — high coverage in implausibly little
         time. It flags; it never blocks, and a determined client can
         simply omit it. See docs/PAYMENTS.md. */
      sessionSeconds: Math.max(0, Math.round(Number(sessionSeconds) || 0)),
      suspicious: !!suspicious,
      completedAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'users', u.uid, 'progress', lessonId), record, { merge: true });
    } catch (e) { fail(e); }
    return record;
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
    // merge, or this would wipe the videoCompleted/coverage half
    try { await setDoc(ref, record, { merge: true }); } catch (e) { fail(e); }
    return record;
  },

  /* Teachers confirm payment by hand. The rules allow this only for an
     admin, or for a teacher acting on a student assigned to them, so a
     student calling it gets a permission error rather than a free
     subscription — the check below is a courtesy message, not the
     security boundary. */
  async setPaid(uid, paid = true) {
    await ready();
    const me = await this.current();
    if (!isStaff(me && me.role)) {
      throw new Error('ክፍያ ማረጋገጥ የሚችሉት መምህራን ብቻ ናቸው።');
    }
    try {
      await updateDoc(doc(db, 'users', uid), { paid: !!paid });
    } catch (e) { fail(e); }
    return !!paid;
  },

  /* Raises a deletion request for a teacher to action. It does NOT delete
     anything, and must not: the rules refuse client deletes on purpose,
     because a mis-fired script in a browser must not be able to erase a
     child's record — or, worse, someone else's.

     The document id is the uid, so a parent cannot flood the collection
     and a teacher can find the account directly. */
  async requestDeletion(reason = '') {
    await ready();
    const u = auth.currentUser;
    if (!u) throw new Error('መጀመሪያ ይግቡ።');
    try {
      await setDoc(doc(db, 'deletionRequests', u.uid), {
        uid: u.uid,
        email: u.email || '',
        reason: String(reason).slice(0, 500),
        status: 'pending',
        requestedAt: serverTimestamp()
      });
    } catch (e) { fail(e); }
    return true;
  },

  async deletionRequestStatus() {
    await ready();
    const u = auth.currentUser;
    if (!u) return null;
    try {
      const snap = await getDoc(doc(db, 'deletionRequests', u.uid));
      return snap.exists() ? snap.data() : null;
    } catch (e) { return null; }
  },

  /* ---------------- teachers and approval ---------------- */

  /* A teacher's own class. Scoped by assignedTeacher, which is the same
     constraint the rules enforce — a query for anyone else's students is
     refused by the server, not merely absent from the UI. */
  async myStudents() {
    await ready();
    const u = auth.currentUser;
    if (!u) return [];
    let snaps;
    try {
      snaps = await getDocs(query(
        collection(db, 'users'),
        where('assignedTeacher', '==', u.uid)
      ));
    } catch (e) { fail(e); }
    const out = [];
    for (const d of snaps.docs) {
      out.push({ ...d.data(), uid: d.id, progress: await this.progressOf(d.id).catch(() => ({})) });
    }
    return out;
  },

  async teachersByRole(role) {
    const me = await this.current();
    if (!me || me.role !== 'admin') throw new Error('ይህን ማየት የሚችሉት አስተዳዳሪ ብቻ ናቸው።');
    let snaps;
    try { snaps = await getDocs(query(collection(db, 'users'), where('role', '==', role))); }
    catch (e) { fail(e); }
    return snaps.docs.map(d => ({ ...d.data(), uid: d.id }));
  },

  /* Every outstanding "add a Zema subject" request. Admin only — the
     rules let a teacher read one belonging to their own student, but the
     unfiltered LIST is refused for anyone but an admin. */
  async allSubjectRequests() {
    const me = await this.current();
    if (!me || me.role !== 'admin') throw new Error('ይህን ማየት የሚችሉት አስተዳዳሪ ብቻ ናቸው።');
    try {
      const snaps = await getDocs(collection(db, 'subjectRequests'));
      return snaps.docs.map(d => ({ ...d.data(), uid: d.id }));
    } catch (e) { return []; }
  },

  /* Approval requires the subjects and parish to be confirmed, so it
     cannot be a single careless tap — see the two-step in admin.html.
     approvedBy/approvedAt record who let them in. */
  async approveTeacher(uid, { subjects, parish }) {
    const me = await this.current();
    if (!me || me.role !== 'admin') throw new Error('መምህራንን ማጽደቅ የሚችሉት አስተዳዳሪ ብቻ ናቸው።');
    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new Error('ቢያንስ አንድ ትምህርት መመደብ ያስፈልጋል።');
    }
    if (!String(parish || '').trim()) throw new Error('ደብሩን ያረጋግጡ።');
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: 'teacher',
        teachesSubjects: subjects,
        parish: String(parish).trim(),
        approvedBy: me.uid,
        approvedAt: serverTimestamp()
      });
    } catch (e) { fail(e); }
    return true;
  },

  /* Rejection keeps the record. A history of who asked is worth more than
     a tidy collection, and deleting it would lose the fact that a request
     was ever considered. */
  async rejectTeacher(uid, reason = '') {
    const me = await this.current();
    if (!me || me.role !== 'admin') throw new Error('ይህን ማድረግ የሚችሉት አስተዳዳሪ ብቻ ናቸው።');
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: 'rejected',
        rejectedReason: String(reason).slice(0, 300),
        approvedBy: me.uid,
        approvedAt: serverTimestamp()
      });
    } catch (e) { fail(e); }
    return true;
  },

  async assignStudent(studentUid, teacherUid) {
    const me = await this.current();
    if (!me || me.role !== 'admin') throw new Error('ተማሪ መመደብ የሚችሉት አስተዳዳሪ ብቻ ናቸው።');
    try { await updateDoc(doc(db, 'users', studentUid), { assignedTeacher: teacherUid || null }); }
    catch (e) { fail(e); }
    return true;
  },

  /* Deactivating a teacher without deleting their record.

     `active: false` is enforced by the RULES, not by hiding a page. A
     teacher whose role still reads 'teacher' can call Firestore from a
     browser console, so a deactivation that only greys out the dashboard
     revokes nothing at all. myRole() returns '' for an inactive account,
     which drops teacher and admin powers together. */
  async setActive(uid, active) {
    const me = await this.current();
    if (!me || me.role !== 'admin') throw new Error('ይህን ማድረግ የሚችሉት አስተዳዳሪ ብቻ ናቸው።');
    if (uid === me.uid) throw new Error('የራስዎን መለያ ማገድ አይችሉም።');
    try { await updateDoc(doc(db, 'users', uid), { active: !!active }); }
    catch (e) { fail(e); }
    return !!active;
  },

  /* ---------------- money ----------------

     The financial record lives in /payments/{uid}, NOT on the child's
     document. A parish may have to keep receipts for years; COPPA argues
     for deleting a child's record promptly. Those are only both
     satisfiable if the two are separable, so a payment record is about
     the PARENT — their name, their email, what they paid — and the
     child's document keeps only the access grant (`paid`, `paidUntil`).
     See docs/RETENTION.md §6.

     Three writes, in this order on purpose:

       1. the access grant, so the family gets what they paid for
       2. the immutable receipt
       3. the running summary

     If step 2 or 3 fails, the family still has the access they paid for
     and the parish is missing a line in its books — a bookkeeping gap a
     teacher can fix. The other order leaves a parent who has handed over
     $105 with a locked account, which is the worse failure. */
  async recordPayment(uid, { amountPaid, paidUntil, subjects, guardianName, email,
                             kind = 'term' }) {
    const me = await this.current();
    if (!isStaff(me && me.role)) {
      throw new Error('ክፍያ ማረጋገጥ የሚችሉት መምህራን ብቻ ናቸው።');
    }
    const amount = Math.max(0, Number(amountPaid) || 0);
    const subs = Array.isArray(subjects) ? subjects : [];

    const grant = { paid: true };
    if (paidUntil) grant.paidUntil = paidUntil;          // 'YYYY-MM-DD'
    if (Array.isArray(subjects)) grant.selectedSubjects = subs;
    try { await updateDoc(doc(db, 'users', uid), grant); }
    catch (e) { fail(e); }

    await this._recordReceipt(uid, {
      amount, periodUntil: paidUntil || '', subjects: subs, kind,
      guardianName, email, me
    });
    return true;
  },

  /* The receipt and the summary. Separated out because adding a Zema
     subject later takes the same two writes without touching `paid` or
     `paidUntil` — an add-on buys curriculum, not more time. */
  async _recordReceipt(uid, { amount, periodUntil, subjects, kind, guardianName, email, me }) {
    try {
      await addDoc(collection(db, 'payments', uid, 'entries'), {
        amount,
        at: serverTimestamp(),
        periodUntil: periodUntil || '',
        subjects: subjects || [],
        kind,
        recordedBy: me.uid,
        recordedByName: me.fullName || me.guardianName || ''
      });
    } catch (e) { fail(e); }

    const summary = {
      uid,
      totalPaid: increment(amount),
      lastAmount: amount,
      lastPaidAt: serverTimestamp(),
      recordedBy: me.uid,
      recordedByName: me.fullName || me.guardianName || ''
    };
    /* The parent's identity is copied onto the payment record on purpose.
       After the child's document is deleted this has to still say who
       paid, or it is not a financial record — and it must say so WITHOUT
       carrying the child's name, age or scores alongside. */
    if (guardianName) summary.guardianName = guardianName;
    if (email) summary.email = email;
    if (periodUntil) summary.lastPaidUntil = periodUntil;

    try { await setDoc(doc(db, 'payments', uid), summary, { merge: true }); }
    catch (e) { fail(e); }
    return true;
  },

  /* What a family has been charged. The parent can read their own; a
     teacher only their own students'. */
  async paymentOf(uid) {
    try {
      const snap = await getDoc(doc(db, 'payments', uid));
      return snap.exists() ? snap.data() : null;
    } catch (e) { return null; }
  },

  async paymentHistory(uid) {
    try {
      const snaps = await getDocs(query(
        collection(db, 'payments', uid, 'entries'), orderBy('at', 'desc')
      ));
      return snaps.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (e) { return []; }
  },

  /* Remedial support, and the parent can see it.

     A teacher's judgement that a child is struggling is recorded on the
     child's record, so it is shown on the child's own dashboard with the
     date. A family finding out by accident that their child was flagged
     is worse than the flag. */
  async setRemedial(uid, on, teacherName = '') {
    const me = await this.current();
    if (!isStaff(me && me.role)) throw new Error('ይህን ማድረግ የሚችሉት መምህራን ብቻ ናቸው።');
    const patch = on
      ? { remedial: true, remedialSince: serverTimestamp(), remedialBy: teacherName || me.fullName || '' }
      : { remedial: false };
    try { await updateDoc(doc(db, 'users', uid), patch); }
    catch (e) { fail(e); }
    return !!on;
  },

  /* ---------------- comments on a child ----------------

     Bounded, attributed, and readable by the parent. The rules pin `by`
     to the writer's own uid and `at` to the server clock, so a note
     cannot be attributed to another teacher or backdated, and they
     forbid updates outright — a note a parent has already read must not
     change underneath them. A correction is a new note. */
  async addComment(uid, text) {
    const me = await this.current();
    if (!isStaff(me && me.role)) throw new Error('አስተያየት መጻፍ የሚችሉት መምህራን ብቻ ናቸው።');
    const check = validateComment(text);
    if (!check.ok) throw new Error(check.message);
    try {
      await addDoc(collection(db, 'users', uid, 'comments'), {
        by: me.uid,
        byName: me.fullName || me.guardianName || '',
        text: String(text).trim(),
        at: serverTimestamp()
      });
    } catch (e) { fail(e); }
    return true;
  },

  async commentsFor(uid) {
    try {
      const snaps = await getDocs(query(
        collection(db, 'users', uid, 'comments'), orderBy('at', 'desc')
      ));
      return snaps.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (e) { return []; }
  },

  async deleteComment(uid, commentId) {
    try { await deleteDoc(doc(db, 'users', uid, 'comments', commentId)); }
    catch (e) { fail(e); }
    return true;
  },

  /* ---------------- adding Zema subjects later ----------------

     A parent asks; a teacher fulfils it once the $10 per subject is
     actually paid. The parent never writes selectedSubjects — that is
     the whole reason this collection exists rather than a checkbox that
     edits the field directly. */
  async requestSubjects(subjects) {
    await ready();
    const u = auth.currentUser;
    if (!u) throw new Error('መጀመሪያ ይግቡ።');
    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new Error('ቢያንስ አንድ ትምህርት ይምረጡ።');
    }
    try {
      await setDoc(doc(db, 'subjectRequests', u.uid), {
        uid: u.uid,
        subjects,
        status: 'pending',
        requestedAt: serverTimestamp()
      });
    } catch (e) { fail(e); }
    return true;
  },

  async subjectRequestOf(uid) {
    try {
      const snap = await getDoc(doc(db, 'subjectRequests', uid));
      return snap.exists() ? snap.data() : null;
    } catch (e) { return null; }
  },

  async mySubjectRequest() {
    await ready();
    const u = auth.currentUser;
    return u ? this.subjectRequestOf(u.uid) : null;
  },

  /* Fulfilling one is two writes and they are NOT a transaction: the
     subjects land on the student first, so a failure between them leaves
     the parent with what they paid for and the request still in the
     queue. The other order would take the request off the queue and give
     them nothing. */
  async fulfilSubjectRequest(uid, subjects, { amount = 0, guardianName, email } = {}) {
    const me = await this.current();
    if (!isStaff(me && me.role)) throw new Error('ይህን ማድረግ የሚችሉት መምህራን ብቻ ናቸው።');

    try { await updateDoc(doc(db, 'users', uid), { selectedSubjects: subjects }); }
    catch (e) { fail(e); }

    /* An add-on buys curriculum, not more time, so paid/paidUntil are
       untouched — a $10 subject must not quietly extend a term. */
    if (Number(amount) > 0) {
      await this._recordReceipt(uid, {
        amount: Number(amount), periodUntil: '', subjects,
        kind: 'subject-addon', guardianName, email, me
      });
    }

    try { await deleteDoc(doc(db, 'subjectRequests', uid)); }
    catch (e) { /* the subjects are theirs; a stale request is harmless */ }
    return true;
  },

  /* ---------------- consent ----------------

     CONSENT_VERSION moves when privacy.html or terms.html change in
     substance, and every existing parent's recorded version stops
     matching. That is the mechanism working — but it has to lead
     somewhere, or a stale version is just a field nobody looks at.

     Agreeing writes an immutable record under the parent's own document,
     one per version, server-stamped. Only then may the cached
     consentVersion on the user doc move forward; the rules check that the
     record exists before allowing it. The record is the evidence, the
     field is the fast path. */
  async recordConsent(version) {
    await ready();
    const u = auth.currentUser;
    if (!u) throw new Error('መጀመሪያ ይግቡ።');
    if (!version) throw new Error('የመመሪያው እትም አልታወቀም።');

    try {
      await setDoc(doc(db, 'users', u.uid, 'consents', version), {
        version,
        at: serverTimestamp()
      });
    } catch (e) { fail(e); }

    /* Best effort. The consent is already recorded and that is what
       matters legally; this only saves the extra read on future page
       loads, so a failure here must not tell the parent their agreement
       did not register. */
    try { await updateDoc(doc(db, 'users', u.uid), { consentVersion: version }); }
    catch (e) { /* the record stands; the cache catches up next time */ }
    return true;
  },

  async hasConsented(version) {
    await ready();
    const u = auth.currentUser;
    if (!u || !version) return false;
    try {
      const snap = await getDoc(doc(db, 'users', u.uid, 'consents', version));
      return snap.exists();
    } catch (e) { return false; }
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

  // if the mail never went out, say so rather than telling them to wait
  if (lastVerificationError) {
    const m = document.getElementById('gateMsg');
    m.textContent = 'የማረጋገጫ መልእክቱ አልተላከም፦ ' + lastVerificationError + ' — «በድጋሚ ላክ» ይሞክሩ።';
    m.className = 'note note--red small';
    m.style.display = 'block';
  }

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

/* Where an account belongs after signing in. One sign-in for everyone and
   no role picker on the form: a selector tells an attacker which roles
   exist and invites them to try one. */
export function homeFor(user) {
  if (!user) return SIGN_IN_URL;
  switch (user.role) {
    case 'admin':   return 'admin.html';
    case 'teacher': return 'teacher.html';
    default:        return 'dashboard.html';   // students, and any waiting state
  }
}

/* Access has an end date but is NOT a lockout. A term that has finished
   closes new lessons; it never hides what a child already earned. Losing
   your certificates because your parents ran out of money is the wrong
   lesson from a church school. */
export function accessActive(user) {
  if (!user || !user.paid) return false;
  if (!user.paidUntil) return true;               // paid with no end recorded
  const until = typeof user.paidUntil === 'string'
    ? new Date(user.paidUntil + 'T23:59:59')
    : new Date(toMillis(user.paidUntil));
  return !isNaN(until) && until.getTime() >= Date.now();
}

export const accessExpired = (user) => !!(user && user.paid && !accessActive(user));

/* Shown when the policy a parent agreed to is no longer the policy in
   force. They read the new text and agree again, or they sign out —
   there is no third button, because carrying on silently under a policy
   nobody agreed to is the thing CONSENT_VERSION exists to prevent.

   Deliberately not dismissible and deliberately not a banner. A parent
   who can click past it has not consented, and the record would then say
   they did. */
function paintConsentGate(user) {
  document.body.innerHTML = `
<canvas id="sky"></canvas>
<div class="harag"></div>
<main class="shell section" style="max-width:560px">
  <div class="panel">
    <p class="eyebrow">ማረጋገጫ ያስፈልጋል</p>
    <h1 style="font-size:1.7rem;margin:0 0 10px">መመሪያችን ተሻሽሏል</h1>
    <p class="muted small" style="margin:0 0 14px">
      የግላዊነት መመሪያውና የአገልግሎት ሁኔታዎቹ ከተስማሙበት ጊዜ ወዲህ ተለውጠዋል።
      ከመቀጠልዎ በፊት እባክዎ አዲሱን ጽሑፍ አንብበው እንደተቀበሉት ያረጋግጡ።
    </p>
    <p class="muted small" style="margin:0 0 6px">
      የተስማሙበት እትም፦ <b>${user.consentVersion || 'አልተመዘገበም'}</b><br>
      አሁን ያለው እትም፦ <b>${CONSENT_VERSION}</b>
    </p>
    <p class="help" style="margin:0 0 16px">
      <a href="privacy.html" target="_blank" rel="noopener">የግላዊነት መመሪያ</a> ·
      <a href="terms.html" target="_blank" rel="noopener">የአገልግሎት ሁኔታዎች</a>
    </p>
    <label class="consent-row" for="reconsent" style="display:flex;gap:10px;align-items:flex-start">
      <input type="checkbox" id="reconsent">
      <span>አዲሱን የግላዊነት መመሪያና የአገልግሎት ሁኔታዎች አንብቤ ተቀብያለሁ።</span>
    </label>
    <p id="consentMsg" class="note note--red small" style="display:none;margin-top:12px"></p>
    <div class="row" style="margin-top:16px">
      <button class="btn btn--gold" id="consentGo" type="button">ተቀብያለሁ — ቀጥል</button>
      <button class="btn btn--ghost" id="consentOut" type="button">ውጣ</button>
    </div>
  </div>
</main>`;

  const msg = document.getElementById('consentMsg');
  document.getElementById('consentGo').addEventListener('click', async () => {
    if (!document.getElementById('reconsent').checked) {
      msg.textContent = 'ለመቀጠል ማረጋገጫውን ምልክት ማድረግ ያስፈልጋል።';
      msg.style.display = 'block';
      return;
    }
    try {
      await Store.recordConsent(CONSENT_VERSION);
      location.reload();
    } catch (e) {
      msg.textContent = e.message;
      msg.style.display = 'block';
    }
  });
  document.getElementById('consentOut').addEventListener('click', async () => {
    await Store.signOut();
    location.href = 'index.html';
  });

  const sky = document.createElement('script');
  sky.src = 'assets/js/sky.js?consent=' + Date.now();
  document.body.appendChild(sky);
}

/* Painted over the page for an account that is waiting on approval, or
   has been refused. It deliberately shows NOTHING else — no preview, no
   partial roster. An unapproved account is a stranger until an admin
   says otherwise. */
function paintRolePanel({ title, body, showSignOut = true }) {
  document.body.innerHTML = `
<canvas id="sky"></canvas>
<div class="harag"></div>
<main class="shell section" style="max-width:520px">
  <div class="panel">
    <p class="eyebrow">ፍኖተ ያሬድ</p>
    <h1 style="font-size:1.7rem;margin:0 0 10px">${title}</h1>
    <p class="muted small" style="margin:0 0 16px">${body}</p>
    ${showSignOut ? '<button class="btn btn--ghost" id="rolePanelOut" type="button">ውጣ</button>' : ''}
  </div>
</main>`;
  const out = document.getElementById('rolePanelOut');
  if (out) out.addEventListener('click', async () => {
    await Store.signOut();
    location.href = 'index.html';
  });
  const sky = document.createElement('script');
  sky.src = 'assets/js/sky.js?panel=' + Date.now();
  document.body.appendChild(sky);
}

/* The enrollment gate, in order: signed in -> verified -> paid.

   Returns the user, or null having already handled the failure itself
   (redirect, or the verification gate above). Callers guard on
   truthiness and render nothing when it is null.

   Pass { requirePaid: true } on anything behind the paywall. The free
   preview lesson passes false, so a parent can watch one whole lesson
   before deciding — see docs/PAYMENTS.md for why the lock is UX rather
   than enforcement. */
export const requireAuth = async ({ requirePaid = false } = {}) => {
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

  /* The policy they agreed to versus the policy in force. Checked before
     anything renders, so nobody carries on under a version they never
     saw. The cached field is the fast path; when it is stale we pay one
     read to see whether they have already agreed and the field simply
     has not caught up. */
  if (user.consentVersion !== CONSENT_VERSION) {
    const already = await Store.hasConsented(CONSENT_VERSION);
    if (already) {
      // self-heal the cache so this costs a read once, not every load
      try { await updateDoc(doc(db, 'users', user.uid), { consentVersion: CONSENT_VERSION }); }
      catch (e) { /* the record stands either way */ }
      user.consentVersion = CONSENT_VERSION;
    } else {
      paintConsentGate(user);
      return null;
    }
  }

  /* A waiting or refused teacher gets a panel and nothing else. This is
     checked before any page renders, so no student data reaches an
     unapproved account even for the instant before a redirect. */
  if (user.role === 'pending_teacher') {
    paintRolePanel({
      title: 'ጥያቄዎ በመታየት ላይ ነው',
      body: 'የመምህርነት ጥያቄዎ ደርሶናል። አስተዳዳሪው እስኪያጸድቀው ድረስ ወደ ተማሪዎች መረጃ መድረስ አይችሉም። ' +
            'ሲጸድቅ በኢሜይል እናሳውቅዎታለን።'
    });
    return null;
  }
  if (user.role === 'rejected') {
    paintRolePanel({
      title: 'ጥያቄዎ አልተቀበለም',
      body: (user.rejectedReason ? `ምክንያት፦ ${user.rejectedReason} ` : '') +
            'ጥያቄ ካለዎት ትምህርት ቤቱን ያግኙ።'
    });
    return null;
  }

  /* A deactivated account. The rules have already dropped every power
     this account had — myRole() returns '' for it — so this panel is
     the explanation, not the enforcement. Without it a suspended teacher
     would meet a bare permission error and assume the site was broken. */
  if (user.active === false) {
    paintRolePanel({
      title: 'መለያዎ ታግዷል',
      body: 'ይህ መለያ ለጊዜው ተዘግቷል። መዝገብዎ አልተሰረዘም። ጥያቄ ካለዎት ትምህርት ቤቱን ያግኙ።'
    });
    return null;
  }

  /* Expiry closes new lessons, not the account. requirePaid is passed by
     lesson.html; the dashboard never passes it, so a family whose term
     has ended still sees and can download everything they earned. */
  if (requirePaid && !accessActive(user)) {
    location.href = 'billing.html';
    return null;
  }

  return user;
};
