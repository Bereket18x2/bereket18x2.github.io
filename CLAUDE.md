# CLAUDE.md

Project context for Claude Code. Read this before making any change.

## What this is

**Finote Yared** — an Amharic-language Ethiopian Orthodox Tewahedo (EOTC) school for
children in the US diaspora. Two tracks:

1. **Bible study** — preachers upload 10–20 minute video lessons; students watch,
   answer questions, and the hosts see who is actually learning.
2. **Zema (ዜማ)** — the chant school, beginning at ወንጌለ ዮሐንስ and running through
   ድጓ / ጾመ ድጓ / ምዕራፍ / ዝማሬ / መዋሥዕት / ቅዳሴ, with St. Yared's three modes
   (ግዕዝ, ዕዝል, አራራይ) and አቋቋም.

Live: `https://bereket18x2.github.io/`
Repo: `Bereket18x2/bereket18x2.github.io` (named for the root URL — see Naming)
Firebase project: `finote-yared` (Spark plan, Firestore in nam5)

## Naming

The school is ፍኖተ ያሬድ — "the path of Yared." Note ፍ, not ፊ.
English: Finote Yared. Repo, domain, and Firebase project use
finote-yared / finoteyared. Never write ፊኖተ.

የቅዱሳት መጻሕፍት ትምህርት ቤት names the Bible TRACK only, not the school.
The school also runs the Zema track. Do not use it as the school name.

One exception to the repo half of that rule: the GitHub repo is
`bereket18x2.github.io`, because a user-page repo must carry that exact name
to serve from the root URL. The local directory and the Firebase project are
both `finote-yared`.

## Stack — do not change without asking

- Plain HTML + CSS + vanilla JS, native ES modules. **No framework, no bundler,
  no npm, no build step.** It must stay directly deployable to GitHub Pages.
- **One deliberate exception:** `tools/` may use npm. That rule exists so the
  SITE stays buildless; a local operator script that never reaches a browser is
  not the same thing. `tools/export.mjs` uses `firebase-admin`, and
  `tools/node_modules` is gitignored. Nothing under `tools/` may ever be
  imported by a page.
- Firebase SDK from `https://www.gstatic.com/firebasejs/10.12.2/` — pinned version.
- `.nojekyll` at root. Never delete it.
- All paths relative (`./assets/...`). The site is served from a subpath, so
  absolute paths 404.

## Files

```
index.html      landing + both tracks + sign-in (#signin)
login.html      forwarding stub only — real sign-in lives on index
register.html   account creation
dashboard.html  student: lessons, study hours, average score
lesson.html     video + watch-time heartbeat + quiz
admin.html      teacher: roster, hours, last online, scores
checkout.html   3D card mirror (visual only)
billing.html    pricing
assets/js/config.js   Firebase config — PUBLIC BY DESIGN
assets/js/store.js    ← ONLY file that touches storage
assets/js/lessons.js  ← curriculum
assets/js/sky.js      ← canvas starfield
assets/css/style.css  ← single stylesheet, tokens at :root
firestore.rules       ← the actual security model
```

## Architecture rules

**`store.js` is the storage boundary.** No page imports firebase directly. If a page
needs data, add a method to `store.js`. Every method is async; callers await.

**`ready()` must be awaited before any auth decision.** Auth state is not known
synchronously. Skip it and every refresh bounces a signed-in parent to sign-in.

**Firestore bills per write.** `lesson.html` accumulates watch time every 5s on screen
but writes only every 30s. Never make this write more often. Flush on stop,
visibilitychange, and pagehide; a failed flush returns its seconds to `pending`.

**Study hours come from playback, not a stopwatch.** Seconds bank only while the player
reports PLAYING. Never replace this with a timer that runs regardless.

**Never handle raw card numbers.** The card in `checkout.html` is a visual mirror with a
warning label. Real digits must live in Stripe Elements iframes. Any code that reads,
stores, logs, or transmits a PAN puts the project in PCI DSS scope.

**Never host video in Firebase Storage.** A 20-min lesson is ~200MB; egress costs are
punitive. Unlisted YouTube, or Bunny/Cloudflare Stream later.

**Payments:** Stripe does not support merchants in Ethiopia. The US parish holds the
Stripe account; Payoneer moves the developer's share to Addis. Do not build anything
that assumes an Ethiopian merchant account.

## Security — these are children's records

`paid`, `role`, `email`, `uid`, `createdAt` are never client-writable. `paid` is set by
a Stripe webhook or a teacher in the console. `verified` may only be written to match
`request.auth.token.email_verified`. `studySeconds` may only rise, by at most 120 per
write. `admin.html` requires `role == 'admin'` — without it, it is a public list of
children's names and emails.

Creation is a write. Any field a client can set at create time is a field they
control, and no update rule will ever see it. Every create rule uses `hasOnly`
with an exact key whitelist.

Making someone an admin is done by hand in the Firebase console. The rules deliberately
prevent it from the browser — including for another admin, so a stolen session cannot
mint a second permanent one. This is not a bug.

Collect the minimum. Every extra field about a minor is a field you must protect. Before
adding one, say what it is for.

**Where the privacy policy and the code disagree, the code changes.** Any edit that
would make a statement in `privacy.html` false is not permitted without also updating
the policy — and the policy may only describe what the code actually does. This runs
in one direction on purpose: it is always legitimate to make the code match a promise
already made to parents, and never legitimate to weaken the promise to suit the code.
See `docs/RETENTION.md` for the open questions the policy currently answers honestly
but incompletely.

**The consent mechanism has NOT been legally reviewed, and must be before launch.**
Registration takes a parent's affirmation by checkbox plus a verified parent email.
The Bible track admits children aged 7–13, which is squarely inside COPPA. A
self-attested checkbox is generally held insufficient as "verifiable parental
consent" on its own; the verified email resembles the FTC's "email plus" method but
was not built to satisfy it. `privacy.html` therefore describes exactly what the code
does and claims nothing further. Do not add compliance language to it without a
lawyer. This is the one open item that should gate real families enrolling.

The Firebase API key is public by design and ships in every web app. Security is the
rules, not the key. Do not "fix" it by hiding it.

## Quality floor

- All UI copy in Amharic. Ask before adding English-only strings.
- Firebase error codes mapped to Amharic. No raw code reaches a parent.
- Responsive to 360px.
- Visible gold `:focus-visible` ring on every interactive element.
- `prefers-reduced-motion: reduce` respected — starfield still, card flip instant.
- Canvas animation pauses on `visibilitychange`.
- Design tokens only, no hardcoded hex. Palette is Ge'ez manuscript: sanctuary blue
  ground, gold leaf, rubric crimson, parchment. Keep the harag interlace band and the
  Ge'ez numerals — both carry real meaning, not decoration.

## How to deliver changes

- Small edits: edit in place.
- Large rewrites: replace the whole file. Do not hand me fragments to paste — pasting
  into VS Code duplicates brackets and I have lost time to this.
- Run `python -m http.server 8000` and verify in a browser before reporting done.
- Never run `firebase login` or `firebase deploy`. Leave rules in the repo; I deploy.
- One logical change per commit, imperative message.
- Flag deviations from my spec explicitly rather than silently complying.
