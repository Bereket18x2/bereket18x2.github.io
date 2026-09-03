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

Live: `https://bereket18x2.github.io/finote-yared/`
Repo: `Bereket18x2/finote-yared`
Firebase project: `finote-yared` (Spark plan, Firestore in nam5)

## Stack — do not change without asking

- Plain HTML + CSS + vanilla JS, native ES modules. **No framework, no bundler,
  no npm, no build step.** It must stay directly deployable to GitHub Pages.
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

Making someone an admin is done by hand in the Firebase console. The rules deliberately
prevent it from the browser. This is not a bug.

Collect the minimum. Every extra field about a minor is a field you must protect. Before
adding one, say what it is for.

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
