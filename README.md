# የቅዱሳት መጻሕፍት ትምህርት ቤት — EOTC Online Bible School

Amharic-language Orthodox Tewahedo Bible school for children in the diaspora.
Video lessons → quizzes → attendance and study-hour tracking for the hosts.

**Phase 1 (this repo):** static site, deployable to GitHub Pages today. Data lives in
`localStorage` so every screen is real and clickable without a backend.
**Phase 2:** swap `assets/js/store.js` for Firebase. Nothing else changes.

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

## Phase 2 — Firebase

Only `store.js` changes. Same function names, same return shapes.

| Now | Then |
|---|---|
| `Store.createUser()` | `createUserWithEmailAndPassword()` + `sendEmailVerification()` |
| `Store.signIn()` | `signInWithEmailAndPassword()` |
| `Store.current()` | `onAuthStateChanged()` |
| `Store.addStudySeconds(5)` | `updateDoc(ref, { studySeconds: increment(5) })` |
| `Store.saveQuiz()` | `setDoc(doc(db,'users',uid,'progress',lessonId), …)` |
| `Store.allUsers()` | `getDocs(query(collection(db,'users'), where('role','==','student')))` |

Firestore shape:

```
users/{uid}
  fullName, email, role, age, guardian, location, country,
  verified, paid, createdAt, lastSeen, studySeconds
users/{uid}/progress/{lessonId}
  done, score, of, at
lessons/{lessonId}          ← move out of lessons.js once hosts can edit
```

Rules sketch — students read only themselves, admins read everyone, nobody writes `paid`:

```
match /users/{uid} {
  allow read: if request.auth.uid == uid || isAdmin();
  allow update: if request.auth.uid == uid
    && !request.resource.data.diff(resource.data).affectedKeys()
         .hasAny(['paid','role','verified']);
}
```

Firebase API keys in client code are public by design. Security is the rules, not the key.

## Phase 3 — Payments

Start with a **Stripe Payment Link** — no backend, works on GitHub Pages, live in ten minutes.
Wire it to the `payLink` button in `dashboard.html`. At first, flip `paid` by hand from the
admin page after Stripe emails you.

To automate it you need a server for the webhook, which GitHub Pages can't do. That's the
point where you either add a Firebase Cloud Function (needs the Blaze plan) or move hosting
to Firebase Hosting / Netlify Functions. Nothing else about the site has to move with it.

---

## Files

```
index.html        landing + pricing
register.html     parent creates account, student profile under it
login.html        sign in  (demo: sara@example.com, blank password)
dashboard.html    student: lesson list, hours, average score
lesson.html       video + watch-time heartbeat + quiz
admin.html        host: roster, hours, last online, scores
assets/js/store.js    ← the only file that touches storage
assets/js/lessons.js  ← curriculum: titles, teachers, videos, questions
assets/css/style.css
```

Teacher names and the six lessons are placeholders with real EOTC content — replace with your
own. Quiz answers cover the three councils, seven hours of prayer, seven fasts, fourteen
anaphoras, the parts of repentance, and the ten orders of angels.
