/* Rules tests, run against the Firestore emulator.

     cd tools && npm run test:rules

   These exist because "verify it in the playground" is a manual step
   nobody repeats after the third time. Every acceptance item that says
   "verify in the rules playground" is asserted here instead, so a change
   that reopens a hole fails a command rather than passing unnoticed.

   This directory is the npm exception in CLAUDE.md: local operator
   tooling that never reaches a browser. */

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs,
  query, where, serverTimestamp
} from 'firebase/firestore';

let pass = 0, fail = 0;
const t = async (label, fn) => {
  try { await fn(); pass++; console.log(`  ok    ${label}`); }
  catch (e) { fail++; console.log(`  FAIL  ${label}\n        ${e.message.split('\n')[0]}`); }
};

const env = await initializeTestEnvironment({
  projectId: 'finote-yared',
  firestore: {
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    host: '127.0.0.1',
    port: 8080
  }
});

/* The token carries `email` as well as `email_verified`, because the
   create rule pins the document's email field to the token's — an
   account cannot be registered under somebody else's address. */
const EMAIL = (uid) => `${uid}@example.org`;
const AS = (uid, verifiedEmail = true) =>
  env.authenticatedContext(uid, { email_verified: verifiedEmail, email: EMAIL(uid) }).firestore();
const ANON = () => env.unauthenticatedContext().firestore();

const CV = '2026-09-08';

/* Seed through the admin backdoor so the fixtures themselves are not
   subject to the rules under test. */
async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/student1'), {
      uid: 'student1', role: 'student', studentName: 'Sara T', age: 10,
      guardianName: 'Tesfaye G', email: EMAIL('student1'),
      track: 'bible', plan: 'monthly', selectedSubjects: ['amestu'],
      paid: false, studySeconds: 100, verified: true,
      assignedTeacher: 'teacher1', consentVersion: CV
    });
    await setDoc(doc(db, 'users/student2'), {
      uid: 'student2', role: 'student', studentName: 'Nati A', age: 11,
      email: EMAIL('student2'), track: 'bible', plan: 'term',
      selectedSubjects: ['amestu'], paid: false, studySeconds: 0, verified: true,
      assignedTeacher: 'teacher2', consentVersion: CV
    });
    await setDoc(doc(db, 'users/teacher1'), {
      uid: 'teacher1', role: 'teacher', fullName: 'Memhir D',
      email: EMAIL('teacher1'), parish: 'Debre Selam',
      teachesSubjects: ['amestu'], verified: true
    });
    await setDoc(doc(db, 'users/teacher2'), {
      uid: 'teacher2', role: 'teacher', fullName: 'Memhir S',
      email: EMAIL('teacher2'), verified: true
    });
    // an approved teacher who has since been deactivated
    await setDoc(doc(db, 'users/teacher3'), {
      uid: 'teacher3', role: 'teacher', fullName: 'Memhir X',
      email: EMAIL('teacher3'), verified: true, active: false
    });
    await setDoc(doc(db, 'users/student3'), {
      uid: 'student3', role: 'student', studentName: 'Hana B', age: 9,
      email: EMAIL('student3'), track: 'bible', plan: 'monthly',
      selectedSubjects: ['amestu'], paid: false, studySeconds: 0, verified: true,
      assignedTeacher: 'teacher3', consentVersion: CV
    });
    await setDoc(doc(db, 'users/pending1'), {
      uid: 'pending1', role: 'pending_teacher', fullName: 'Memhir P',
      email: EMAIL('pending1'), verified: true
    });
    await setDoc(doc(db, 'users/rejected1'), {
      uid: 'rejected1', role: 'rejected', fullName: 'Memhir R',
      email: EMAIL('rejected1'), verified: true
    });
    await setDoc(doc(db, 'users/admin1'), {
      uid: 'admin1', role: 'admin', fullName: 'Bereket',
      email: EMAIL('admin1'), verified: true
    });
    await setDoc(doc(db, 'users/student1/progress/l1'), { done: true, score: 2, of: 3 });
    await setDoc(doc(db, 'users/student1/comments/c1'), {
      by: 'teacher1', byName: 'Memhir D', text: 'Doing well.', at: new Date()
    });
  });
}

console.log('\n=== acceptance 9 + 10: nobody writes their own role ===');
await seed();
await t('a student cannot promote themselves to teacher', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'), { role: 'teacher' })));
await t('a student cannot promote themselves to admin', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'), { role: 'admin' })));
await t('a teacher cannot promote themselves to admin', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/teacher1'), { role: 'admin' })));
await t('a pending teacher cannot approve themselves', () =>
  assertFails(updateDoc(doc(AS('pending1'), 'users/pending1'), { role: 'teacher' })));
await t('a rejected teacher cannot re-approve themselves', () =>
  assertFails(updateDoc(doc(AS('rejected1'), 'users/rejected1'), { role: 'teacher' })));
await t('an admin CAN approve a teacher', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/pending1'), { role: 'teacher' })));

/* CLAUDE.md: an admin is made by hand in the Firebase console, and the
   rules deliberately refuse to mint one from a browser. That binds
   admins too — an admin session is one stolen laptop away from a second
   permanent admin, and approving a teacher never needs the power. */
console.log('\n=== no browser session can mint an admin ===');
await seed();
await t('an admin CANNOT promote a teacher to admin', () =>
  assertFails(updateDoc(doc(AS('admin1'), 'users/teacher1'), { role: 'admin' })));
await t('an admin CANNOT promote a student to admin', () =>
  assertFails(updateDoc(doc(AS('admin1'), 'users/student1'), { role: 'admin' })));
await t('an admin CANNOT promote a pending teacher straight to admin', () =>
  assertFails(updateDoc(doc(AS('admin1'), 'users/pending1'), { role: 'admin' })));
/* Writing the value a field ALREADY holds is not a change: diff()
   reports no affected key, so the write is a no-op and is allowed. That
   is true of every locked field, and it grants nothing — an admin who is
   already an admin re-stamping 'admin' on themselves has changed nothing.
   Documented here so the next reader does not mistake it for a hole. */
await t('an admin re-stamping their OWN existing role is a harmless no-op', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/admin1'), { role: 'admin' })));
await t('an admin CAN reject a teacher', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/pending1'),
    { role: 'rejected', rejectedReason: 'not known to the parish' })));
await t('an admin CAN demote a teacher to rejected', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/teacher2'), { role: 'rejected' })));

console.log('\n=== acceptance 10: registration cannot mint privilege ===');
const newStudent = {
  uid: 'newbie', role: 'student', studentName: 'New Child', age: 9,
  guardianName: 'A Parent', email: EMAIL('newbie'),
  track: 'bible', plan: 'monthly', selectedSubjects: ['amestu'],
  paid: false, studySeconds: 0,
  consentVersion: CV, consentGivenAt: serverTimestamp()
};
const newTeacher = {
  uid: 'newbie', role: 'pending_teacher', fullName: 'Some Teacher',
  email: EMAIL('newbie'), phone: '+1000', teachesSubjects: ['amestu'],
  parish: 'Debre Selam', consentVersion: CV, consentGivenAt: serverTimestamp()
};
await seed();
await t('registering as a student is allowed', () =>
  assertSucceeds(setDoc(doc(AS('newbie'), 'users/newbie'), newStudent)));
await seed();
await t('registering as a teacher request is allowed', () =>
  assertSucceeds(setDoc(doc(AS('newbie'), 'users/newbie'), newTeacher)));
await seed();
await t('registering directly as teacher is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, role: 'teacher' })));
await t('registering directly as admin is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, role: 'admin' })));
await t('registering already paid is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, paid: true })));
await t('registering with banked study time is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, studySeconds: 9999 })));
await t('registering while assigning yourself a teacher is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, assignedTeacher: 'teacher1' })));
await t('registering without a consent record is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'),
    { uid: 'newbie', role: 'student', paid: false, studySeconds: 0 })));
await t('registering under someone ELSE\'S email is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'),
    { ...newStudent, email: 'victim@example.org' })));

/* The create rule pins an exact key set. Without that, a registrant owns
   their document at creation and can attach anything the update rules
   would later refuse — the update rules never see those fields, because
   they were present from the very first write. */
console.log('\n=== registration cannot smuggle fields past the update rules ===');
for (const [field, value] of [
  ['paidUntil', '2099-01-01'],
  ['amountPaid', 0],
  ['unlockedLessons', ['l2', 'l3', 'l4']],
  ['badges', ['everything']],
  ['approvedBy', 'admin1'],
  ['remedial', false],
  ['active', true]
]) {
  await seed();
  await t(`registering with ${field} attached is REFUSED`, () =>
    assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, [field]: value })));
}
await seed();
await t('a teacher request cannot forge its own approval', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'),
    { ...newTeacher, approvedBy: 'admin1', approvedAt: serverTimestamp() })));
await t('a teacher request cannot arrive with a paid term', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'),
    { ...newTeacher, paidUntil: '2099-01-01' })));

console.log('\n=== acceptance 5: a student cannot buy themselves anything ===');
await seed();
for (const [field, value] of [
  ['selectedSubjects', ['amestu', 'sirate', 'meshaftarik', 'betekrtarik', 'sinemigbar']],
  ['amountPaid', 999],
  ['paidUntil', '2099-01-01'],
  ['paid', true],
  ['plan', 'term'],
  ['tier', 'zema'],
  ['track', 'zema'],
  ['unlockedLessons', ['l2', 'l3']],
  ['badges', ['everything']],
  ['assignedTeacher', 'teacher2'],
  ['active', true],
  ['remedial', false],
  ['consentVersion', 'anything']
]) {
  await t(`a student cannot write their own ${field}`, () =>
    assertFails(updateDoc(doc(AS('student1'), 'users/student1'), { [field]: value })));
}
// documented for the next reader: re-writing an identical value is a
// no-op that affectedKeys() does not report, and is harmless
await t('re-writing the SAME plan value is a harmless no-op', () =>
  assertSucceeds(updateDoc(doc(AS('student1'), 'users/student1'), { plan: 'monthly' })));
await t('a student CAN still fix their own name', () =>
  assertSucceeds(updateDoc(doc(AS('student1'), 'users/student1'), { studentName: 'Sara Tesfaye' })));
await t('studySeconds may rise by a normal flush', () =>
  assertSucceeds(updateDoc(doc(AS('student1'), 'users/student1'), { studySeconds: 130 })));
await t('studySeconds cannot jump by an hour', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'), { studySeconds: 3700 })));
await t('studySeconds cannot go backwards', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'), { studySeconds: 5 })));

console.log('\n=== acceptance 8: a pending teacher reads NOTHING ===');
await seed();
await t('pending teacher can read their own doc', () =>
  assertSucceeds(getDoc(doc(AS('pending1'), 'users/pending1'))));
await t('pending teacher CANNOT read a student', () =>
  assertFails(getDoc(doc(AS('pending1'), 'users/student1'))));
await t('pending teacher CANNOT list the roster', () =>
  assertFails(getDocs(query(collection(AS('pending1'), 'users'), where('role', '==', 'student')))));
await t('pending teacher CANNOT list by assignedTeacher either', () =>
  assertFails(getDocs(query(collection(AS('pending1'), 'users'),
    where('assignedTeacher', '==', 'pending1')))));
await t('pending teacher CANNOT read a student progress doc', () =>
  assertFails(getDoc(doc(AS('pending1'), 'users/student1/progress/l1'))));
await t('pending teacher CANNOT read a comment about a child', () =>
  assertFails(getDoc(doc(AS('pending1'), 'users/student1/comments/c1'))));
await t('a REJECTED teacher reads their own doc and nothing else', () =>
  assertSucceeds(getDoc(doc(AS('rejected1'), 'users/rejected1'))));
await t('a rejected teacher CANNOT read a student', () =>
  assertFails(getDoc(doc(AS('rejected1'), 'users/student1'))));
await t('an anonymous stranger reads nothing', () =>
  assertFails(getDoc(doc(ANON(), 'users/student1'))));

console.log('\n=== acceptance 11: a teacher reads only their own students ===');
await seed();
await t('teacher1 reads their assigned student', () =>
  assertSucceeds(getDoc(doc(AS('teacher1'), 'users/student1'))));
await t('teacher1 CANNOT read another teacher\'s student', () =>
  assertFails(getDoc(doc(AS('teacher1'), 'users/student2'))));
await t('teacher1 reads their student\'s progress', () =>
  assertSucceeds(getDoc(doc(AS('teacher1'), 'users/student1/progress/l1'))));
await t('teacher1 CANNOT read another teacher\'s student progress', () =>
  assertFails(getDoc(doc(AS('teacher1'), 'users/student2/progress/l1'))));
await t('teacher1 CANNOT list the whole roster unscoped', () =>
  assertFails(getDocs(collection(AS('teacher1'), 'users'))));
await t('teacher1 CAN list students scoped to themselves', () =>
  assertSucceeds(getDocs(query(collection(AS('teacher1'), 'users'),
    where('assignedTeacher', '==', 'teacher1')))));
await t('teacher1 CANNOT list students scoped to someone else', () =>
  assertFails(getDocs(query(collection(AS('teacher1'), 'users'),
    where('assignedTeacher', '==', 'teacher2')))));

console.log('\n=== acceptance 12: a teacher cannot escalate ===');
await seed();
// the ACCESS GRANT only — the money goes to /payments/{uid}, asserted
// in its own section below
await t('teacher CAN confirm payment for their own student', () =>
  assertSucceeds(updateDoc(doc(AS('teacher1'), 'users/student1'),
    { paid: true, paidUntil: '2026-12-07' })));
await t('teacher CANNOT confirm payment for another teacher\'s student', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student2'), { paid: true })));
await t('teacher CANNOT approve another teacher', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/pending1'), { role: 'teacher' })));
await t('teacher CANNOT make their student an admin', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { role: 'admin' })));
await t('teacher CANNOT reassign a student to themselves', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student2'), { assignedTeacher: 'teacher1' })));
await t('teacher CAN unlock a lesson for their student', () =>
  assertSucceeds(updateDoc(doc(AS('teacher1'), 'users/student1'), { unlockedLessons: ['l2'] })));
await t('teacher CAN record remedial support', () =>
  assertSucceeds(updateDoc(doc(AS('teacher1'), 'users/student1'),
    { remedial: true, remedialSince: serverTimestamp(), remedialBy: 'Memhir D' })));
await t('teacher CAN set the subjects they were paid for', () =>
  assertSucceeds(updateDoc(doc(AS('teacher1'), 'users/student1'),
    { selectedSubjects: ['amestu', 'sirate'] })));
await t('admin CAN assign a student to a teacher', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/student2'), { assignedTeacher: 'teacher1' })));

/* The teacher branch is a WHITELIST. A blacklist grants every field
   nobody thought to forbid, so the next field added to a child's record
   would be writable by every teacher until someone remembered it. */
console.log('\n=== a teacher may write only a teacher\'s business ===');
await seed();
await t('teacher CANNOT rename a child', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { studentName: 'Someone Else' })));
await t('teacher CANNOT change a child\'s age', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { age: 30 })));
await t('teacher CANNOT inflate a child\'s study hours', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { studySeconds: 99999 })));
// student1 is seeded verified:true, so writing false is a real change.
// The field is simply absent from the whitelist, so it is refused in
// both directions — a teacher can neither forge nor revoke verification.
await t('teacher CANNOT touch a child\'s email verification', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { verified: false })));
await t('teacher CANNOT rewrite a consent record', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { consentVersion: 'x' })));
await t('teacher CANNOT move a child to another course', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { track: 'zema' })));
await t('teacher CANNOT change a child\'s plan to a cheaper one', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { plan: 'term' })));
await t('a legal write mixed with an illegal one fails ENTIRELY', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'),
    { paid: true, studySeconds: 99999 })));

/* Deactivation has to be enforced in the rules. A teacher whose role
   still says 'teacher' can call Firestore from a console, so an
   `active: false` that only greys out a page revokes nothing. */
console.log('\n=== a deactivated teacher loses reach, not their record ===');
await seed();
await t('a deactivated teacher can still read their OWN doc', () =>
  assertSucceeds(getDoc(doc(AS('teacher3'), 'users/teacher3'))));
await t('a deactivated teacher CANNOT read their former student', () =>
  assertFails(getDoc(doc(AS('teacher3'), 'users/student3'))));
await t('a deactivated teacher CANNOT list their former class', () =>
  assertFails(getDocs(query(collection(AS('teacher3'), 'users'),
    where('assignedTeacher', '==', 'teacher3')))));
await t('a deactivated teacher CANNOT confirm a payment', () =>
  assertFails(updateDoc(doc(AS('teacher3'), 'users/student3'), { paid: true })));
await t('a deactivated teacher CANNOT read a comment about a child', () =>
  assertFails(getDoc(doc(AS('teacher3'), 'users/student3/comments/c1'))));
await t('a deactivated teacher cannot reactivate themselves', () =>
  assertFails(updateDoc(doc(AS('teacher3'), 'users/teacher3'), { active: true })));
await t('an admin CAN deactivate a teacher', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/teacher1'), { active: false })));
await t('an admin CAN reactivate one', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/teacher3'), { active: true })));

/* An approved teacher must not be able to edit their own approval —
   otherwise they assign themselves subjects the admin never granted. */
console.log('\n=== a teacher cannot edit their own approval ===');
await seed();
await t('teacher CANNOT widen their own subjects', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/teacher1'),
    { teachesSubjects: ['amestu', 'sirate', 'wengele'] })));
await t('teacher CANNOT change their own parish', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/teacher1'), { parish: 'Somewhere Else' })));
await t('teacher CANNOT forge who approved them', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/teacher1'), { approvedBy: 'admin1' })));
await t('teacher CAN still fix their own phone number', () =>
  assertSucceeds(updateDoc(doc(AS('teacher1'), 'users/teacher1'), { phone: '+1555' })));

/* Comments are the one thing on a child's record written by somebody who
   is neither the parent nor us. The parent reading them is the property
   that makes the field defensible, and privacy.html promises it. */
console.log('\n=== comments: bounded, attributed, parent-visible ===');
await seed();
await t('the PARENT can read notes about their own child', () =>
  assertSucceeds(getDoc(doc(AS('student1'), 'users/student1/comments/c1'))));
await t('the assigned teacher can read them', () =>
  assertSucceeds(getDoc(doc(AS('teacher1'), 'users/student1/comments/c1'))));
await t('another teacher CANNOT read them', () =>
  assertFails(getDoc(doc(AS('teacher2'), 'users/student1/comments/c1'))));
await t('an admin can read them', () =>
  assertSucceeds(getDoc(doc(AS('admin1'), 'users/student1/comments/c1'))));
await t('the assigned teacher CAN leave a note', () =>
  assertSucceeds(addDoc(collection(AS('teacher1'), 'users/student1/comments'),
    { by: 'teacher1', byName: 'Memhir D', text: 'Good week.', at: serverTimestamp() })));
await t('a teacher CANNOT write on another teacher\'s student', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'users/student2/comments'),
    { by: 'teacher1', byName: 'Memhir D', text: 'x', at: serverTimestamp() })));
await t('a note cannot be attributed to another teacher', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'users/student1/comments'),
    { by: 'teacher2', byName: 'Memhir S', text: 'x', at: serverTimestamp() })));
await t('a note cannot be backdated', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'users/student1/comments'),
    { by: 'teacher1', byName: 'Memhir D', text: 'x', at: new Date('2020-01-01') })));
await t('an empty note is refused', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'users/student1/comments'),
    { by: 'teacher1', byName: 'Memhir D', text: '', at: serverTimestamp() })));
await t('a 1001-character note is refused', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'users/student1/comments'),
    { by: 'teacher1', byName: 'Memhir D', text: 'x'.repeat(1001), at: serverTimestamp() })));
await t('a PARENT cannot write a note about their own child', () =>
  assertFails(addDoc(collection(AS('student1'), 'users/student1/comments'),
    { by: 'student1', byName: 'Parent', text: 'x', at: serverTimestamp() })));
await t('a note cannot be edited after the parent has read it', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1/comments/c1'), { text: 'changed' })));
await t('a parent cannot delete an inconvenient note', () =>
  assertFails(deleteDoc(doc(AS('student1'), 'users/student1/comments/c1'))));
await t('the author CAN delete their own note', () =>
  assertSucceeds(deleteDoc(doc(AS('teacher1'), 'users/student1/comments/c1'))));

console.log('\n=== adding a Zema subject is a REQUEST, not a purchase ===');
await seed();
await t('a parent can ask for subjects', () =>
  assertSucceeds(setDoc(doc(AS('student1'), 'subjectRequests/student1'),
    { uid: 'student1', subjects: ['wudase'], status: 'pending', requestedAt: serverTimestamp() })));
await t('a parent cannot pre-mark it done', () =>
  assertFails(setDoc(doc(AS('student1'), 'subjectRequests/student1'),
    { uid: 'student1', subjects: ['wudase'], status: 'done', requestedAt: serverTimestamp() })));
await t('a parent cannot raise one for another child', () =>
  assertFails(setDoc(doc(AS('student1'), 'subjectRequests/student2'),
    { uid: 'student2', subjects: ['wudase'], status: 'pending', requestedAt: serverTimestamp() })));
await t('an empty request is refused', () =>
  assertFails(setDoc(doc(AS('student1'), 'subjectRequests/student1'),
    { uid: 'student1', subjects: [], status: 'pending', requestedAt: serverTimestamp() })));
await t('asking does NOT open the subjects', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'),
    { selectedSubjects: ['amestu', 'wudase'] })));
await t('the assigned teacher can read the request', () =>
  assertSucceeds(getDoc(doc(AS('teacher1'), 'subjectRequests/student1'))));
await t('another teacher cannot', () =>
  assertFails(getDoc(doc(AS('teacher2'), 'subjectRequests/student1'))));
await t('the teacher can clear it once fulfilled', () =>
  assertSucceeds(deleteDoc(doc(AS('teacher1'), 'subjectRequests/student1'))));

/* The money lives in /payments, not on the child's document. A parish may
   need receipts for years; COPPA argues for deleting a child's record
   promptly. Only separable records satisfy both. */
console.log('\n=== payments are separate from the child\'s record ===');
await seed();
await t('a teacher CANNOT put amountPaid back on a child\'s record', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { amountPaid: 105 })));
await t('a teacher CANNOT put paidAt back on a child\'s record', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'users/student1'), { paidAt: serverTimestamp() })));
await t('a student cannot write their own amountPaid', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'), { amountPaid: 1 })));
await t('the access grant DOES stay on the child\'s record', () =>
  assertSucceeds(updateDoc(doc(AS('teacher1'), 'users/student1'),
    { paid: true, paidUntil: '2026-12-08' })));

await t('the assigned teacher can write the payment summary', () =>
  assertSucceeds(setDoc(doc(AS('teacher1'), 'payments/student1'), {
    uid: 'student1', guardianName: 'Tesfaye G', email: EMAIL('student1'),
    totalPaid: 105, lastAmount: 105, lastPaidAt: serverTimestamp(),
    lastPaidUntil: '2026-12-08', recordedBy: 'teacher1', recordedByName: 'Memhir D'
  })));
await t('the PARENT can read what they were charged', () =>
  assertSucceeds(getDoc(doc(AS('student1'), 'payments/student1'))));
await t('a parent CANNOT forge their own receipt', () =>
  assertFails(setDoc(doc(AS('student1'), 'payments/student1'), {
    uid: 'student1', totalPaid: 999, recordedBy: 'student1'
  })));
await t('another teacher cannot read it', () =>
  assertFails(getDoc(doc(AS('teacher2'), 'payments/student1'))));
await t('another teacher cannot write it', () =>
  assertFails(setDoc(doc(AS('teacher2'), 'payments/student1'), {
    uid: 'student1', totalPaid: 1, recordedBy: 'teacher2'
  })));
await t('a payment summary cannot be deleted, even by an admin', () =>
  assertFails(deleteDoc(doc(AS('admin1'), 'payments/student1'))));

const receipt = {
  amount: 105, at: serverTimestamp(), periodUntil: '2026-12-08',
  subjects: ['amestu'], kind: 'term',
  recordedBy: 'teacher1', recordedByName: 'Memhir D'
};
await t('a teacher can write a receipt for their own student', () =>
  assertSucceeds(addDoc(collection(AS('teacher1'), 'payments/student1/entries'), receipt)));
await t('the parent can read their receipts', () =>
  assertSucceeds(getDocs(collection(AS('student1'), 'payments/student1/entries'))));
await t('a parent cannot write a receipt', () =>
  assertFails(addDoc(collection(AS('student1'), 'payments/student1/entries'),
    { ...receipt, recordedBy: 'student1' })));
await t('a receipt cannot be attributed to another teacher', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'payments/student1/entries'),
    { ...receipt, recordedBy: 'teacher2' })));
await t('a receipt cannot be backdated', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'payments/student1/entries'),
    { ...receipt, at: new Date('2020-01-01') })));
await t('a negative amount is refused', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'payments/student1/entries'),
    { ...receipt, amount: -50 })));
await t('an unknown payment kind is refused', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'payments/student1/entries'),
    { ...receipt, kind: 'refund' })));
await t('a receipt cannot carry an unexpected field', () =>
  assertFails(addDoc(collection(AS('teacher1'), 'payments/student1/entries'),
    { ...receipt, note: 'anything' })));

// immutability is the property that makes it a financial record at all
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'payments/student1/entries/e1'), receipt);
});
await t('a receipt cannot be edited by its author', () =>
  assertFails(updateDoc(doc(AS('teacher1'), 'payments/student1/entries/e1'), { amount: 1 })));
await t('a receipt cannot be edited by an admin', () =>
  assertFails(updateDoc(doc(AS('admin1'), 'payments/student1/entries/e1'), { amount: 1 })));
await t('a receipt cannot be deleted by its author', () =>
  assertFails(deleteDoc(doc(AS('teacher1'), 'payments/student1/entries/e1'))));
await t('a receipt cannot be deleted by an admin', () =>
  assertFails(deleteDoc(doc(AS('admin1'), 'payments/student1/entries/e1'))));
await t('a receipt cannot be deleted by the parent who paid', () =>
  assertFails(deleteDoc(doc(AS('student1'), 'payments/student1/entries/e1'))));
await t('a stranger reads nobody\'s payments', () =>
  assertFails(getDoc(doc(ANON(), 'payments/student1'))));

/* CONSENT_VERSION moving is the mechanism working, but it has to lead
   somewhere: the parent agrees again, and that agreement is evidence. */
console.log('\n=== re-consent leaves an immutable record ===');
await seed();
await t('a parent can record a new consent', () =>
  assertSucceeds(setDoc(doc(AS('student1'), 'users/student1/consents/2026-10-01'),
    { version: '2026-10-01', at: serverTimestamp() })));
await t('a consent cannot be backdated', () =>
  assertFails(setDoc(doc(AS('student1'), 'users/student1/consents/2026-11-01'),
    { version: '2026-11-01', at: new Date('2020-01-01') })));
await t('the version must match the document id', () =>
  assertFails(setDoc(doc(AS('student1'), 'users/student1/consents/2026-11-01'),
    { version: 'something-else', at: serverTimestamp() })));
await t('a consent cannot be edited afterwards', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1/consents/2026-10-01'),
    { version: '2026-10-01' })));
await t('a consent cannot be deleted, even by an admin', () =>
  assertFails(deleteDoc(doc(AS('admin1'), 'users/student1/consents/2026-10-01'))));
await t('nobody records consent on someone else\'s behalf', () =>
  assertFails(setDoc(doc(AS('teacher1'), 'users/student1/consents/2026-10-01'),
    { version: '2026-10-01', at: serverTimestamp() })));
await t('the teacher CAN read that consent was given', () =>
  assertSucceeds(getDoc(doc(AS('teacher1'), 'users/student1/consents/2026-10-01'))));

// the cached field may move forward, but only onto a version they hold
await t('consentVersion may move onto a version they consented to', () =>
  assertSucceeds(updateDoc(doc(AS('student1'), 'users/student1'),
    { consentVersion: '2026-10-01' })));
await t('consentVersion CANNOT move onto one they never agreed to', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'),
    { consentVersion: '2030-01-01' })));
await t('consentGivenAt is still frozen forever', () =>
  assertFails(updateDoc(doc(AS('student1'), 'users/student1'),
    { consentGivenAt: serverTimestamp() })));

console.log('\n=== progress writes ===');
await seed();
await t('a student cannot post a score above the total', () =>
  assertFails(setDoc(doc(AS('student1'), 'users/student1/progress/l2'),
    { done: true, score: 99, of: 3 })));
await t('a student cannot post a negative score', () =>
  assertFails(setDoc(doc(AS('student1'), 'users/student1/progress/l2'),
    { done: true, score: -1, of: 3 })));
await t('a valid score is accepted', () =>
  assertSucceeds(setDoc(doc(AS('student1'), 'users/student1/progress/l2'),
    { done: true, score: 3, of: 3 })));
await t('coverage above 1 is refused', () =>
  assertFails(setDoc(doc(AS('student1'), 'users/student1/progress/l3'),
    { videoCompleted: true, coverage: 4 })));
await t('an unverified account cannot write progress', () =>
  assertFails(setDoc(doc(AS('student1', false), 'users/student1/progress/l4'),
    { done: true, score: 1, of: 3 })));
await t('a student cannot DELETE a bad result', () =>
  assertFails(deleteDoc(doc(AS('student1'), 'users/student1/progress/l1'))));
await t('a student cannot write another student\'s progress', () =>
  assertFails(setDoc(doc(AS('student1'), 'users/student2/progress/l1'),
    { done: true, score: 3, of: 3 })));

console.log('\n=== deletion requests ===');
await seed();
await t('a parent can raise their own request', () =>
  assertSucceeds(setDoc(doc(AS('student1'), 'deletionRequests/student1'),
    { uid: 'student1', status: 'pending', requestedAt: serverTimestamp() })));
await t('a parent cannot pre-mark it handled', () =>
  assertFails(setDoc(doc(AS('student1'), 'deletionRequests/student1'),
    { uid: 'student1', status: 'done', requestedAt: serverTimestamp() })));
await t('a parent cannot raise one for someone else', () =>
  assertFails(setDoc(doc(AS('student1'), 'deletionRequests/student2'),
    { uid: 'student2', status: 'pending', requestedAt: serverTimestamp() })));
await t('a parent cannot mark their own request done', () =>
  assertFails(updateDoc(doc(AS('student1'), 'deletionRequests/student1'), { status: 'done' })));
await t('an admin can mark it done', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'deletionRequests/student1'), { status: 'done' })));

console.log('\n=== records of children are never deleted from a browser ===');
await seed();
await t('a student cannot delete their own record', () =>
  assertFails(deleteDoc(doc(AS('student1'), 'users/student1'))));
await t('a teacher cannot delete their student', () =>
  assertFails(deleteDoc(doc(AS('teacher1'), 'users/student1'))));
await t('an ADMIN cannot delete a record either', () =>
  assertFails(deleteDoc(doc(AS('admin1'), 'users/student1'))));

console.log('\n=== nothing else exists ===');
await seed();
await t('an arbitrary collection is closed to students', () =>
  assertFails(setDoc(doc(AS('student1'), 'secrets/x'), { a: 1 })));
await t('an arbitrary collection is closed to admins too', () =>
  assertFails(setDoc(doc(AS('admin1'), 'secrets/x'), { a: 1 })));

await env.cleanup();
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
