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
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where,
  serverTimestamp
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

const AS = (uid, verifiedEmail = true) =>
  env.authenticatedContext(uid, { email_verified: verifiedEmail }).firestore();
const ANON = () => env.unauthenticatedContext().firestore();

/* Seed through the admin backdoor so the fixtures themselves are not
   subject to the rules under test. */
async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/student1'), {
      uid: 'student1', role: 'student', studentName: 'Sara T', age: 10,
      track: 'bible', tier: 'bible', selectedSubjects: ['amestu'],
      paid: false, studySeconds: 100, verified: true,
      assignedTeacher: 'teacher1', consentVersion: '2026-09-07'
    });
    await setDoc(doc(db, 'users/student2'), {
      uid: 'student2', role: 'student', studentName: 'Nati A', age: 11,
      track: 'bible', paid: false, studySeconds: 0, verified: true,
      assignedTeacher: 'teacher2', consentVersion: '2026-09-07'
    });
    await setDoc(doc(db, 'users/teacher1'), {
      uid: 'teacher1', role: 'teacher', fullName: 'Memhir D', verified: true
    });
    await setDoc(doc(db, 'users/teacher2'), {
      uid: 'teacher2', role: 'teacher', fullName: 'Memhir S', verified: true
    });
    await setDoc(doc(db, 'users/pending1'), {
      uid: 'pending1', role: 'pending_teacher', fullName: 'Memhir P', verified: true
    });
    await setDoc(doc(db, 'users/admin1'), {
      uid: 'admin1', role: 'admin', fullName: 'Bereket', verified: true
    });
    await setDoc(doc(db, 'users/student1/progress/l1'), { done: true, score: 2, of: 3 });
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
await t('an admin CAN change a role', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/pending1'), { role: 'teacher' })));

console.log('\n=== acceptance 10: registration cannot mint privilege ===');
await seed();
const newStudent = {
  uid: 'newbie', role: 'student', studentName: 'New Child', age: 9,
  track: 'bible', paid: false, studySeconds: 0,
  consentVersion: '2026-09-07', consentGivenAt: serverTimestamp()
};
await t('registering as a student is allowed', () =>
  assertSucceeds(setDoc(doc(AS('newbie'), 'users/newbie'), newStudent)));
await seed();
await t('registering as a teacher request is allowed', () =>
  assertSucceeds(setDoc(doc(AS('newbie'), 'users/newbie'), {
    uid: 'newbie', role: 'pending_teacher', fullName: 'Some Teacher',
    consentVersion: '2026-09-07', consentGivenAt: serverTimestamp()
  })));
await seed();
await t('registering directly as teacher is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), {
    ...newStudent, role: 'teacher'
  })));
await t('registering directly as admin is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), {
    ...newStudent, role: 'admin'
  })));
await t('registering already paid is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, paid: true })));
await t('registering with banked study time is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, studySeconds: 9999 })));
await t('registering while assigning yourself a teacher is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), { ...newStudent, assignedTeacher: 'teacher1' })));
await t('registering without a consent record is REFUSED', () =>
  assertFails(setDoc(doc(AS('newbie'), 'users/newbie'), {
    uid: 'newbie', role: 'student', paid: false, studySeconds: 0
  })));

console.log('\n=== acceptance 5: a student cannot buy themselves anything ===');
await seed();
for (const [field, value] of [
  ['selectedSubjects', ['amestu', 'sirate', 'meshaftarik', 'betekrtarik', 'sinemigbar']],
  ['amountPaid', 999],
  ['paidUntil', '2099-01-01'],
  ['paid', true],
  ['tier', 'zema'],
  ['track', 'zema'],
  ['unlockedLessons', ['l2', 'l3']],
  ['badges', ['everything']],
  ['assignedTeacher', 'teacher2'],
  ['consentVersion', 'anything']
]) {
  await t(`a student cannot write their own ${field}`, () =>
    assertFails(updateDoc(doc(AS('student1'), 'users/student1'), { [field]: value })));
}
// documented for the next reader: re-writing an identical value is a
// no-op that affectedKeys() does not report, and is harmless
await t('re-writing the SAME tier value is a harmless no-op', () =>
  assertSucceeds(updateDoc(doc(AS('student1'), 'users/student1'), { tier: 'bible' })));
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
await t('pending teacher CANNOT read a student progress doc', () =>
  assertFails(getDoc(doc(AS('pending1'), 'users/student1/progress/l1'))));
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
await t('teacher CAN confirm payment for their own student', () =>
  assertSucceeds(updateDoc(doc(AS('teacher1'), 'users/student1'),
    { paid: true, amountPaid: 105, paidUntil: '2026-12-07' })));
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
await t('admin CAN assign a student to a teacher', () =>
  assertSucceeds(updateDoc(doc(AS('admin1'), 'users/student2'), { assignedTeacher: 'teacher1' })));

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

console.log('\n=== nothing else exists ===');
await seed();
await t('an arbitrary collection is closed to students', () =>
  assertFails(setDoc(doc(AS('student1'), 'secrets/x'), { a: 1 })));
await t('an arbitrary collection is closed to admins too', () =>
  assertFails(setDoc(doc(AS('admin1'), 'secrets/x'), { a: 1 })));

await env.cleanup();
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
