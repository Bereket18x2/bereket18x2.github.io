# ፍኖተ ያሬድ · Finote Yared

An Amharic-first Ethiopian Orthodox Tewahedo learning website for families, with Bible study and Zema tracks.

**Live (main branch):** https://bereket18x2.github.io/  
**Repository:** https://github.com/Bereket18x2/bereket18x2.github.io

## What works

- Parent accounts and teacher requests through Firebase Authentication.
- Email verification, role-specific dashboards, teacher assignments and teacher-managed payment confirmation.
- Browser-based video playback, practice quizzes, watch-time and lesson progress.
- Parent-visible teacher comments/questions and consent/deletion request records.
- Amharic/English switch on supported pages and day/night themes.
- GitHub Pages hosting without bundling the website.

## Current limitations — read before enrollment

- **Curriculum is incomplete.** Twelve subjects are listed; the first Bible lesson is still a **draft** with a placeholder instructor, summary and questions. Do not present a draft as teacher-approved content or charge families for a complete curriculum before it exists.
- **Parent/guardian consent has not been legally reviewed.** Do not enroll real children until the parish has obtained qualified advice and approved its consent procedure.
- **Quiz scores and attendance evidence are submitted by a browser.** They are useful for practice and observation, not independently verified grades. High-stakes grading and authoritative certificates require trusted server-side grading or teacher attestation.
- **Card payments are not connected.** Families arrange payment directly with the parish; authorized staff records it. No card digits are handled here. Manual payment records are now written in atomic batches with their associated access grants, but payment-provider reconciliation and idempotency remain future work.
- **Paid video is not DRM-protected.** The unlisted YouTube IDs live in public JS; access restrictions are a website UI gate, not secure video authorization. See [docs/PAYMENTS.md](docs/PAYMENTS.md).
- **Account deletion/retention needs a documented parish process.** See [docs/RETENTION.md](docs/RETENTION.md) and [docs/DELETION.md](docs/DELETION.md).

See [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) for the prerequisites to launch.

## Stack

Plain HTML, CSS and JavaScript ES modules. Firebase Auth and Cloud Firestore, with SDK 10.12.2 imported from the gstatic CDN. GitHub Pages hosts the static website. There is no frontend npm install and no build step. The separate `tools/` directory uses Node/npm only for local maintenance scripts and Firestore emulator tests.

## Structure

```text
index.html           Homepage, subjects, prices, sign-in
register.html        Parent and teacher registration
dashboard.html       Family learning and progress
lesson.html          Playback, watch coverage, practice quizzes
journey.html         Learning journey
teacher.html         Assigned student roster, payments, comments
admin.html           Staff approval and student assignments
billing.html         Current manual payment process
privacy.html         Privacy policy
terms.html           Terms
assets/css/style.css Main shared design system
assets/js/config.js  Firebase public config, pricing, countries
assets/js/lessons.js Curriculum (single source of truth)
assets/js/store.js   Firebase data-access layer
assets/js/validators.js Enrollment validators
firestore.rules      Server-enforced permissions and enrollment rules
tests/              Browser-independent regression tests
tools/              Firestore emulator tests and maintenance helpers
```

## Local preview

```bash
python -m http.server 8000
```

Open http://localhost:8000. Running the HTML by double-clicking a `file://` URL is unsupported because ES modules and auth use web origins. A local preview may require a Firebase-authorized domain for authentication.

## Tests

From the repository root, run the JavaScript tests:

```bash
for f in tests/*.test.mjs; do node "$f" || exit 1; done
```

For Firestore rule integration tests, use the emulator:

```bash
cd tools
npm install
npm run test:rules
```

Changes to `firestore.rules` are **not** live until the repository owner separately deploys them. Do not deploy production rules without a passing emulator suite and an explicit review of permissions.

## Deployment

GitHub Pages: repository **Settings → Pages → Deploy from a branch → main / (root)**. The root-level `.nojekyll` file must remain. The correct user-page URL is `https://bereket18x2.github.io/`, not the old `/eotc-bible-school/` path.

The Firebase project is `finote-yared`; `firebase.json` configures Firestore rules and indexes. The Firebase client API key in `config.js` is public by design. Authorization is enforced by Authentication and Firestore rules, not by hiding that key.

**Maintainership:** Read [CLAUDE.md](CLAUDE.md) before changing architecture, branding, translations, deployment or data collection. Parish decisions are documented in [docs/CHURCH-DECISIONS.md](docs/CHURCH-DECISIONS.md).

© TewahedoDevs. All rights reserved. See [LICENSE](LICENSE).
