# Data retention — open questions

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

A certificate is a public record: `verify.html?id=…` returns a first name, a
last initial, a course and a date, to anyone with the link. It exists precisely
so it can be checked later — that is the whole point of issuing one.

So when a parent asks for deletion:

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
not discover the answer at the moment they ask for erasure.

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

---

## What would need to change in code

For whoever implements this later:

1. A `lastActiveAt` that means what it says — `lastSeen` is currently written on
   every page load, including by a parent checking the dashboard, so it does not
   distinguish an active student from an anxious parent.
2. A scheduled job. Spark has no scheduler; this needs Blaze Cloud Functions or
   an external cron hitting an endpoint.
3. A deletion routine covering: the user document, the `progress` subcollection
   (Firestore does **not** cascade — see `docs/DELETION.md`), the Auth account,
   the certificate decision from §2, and the export files from §4.
4. `privacy.html` updated in the same change, per the rule in CLAUDE.md.
