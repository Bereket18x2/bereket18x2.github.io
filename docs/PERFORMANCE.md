# The teacher roster, measured

Reproduce with `cd tools && npm run bench:roster`
(`BENCH_SIZES=1000 BENCH_SKIP_UNBOUNDED=1` for one size at a time).

## What was measured

Two ways of drawing the teachers' roster, against the Firestore emulator,
20 lessons per student:

- **rows** — what the roster did until 2026-09-27: read every student's whole
  `progress` subcollection and add it up in the browser.
- **aggregates** — what it does now: ask Firestore to `count()` and `sum()`
  server-side, three calls per student.

## The numbers

| students | rows | aggregates (unbounded) | aggregates (≤64 in flight) | reads: rows | reads: aggregates |
|---|---|---|---|---|---|
| 50 | 2,503 ms | 2,212 ms | **1,847 ms** | 1,050 | 200 |
| 200 | 3,424 ms | 2,848 ms | **2,520 ms** | 4,200 | 800 |
| 1000 | 35,762 ms | 23,434 ms | **24,534 ms** | 21,000 | 4,000 |

Spark's free tier is 50,000 reads/day.

**Read these as a shape, not as wall time.** The emulator runs on localhost, so
there is no network round trip in any of these figures; production adds one per
request. What the emulator does show faithfully is how each strategy scales and
how they compare.

## What it says

**The read quota problem is solved.** 21,000 reads per roster load at a
thousand students is five roster refreshes a day before the free tier is gone.
4,000 is not. That was the point of the change and it holds at every size.

**The latency problem is not solved, and at 1000 students it is bad.** Twenty-
four seconds to draw a page, with no network in the way, is not a usable roster.
It is not a tuning problem either: three requests per student is 3,000 in
flight, and no amount of client-side cleverness makes three thousand
round-trips fast.

**Capping the fan-out helps at realistic sizes and not at large ones.** At 50
and 200 students, limiting to 64 students in flight is consistently the fastest
of the three — about 25% and 12% faster than unbounded. At 1000 it makes no
difference (24.5s capped against 23.4s unbounded, which is noise). The cap is
in `Store.rosterStats` anyway, because it is free, it is faster where the school
actually is, and unbounded fan-out took the emulator down: running all three
strategies at 1000 students in one process ends in `ECONNRESET` and the
emulator exiting with code 1. That is a statement about the emulator rather
than about production, but a client that can kill its own test harness is not a
client to point at a thousand students.

**So: fine now, and it does not stay fine.** At the tens-to-couple-hundred
students this parish has, the roster opens in about two seconds and costs a few
hundred reads. The curve between 200 and 1000 is where it stops working —
roughly 5× the students for 10× the time.

## Where this is going

A **Cloud Function**: a Firestore trigger on `users/{uid}/progress/{lessonId}`
that recomputes the summary and writes `lessonsCompleted`, `averageScore` and
`lastActive` onto the user document using admin credentials. The roster then
reads one document per student and nothing else — O(N) reads, one round trip,
flat at any size.

Those three field names are already reserved on `lockedFields()` in
`firestore.rules`. That is deliberate and it is what makes the denormalised
summary safe: **a server writing them is fine, a browser writing them is not.**
With no server, the only actor present when a lesson completes is the student's
own browser, and a roster a child can edit cannot do the one job it has —
showing a teacher who is *not* learning. Admin credentials bypass rules, so the
trigger needs no change to that list.

It needs a **Blaze** (pay-as-you-go) Firebase account, which is put to the
parish in `docs/CHURCH-DECISIONS.md` §1 alongside Stripe: the same card, in the
same sitting, almost certainly $0 a month at this size.

**Do not build the denormalised summary before the Cloud Function exists.**
Writing it from the browser would look like the same optimisation and would
quietly make the roster forgeable. See the Architecture rules in `CLAUDE.md`.

## When to revisit

The honest trigger is roster size, not a date:

- **under ~200 students** — nothing to do.
- **200–500** — watch it. Re-run the benchmark; if a teacher waits more than a
  few seconds, move.
- **over ~500** — the Cloud Function is overdue, and the parish needs Blaze
  before it can be built.
