# የቅዱሳት መጻሕፍት ትምህርት ቤት — EOTC Online Bible School

Amharic-language Orthodox Tewahedo Bible school for children in the diaspora.
Video lessons → quizzes → attendance and study-hour tracking for the hosts.

**Phase 1 (this repo):** static site, deployable to GitHub Pages today. Data lives in
`localStorage` so every screen is real and clickable without a backend.
**Phase 2 (done):** `assets/js/store.js` now runs on Firebase Auth + Firestore.

© TewahedoDevs. All rights reserved — see [LICENSE](LICENSE). Visible on GitHub for
transparency and GitHub Pages hosting; that is not a license to copy or redeploy it.

---

## Deploy to GitHub Pages

```bash
cd eotc-bible-school
git init
git add .
git commit -m "Phase 1: static scaffold"
git branch -M main
git remote add origin https://github.com/Bereket18x2/eotc-bible-school.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save.**

Live in ~60 seconds at `https://bereket18x2.github.io/eotc-bible-school/`

`.nojekyll` is included so Jekyll doesn't touch the `assets/` folder.

---

## Add your videos

1. Upload the sermon to YouTube, visibility **Unlisted** (playable by link, not searchable, free bandwidth).
2. Copy the ID out of the URL: `youtube.com/watch?v=`**`dQw4w9WgXcQ`**
3. Paste it into `assets/js/lessons.js`:

```js
{ id: 'l1', num: '፩', title: '…', youtube: 'dQw4w9WgXcQ', … }
```

The player auto-loads and watch-time tracking turns on. Editing lessons, questions, and
teacher names is all done in that one file.

---

## Three decisions worth making now

**1. Don't host video on Firebase Storage.** A 20-minute lesson is ~200 MB. Fifty students
watching it once is 10 GB of egress. Firebase bills that. Unlisted YouTube is free; if you
outgrow it (want no YouTube branding, want per-student watch analytics), move to
Bunny Stream or Cloudflare Stream, not Firebase.

**2. The account belongs to the parent, not the child.** Registration is already built this
way. For US children under 13, COPPA requires verifiable parental consent before you collect
personal information — and Stripe requires the payer to be 18+ regardless. One parent account
holding student profiles solves both, and it's very painful to retrofit. Get a real answer
from someone who knows US nonprofit/education law before you launch to paying families.

**3. Study hours must come from the video, not a stopwatch.** `lesson.html` only banks seconds
while the YouTube player reports `PLAYING`, and stops on tab-hide. A student can still leave
it playing in a corner — if that matters, add a "still watching?" prompt every 5 minutes.

---

## Phase 2 — Firebase ✅ done

Live on Firebase Auth + Firestore (project `finote-yared`). The SDK loads from the
gstatic CDN as ES modules — still no npm, no bundler, no build step, still deployable
to GitHub Pages as plain files. `store.js` is still the only file that touches storage.

Every `Store` method is now **async**, and `ready()` is new and important: Firebase
restores a session asynchronously, so without awaiting it every refresh would bounce a
signed-in parent back to sign-in.

| Method | Backed by |
|---|---|
| `Store.createUser()` | `createUserWithEmailAndPassword()` + doc write + `sendEmailVerification()` |
| `Store.signIn()` | `signInWithEmailAndPassword()` |
| `Store.current()` | `getDoc(users/{uid})` + progress + `emailVerified` off the token |
| `Store.addStudySeconds(n)` | `updateDoc(ref, { studySeconds: increment(n) })` |
| `Store.saveQuiz()` | `setDoc(doc(db,'users',uid,'progress',lessonId), …)` |
| `Store.allUsers()` | `getDocs(query(collection(db,'users'), where('role','==','student')))` |
| `ready()` | resolves on the first `onAuthStateChanged`, then cached |

### Deploy the rules

`firestore.rules` is in the repo root. It is the actual security boundary:

```bash
firebase deploy --only firestore:rules
```

### Making yourself an admin

`admin.html` requires `role == 'admin'`, and the rules forbid the client from writing
`role` — deliberately, so nobody promotes themselves. Set it by hand once, in the
Firebase console: Firestore → `users` → your uid → change `role` to `admin`.

The same applies to `paid`: it is confirmed by an admin (later a server-side Stripe
webhook), never from the browser.

Firestore shape:

```
users/{uid}
  fullName, email, role, age, guardian, location, country,
  verified, paid, createdAt, lastSeen, studySeconds
users/{uid}/progress/{lessonId}
  done, score, of, at
lessons/{lessonId}          ← move out of lessons.js once hosts can edit
```

See `firestore.rules` for the real thing — students read only their own row, admins read
everyone, and no client can write `paid`, `role`, `email`, `uid`, or `createdAt`.
`studySeconds` may only increase, by at most 120s per write.

Firebase API keys in client code are public by design — every Firebase web app ships
them. Security is the rules, not the key. `assets/js/config.js` says so at length so
nobody "fixes" it later by hiding it.

## Phase 3 — Payments

Start with a **Stripe Payment Link** — no backend, works on GitHub Pages, live in ten minutes,
and accepts Visa, Mastercard, and American Express by default. Create one in the Stripe
dashboard, then paste its URL into `STRIPE_PAYMENT_LINK` at the top of `assets/js/store.js`.
`billing.html` (linked from the pay banner on `dashboard.html`) picks it up automatically and
sends the parent to Stripe's hosted checkout with their email pre-filled — no card data ever
touches this site. Until it's configured, `billing.html` shows a "ማሳያ ክፍያ" demo button instead,
same spirit as the demo login on `index.html`.

At first, flip `paid` by hand from the admin page after Stripe emails you.

To automate it you need a server for the webhook, which GitHub Pages can't do. That's the
point where you either add a Firebase Cloud Function (needs the Blaze plan) or move hosting
to Firebase Hosting / Netlify Functions. Nothing else about the site has to move with it.

---

## Files

```
index.html        landing + pricing + sign in (#signin, demo: sara@example.com, blank password)
register.html     parent creates account, student profile under it
login.html        redirects to index.html#signin (kept for old links/bookmarks)
dashboard.html    student: lesson list, hours, average score
billing.html      $25/mo plan, accepted cards, Stripe hand-off, demo pay
lesson.html       video + watch-time heartbeat + quiz
admin.html        host: roster, hours, last online, scores
assets/js/store.js    ← the only file that touches storage (Firebase lives here)
assets/js/config.js   ← Firebase project config (public by design — read the comment)
assets/js/lessons.js  ← curriculum: titles, teachers, videos, questions
assets/js/sky.js      ← starfield backdrop
assets/js/i18n.js     ← Amharic/English toggle (homepage + register)
firestore.rules       ← the real security boundary; deploy it after editing
assets/css/style.css
```

Teacher names and the six lessons are placeholders with real EOTC content — replace with your
own. Quiz answers cover the three councils, seven hours of prayer, seven fasts, fourteen
anaphoras, the parts of repentance, and the ten orders of angels.
