# Actioning a data deletion request

A parent presses **የመረጃ ስረዛ ጠይቅ** on their dashboard. That writes a document to
`deletionRequests/{uid}` and does nothing else — deliberately. The rules refuse
client deletes so that no browser, and no mistake in this codebase, can erase a
child's record.

Which means the request only matters if a person acts on it. This is what that
person does.

**Owner:** whoever holds admin on the Firebase project.
**Target response:** within 7 days. COPPA sets no fixed clock, but a parent
withdrawing consent should not have to ask twice.

---

## Before you start

You need the Firebase console, and for step 4 either the console or a service
account key (see `docs/BACKUP.md`).

Read `docs/RETENTION.md` §2 first if the student has been issued a certificate.
**That decision has not been made yet.** If you hit this case before it has been,
stop and settle the policy rather than improvising per family — an inconsistent
answer is worse than either answer.

## 1. Find the request

Firebase console → Firestore → `deletionRequests`. Each document is keyed by the
account's uid and contains `email`, `requestedAt`, `status`, and an optional
`reason`.

You do not need to verify identity separately. The request can only be written by
someone signed in as that account, and the rules enforce that — the uid in the
document is the uid that wrote it.

## 2. Take a backup first

```bash
node tools/export.mjs
```

Not to keep the data against the parent's wishes, but so a mistake at step 3 is
recoverable. Delete this export once the deletion is confirmed complete, and note
that doing so is itself part of the request — see `docs/RETENTION.md` §4.

## 3. Delete the Firestore data — subcollection FIRST

**Firestore does not cascade.** Deleting `users/{uid}` leaves
`users/{uid}/progress/*` behind as orphans. They remain readable, because the
progress rules key off the uid in the path, which still matches. A parent told
"your child's record is gone" would be told something false.

So, in this order:

1. Open `users/{uid}` → `progress` subcollection.
2. Delete every document in it.
3. Then delete `users/{uid}` itself.

Confirm the subcollection is empty before deleting the parent document, because
once the parent is gone the subcollection is harder to find in the console.

## 4. Delete the Auth account

Firebase console → Authentication → Users → find the email → delete.

Skipping this leaves the email address, password hash and sign-in history in
place, and the person can still sign in — landing in a broken state with no
profile document. The Firestore record and the Auth record are two separate
copies and both have to go.

## 5. Certificates

Follow whatever `docs/RETENTION.md` §2 has been settled as. If it has not been
settled, see the warning above.

## 6. Close the request

Set `status` to `done` on the `deletionRequests/{uid}` document, and add:

- `handledAt` — the date
- `handledBy` — who did it

Do not delete the request document. It is the record that the request was made
and honoured, and it no longer contains anything about the child beyond a uid
that now points at nothing.

## 7. Tell the parent

Reply to the email on the request. Say what was deleted, confirm the account no
longer exists, and — if a certificate was retained under §2 — say so plainly
rather than letting them find out later.

---

## If a request arrives by email instead

The button is not the only route; `privacy.html` also gives the address. A
request by email is equally valid. Verify it comes from the address on the
account, then follow steps 2–7 the same way.

## What is missing

There is no `tools/delete-user.mjs`. Every step above is manual console work,
which is error-prone in exactly the way step 3 warns about. If deletion requests
become common, that script is the obvious next tool — it can do the subcollection
walk, the Auth delete and the status update as one atomic operation, and it would
remove the main risk in this runbook.
