# Data retention — open questions

> Four of the questions below wait on the parish rather than on a developer.
> Those are gathered for a non-technical reader in **`docs/CHURCH-DECISIONS.md`**;
> this file keeps the engineering detail.

`privacy.html` currently tells parents the truth: data is kept while the account
exists, there is **no automatic expiry**, and it is deleted when they ask.

That is honest, but it is a gap as much as a disclosure. "We keep it until
someone asks" is not a retention policy — it is the absence of one. This file
exists so the decision reaches the church rather than living in a chat log.

**Nothing here is implemented.** These are questions for the parish to answer,
after which the code and the policy both change together (see the rule in
CLAUDE.md: the policy may only describe what the code actually does).

---

## 1. How long after a student stops attending?

A family drifts away without cancelling. Their child's name, age, quiz scores
and watch history sit in Firestore indefinitely.

- What counts as "stopped attending" — last sign-in, or a lapsed subscription?
  A paid account that never signs in is different from an unpaid one still
  watching the free lesson.
- How long after that? Twelve months is a common answer for education services;
  twenty-four is common where a student might return next term. A church school
  a child may rejoin after a year abroad is a real case here.
- Warn first, or delete silently? An email saying "we are about to delete your
  child's record, sign in if you want to keep it" is kinder and gives the parent
  a choice, but it also emails people who have moved on.

## 2. What happens to a certificate?

This is the hardest one, and it will not resolve itself.

**Status, 2026-09-08.** A certificate now exists, and it is *not* yet a public
record. `assets/js/certificate.js` builds an SVG in the browser from the child's
name and their completed subject, and the parent downloads it. Nothing is
published, nothing is stored server-side, and there is no `verify.html` — so
today, deleting the account really does delete everything the school holds about
that certificate. The copy in the family's possession is theirs.

That is the easy state, and it is temporary. The moment verification is added —
a `verify.html?id=…` returning a first name, a last initial, a course and a date
to anyone with the link — the conflict below becomes real. Verification is the
whole point of issuing a certificate, so it probably is coming.

So when verification exists and a parent asks for deletion:

- If the certificate survives, the deletion is **incomplete** — a first name and
  a date about that child remain published.
- If the certificate is destroyed, previously-issued certificates **stop
  verifying**, and a document the family may have printed and framed becomes
  unconfirmable.

Possible answers, none free:
- Delete the account, keep the certificate, and say so plainly in the policy
  *before* anyone earns one.
- Delete both, and accept that verification is not permanent.
- Keep the certificate but strip it to a course and date with no name, so the
  ID confirms *a* completion but identifies nobody. This one loses the least and
  should probably be the default.

Whichever is chosen, `privacy.html` has to say it in advance. A parent should
not discover the answer at the moment they ask for erasure. The window to decide
this cheaply is now, while no certificate has been published and no promise about
verification has been made.

## 2b. Teacher comments about a child

Added 2026-09-08, at `users/{uid}/comments/{commentId}`: free text a teacher
writes about a named minor, bounded at 1000 characters, attributed, and readable
by the parent. The parent reading them is what makes the field defensible, and
`privacy.html` now says so.

The open questions are retention-shaped, not access-shaped:

- These outlive the term. A note about a struggling eight-year-old is still
  there when they are fourteen. Should comments expire on their own — end of
  term, end of year — even while the account continues?
- They are the most subjective thing in the database and the most likely to be
  wrong. There is no correction mechanism beyond the author deleting and
  rewriting, and once a teacher is deactivated nobody can delete their notes but
  an admin.
- A deactivated or departed teacher's notes remain readable by the parent, the
  admin, and whichever teacher is assigned next. That is probably right, but it
  was not a decision anybody made.

They are also a subcollection, so Firestore will **not** cascade-delete them —
see the routine in "What would need to change in code" below.

## 3. Does progress survive the account?

Teachers reasonably want to know how many students completed lesson 4, or where
students commonly give up — questions that outlive any individual enrolment.

- Aggregate counts kept after deletion are usually fine, provided nothing in
  them identifies a child.
- The current progress documents live at `users/{uid}/progress/{lessonId}` and
  are identifiable by construction. Keeping them "for statistics" after a
  deletion request would not be deletion.
- If aggregates matter, they need to be computed and stored separately *before*
  deletion, not reconstructed from records that were supposed to be gone.

## 4. Backups are part of this

`tools/export.mjs` writes timestamped JSON dumps containing every student. A
deletion that removes a Firestore document but leaves the child in six months of
export files has not deleted anything.

- Where do exports live, who can read them, and for how long?
- Are they encrypted at rest? They contain children's names, ages and a parent's
  email address, in plain JSON.
- What is the process for scrubbing a deleted student from existing exports, or
  is the answer instead that exports are themselves deleted on a schedule short
  enough that the question stops mattering?

## 5. Firebase Auth is a second copy

Deleting `users/{uid}` does not delete the Firebase Auth account. The email
address, the password hash and the sign-in history remain, and the person can
still sign in — into a broken state, since their profile document is gone.

Deletion must cover both, in the right order. See `docs/DELETION.md`.

## 6. Where the law pulls the other way

- COPPA expects children's data to be kept only as long as reasonably necessary
  for the purpose it was collected for, and then deleted securely. This argues
  for a short, defined period.
- Payment and tax records generally must be kept for years, and a parent's name,
  email and payment history may be caught by that. Those are records about the
  *parent*, not the child, which is the distinction that makes both rules
  satisfiable at once — but only if the two are separable, and right now they sit
  in the same document.

That separation is worth designing before there is a large database to migrate.

**Done, 2026-09-08.** This is no longer an open question — the split was made
before the first parent paid, which was the only cheap moment it would ever have.

- `payments/{uid}` holds the running summary: the **parent's** name and email,
  `totalPaid`, and the last amount and period. It is a record about the parent.
- `payments/{uid}/entries/{id}` holds one immutable receipt per payment taken —
  amount, server-stamped date, period covered, subjects, and who recorded it.
  Create only. No update and no delete, for anybody including an admin: a
  financial record that can be edited after the fact is not one, and a correction
  is a new entry.
- `users/{uid}` keeps only `paid` and `paidUntil` — the **access grant**, meaning
  "this child may open lessons until this date". That is not a financial record
  and it is deleted with the child.

So the two clocks can now run at different speeds, which was the whole problem:
a parish can keep its books for as long as tax requires while a child's name,
age, scores and watch history are deleted promptly, because they no longer live
in the same document. `privacy.html` states this to parents in both languages.

`amountPaid` and `paidAt` remain on the rules' locked-field list even though
nothing writes them to `users/{uid}` any more, so an older client cannot put a
financial field back onto a child's record.

The split is done. How long the separated record is then *kept* is not, and is
§7 below.

## 7. How long is a receipt kept?

**Open, and not ours to answer — see `docs/CHURCH-DECISIONS.md` §3, which is
where the question is put to the parish and its accountant.**

§6 moved the financial record out of the child's document so the two could be
kept for different lengths of time. It did not say what the second length is.
Today `payments/{uid}` and its `entries` are kept indefinitely and the rules
refuse every client delete — correct while the answer is unknown, since deleting
is irreversible and keeping is not, but "forever" is a default rather than a
decision.

The engineering consequences, which is all that belongs in this file:

- **No period is hardcoded anywhere**, and none should be added until the parish
  answers. A plausible-sounding number in a config file is an invented legal
  answer that nobody will ever find again.
- **The per-uid versus totals-only choice has a deadline.** Receipts are
  currently one document per family. Collapsing them to per-period totals keeps
  far less about real people and is cheap while almost none exist; after several
  terms it means discarding records or writing a conversion. CHURCH-DECISIONS.md
  §3 states this to the parish in those terms.
- **Nothing can expire them yet.** Spark has no scheduler and the rules refuse
  client deletes, so an expiry routine is console work or a server-side job that
  does not exist. It should not be built before the period exists.

Until then `privacy.html` says what is true: the payment record is kept, it holds
the parent's name, email and amount, and it holds nothing about the child.

---

## What would need to change in code

For whoever implements this later:

1. A `lastActiveAt` that means what it says — `lastSeen` is currently written on
   every page load, including by a parent checking the dashboard, so it does not
   distinguish an active student from an anxious parent.
2. A scheduled job. Spark has no scheduler; this needs Blaze Cloud Functions or
   an external cron hitting an endpoint.
3. A deletion routine covering: the user document, the `progress` subcollection,
   the `comments` subcollection (§2b), the `deletionRequests/{uid}` and
   `subjectRequests/{uid}` documents — Firestore does **not** cascade, see
   `docs/DELETION.md` — the Auth account, the certificate decision from §2, and
   the export files from §4. It must **not** touch `payments/{uid}`: that record
   is retained on purpose (§6), the rules refuse the delete, and a routine that
   quietly removed it would be destroying the parish's books.
4. Separately, and only once §7 is answered: a job that expires payment records
   when their period is up. It does not exist and should not be guessed at.
5. `privacy.html` updated in the same change, per the rule in CLAUDE.md.
