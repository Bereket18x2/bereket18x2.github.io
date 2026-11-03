# Release checklist — Finote Yared

**Status:** Internal development; **not ready for paid-family enrollment** until the nontechnical blockers below are approved. This checklist is an action list, not a claim that any step has passed.

## 1. Verify the code changes

- [ ] Review the complete diff against `main` and approve the UI, copy and workflow changes.
- [ ] Run every `tests/*.test.mjs` suite in Node; fix all failures.
- [ ] Run `cd tools && npm install && npm run test:rules`; fix every failed allow/deny assertion.
- [ ] Confirm that registration accepts correct US/ET country and region pairs, Bible ages 7–13, Zema ages 7+, and only subjects within the chosen track.
- [ ] Confirm browser-side changes cannot bypass Firestore eligibility checks, and teacher requests cannot assign unrecognized subjects.
- [ ] Test failure to create the Firestore profile after Firebase Auth creation; verify clean rollback or a documented recovery path when rollback also fails.
- [ ] Test a failed payment receipt write leaves both access and summary unchanged; test successful writes create all three records.
- [ ] Test repeat payment confirmation; without an external transaction ID, duplicates remain a manual reconciliation responsibility.
- [ ] Test Firestore rules on the emulator against malicious score updates, abnormal watch-time values, and attempted user privilege escalation.
- [ ] Compare the deployed production rules with the file in this branch before enrollment. Changes in the repository are **not** deployment.

## 2. UI and accessibility

- [ ] Preview all pages at 360px, 390px, 768px, 1024px, and desktop widths.
- [ ] Check the day/night toggle, Amharic and English text, and both tracks.
- [ ] Use Tab and Shift+Tab to check navigation, modals, registration and the new skip link.
- [ ] Check that no text overflows, that interactive targets are comfortable on mobile, and that focus rings remain visible.
- [ ] Run screen-reader testing for inputs, the country combobox, and the teacher drawer.
- [ ] Test the watch-time prompt and reduced-motion preference.
- [ ] Test a slow network and Firestore offline/error states, including visible feedback after failed registration or payment.

## 3. Program content and school approval

- [ ] Replace the draft instructor name, lesson description and questions with approved content written or reviewed by an actual teacher.
- [ ] Publish enough lessons to match what the marketing and payment pages promise; do not sell empty courses.
- [ ] Verify each uploaded recording, lesson duration and playback availability.
- [ ] Decide how practice grades become staff-reviewed evidence before official certificates are issued.
- [ ] Secure parish approval for certificate wording, names and titles.

## 4. Children's data and operations — must be decided externally

- [ ] Obtain qualified legal review of parental consent and children's privacy requirements where families reside.
- [ ] Approve retention/deletion timelines and staff procedures for children's records, teacher comments, questions and receipts.
- [ ] Confirm who controls the Firebase project and billing account, and who may act as administrator.
- [ ] Decide payment ownership, reconciliation, refunds and whether a verified Stripe integration is appropriate.
- [ ] Confirm the parish-approved regional pricing, displayed currency conversions, and current payment instructions.
- [ ] Reconcile all public privacy and terms copy with the actual data flows.
- [ ] Decide whether the unlisted-YouTube UI paywall is sufficient or whether signed video URLs are needed.

## 5. Launch procedure

- [ ] Take a recoverable database export according to parish policy.
- [ ] Test changes on an isolated Firebase project and authorized preview origin.
- [ ] After review, merge the branch into `main` through the pull request.
- [ ] Deploy `firestore.rules` separately using the approved Firebase project and authorized credentials.
- [ ] Manually test real flows with approved test accounts, not children's personal records.
- [ ] Have a named parish representative sign off on privacy, payment, content and launch readiness.

**Do not describe code-only changes as legal compliance, payment-provider integration, authenticated video security or tamper-proof grades.**
