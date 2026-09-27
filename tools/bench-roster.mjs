/* npm run bench:roster   (from tools/)

   Measures what the teacher roster actually costs to paint, because
   "three aggregates per student" is a number whose consequences are not
   obvious: at 1,000 students it is 3,000 requests in flight, and
   whether that is usable decides how urgent a Cloud Function is.

   It times two strategies against the Firestore emulator:

     rows        what the roster used to do — read every student's whole
                 progress subcollection
     aggregates  what it does now — three server-side counts/sums per
                 student, fanned out with Promise.all

   WHAT THIS MEASURES HONESTLY, AND WHAT IT DOES NOT.

   The emulator runs on localhost, so there is no network round trip.
   These numbers therefore UNDERSTATE production wall time — by roughly
   one RTT for the rows strategy, and by rather more for aggregates,
   which issues far more requests. What the emulator does show faithfully
   is the SHAPE: how each strategy scales with student count, whether the
   client copes with the fan-out at all, and the ratio between them.
   Read the ratio and the curve, not the absolute milliseconds.

   Reads are counted exactly rather than timed, because that is the
   number the Spark quota cares about and it does not depend on where
   the server is. */

import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  doc, setDoc, collection, getDocs, query, where, writeBatch,
  getAggregateFromServer, count, sum
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

/* `BENCH_SIZES=1000 npm run bench:roster` to run one size. The default
   three in one process is enough to crash the emulator at the top end —
   see the note at the bottom of this file. */
const SIZES = (process.env.BENCH_SIZES || '50,200,1000')
  .split(',').map(Number).filter(Boolean);
const LESSONS_PER_STUDENT = 20;

const env = await initializeTestEnvironment({
  projectId: 'finote-yared',
  firestore: { rules: readFileSync('../firestore.rules', 'utf8') }
});

/* Seeded with the rules off — this is fixture setup, not a test of who
   may write what. rules.test.mjs covers that. */
async function seedStudents(n) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    let batch = writeBatch(db);
    let ops = 0;
    const flush = async () => { await batch.commit(); batch = writeBatch(db); ops = 0; };

    for (let i = 0; i < n; i++) {
      const uid = `s${i}`;
      batch.set(doc(db, 'users', uid), {
        uid, role: 'student', studentName: `Student ${i}`, age: 10,
        guardianName: `Guardian ${i}`, email: `s${i}@example.org`,
        track: 'bible', paid: true, verified: true, studySeconds: 3600,
        assignedTeacher: 'teacher1'
      });
      if (++ops >= 400) await flush();

      for (let l = 0; l < LESSONS_PER_STUDENT; l++) {
        batch.set(doc(db, 'users', uid, 'progress', `l${l}`), {
          done: true, score: (l % 4) + 1, of: 4,
          videoCompleted: true, coverage: 0.95,
          suspicious: l === 3
        });
        if (++ops >= 400) await flush();
      }
    }
    // the teacher whose roster this is
    batch.set(doc(db, 'users', 'teacher1'), {
      uid: 'teacher1', role: 'teacher', fullName: 'Memhir D',
      email: 'teacher1@example.org', verified: true, active: true
    });
    await flush();
  });
}

const asTeacher = () => env.authenticatedContext('teacher1', {
  email: 'teacher1@example.org', email_verified: true
}).firestore();

/* THE OLD WAY: one subcollection query per student, every document read. */
async function byRows(db, uids) {
  return Promise.all(uids.map(async (uid) => {
    const snaps = await getDocs(collection(db, 'users', uid, 'progress'));
    let scored = 0, possible = 0, done = 0, flagged = 0;
    snaps.forEach((d) => {
      const p = d.data();
      if (typeof p.score === 'number' && p.of > 0) { scored += p.score; possible += p.of; }
      if (p.done === true) done++;
      if (p.suspicious) flagged++;
    });
    return { done, flagged, pct: possible ? Math.round(scored / possible * 100) : 0,
             reads: snaps.size };
  }));
}

/* THE NEW WAY: three aggregates per student, all in flight at once. */
async function byAggregates(db, uids) {
  return Promise.all(uids.map(async (uid) => {
    const prog = collection(db, 'users', uid, 'progress');
    const [totals, done, flagged] = await Promise.all([
      getAggregateFromServer(prog, { scored: sum('score'), possible: sum('of') }),
      getAggregateFromServer(query(prog, where('done', '==', true)), { n: count() }),
      getAggregateFromServer(query(prog, where('suspicious', '==', true)), { n: count() })
    ]);
    const t = totals.data();
    return {
      done: done.data().n,
      flagged: flagged.data().n,
      pct: t.possible ? Math.round(t.scored / t.possible * 100) : 0
    };
  }));
}

/* The same aggregates, but at most `limit` in flight at a time. If
   unbounded fan-out is what hurts, this is faster and the fix is a
   four-line limiter rather than a Cloud Function. If it is not, the
   cost is per-request work and no amount of client-side pacing helps —
   which is the answer that makes the Cloud Function necessary. */
async function byAggregatesCapped(db, uids, limit) {
  const out = new Array(uids.length);
  let next = 0;
  const worker = async () => {
    while (next < uids.length) {
      const i = next++;
      out[i] = (await byAggregates(db, [uids[i]]))[0];
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, uids.length) }, worker));
  return out;
}

const ms = (t) => `${Math.round(t)}ms`;
const pad = (s, n) => String(s).padEnd(n);

console.log(`\nroster paint, ${LESSONS_PER_STUDENT} lessons per student`);
console.log('emulator on localhost — read the ratio and the curve, not the absolute times\n');
console.log(pad('students', 10) + pad('rows', 14) + pad('agg (all)', 14) +
            pad('agg (<=64)', 14) + pad('reads: rows', 13) + pad('reads: agg', 12) + 'in flight');
console.log('-'.repeat(92));

for (const n of SIZES) {
  await seedStudents(n);
  const db = asTeacher();

  // the roster query itself, common to both and paid either way
  const t0 = performance.now();
  const roster = await getDocs(query(collection(db, 'users'), where('assignedTeacher', '==', 'teacher1')));
  const rosterMs = performance.now() - t0;
  const uids = roster.docs.map(d => d.id);

  const t1 = performance.now();
  const rowResults = await byRows(db, uids);
  const rowsMs = performance.now() - t1;

  /* BENCH_SKIP_UNBOUNDED=1 leaves the uncapped variant out. At a
     thousand students three full waves in one process is enough to take
     the emulator down with ECONNRESET, so the two strategies that
     matter have to be measured without it. */
  const skipUnbounded = process.env.BENCH_SKIP_UNBOUNDED === '1';
  const t2 = performance.now();
  const aggResults = skipUnbounded ? null : await byAggregates(db, uids);
  const aggMs = performance.now() - t2;

  const t3 = performance.now();
  const cappedResults = await byAggregatesCapped(db, uids, 64);
  const cappedMs = performance.now() - t3;

  // the two strategies must agree, or the faster one is worthless
  const mismatch = rowResults.filter((r, i) =>
    r.done !== cappedResults[i].done || r.pct !== cappedResults[i].pct ||
    r.flagged !== cappedResults[i].flagged ||
    (aggResults && aggResults[i].pct !== cappedResults[i].pct)).length;
  if (mismatch) console.log(`  !! ${mismatch} students disagree between strategies`);

  /* Reads. Rows: every progress document. Aggregates: Firestore bills
     one read per 1,000 index entries scanned, so at 20 lessons each
     aggregate is one read. Both include the roster query's N documents. */
  const readsRows = n + rowResults.reduce((a, r) => a + r.reads, 0);
  const readsAgg = n + n * 3;

  console.log(
    pad(n, 10) +
    pad(ms(rosterMs + rowsMs), 14) +
    pad(skipUnbounded ? '(skipped)' : ms(rosterMs + aggMs), 14) +
    pad(ms(rosterMs + cappedMs), 14) +
    pad(readsRows.toLocaleString(), 13) +
    pad(readsAgg.toLocaleString(), 12) +
    (n * 3).toLocaleString()
  );
}

console.log('\nSpark free tier is 50,000 reads/day.');
await env.cleanup();
