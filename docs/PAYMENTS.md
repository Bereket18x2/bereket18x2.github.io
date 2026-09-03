# Payments

Status: **card payment is not connected.** The billing UI is built, the gate
is enforced, and `paid` is set by a teacher from `admin.html`. This document
describes what automatic payment would take, and what is honestly true about
the lock in the meantime.

---

## Read this first: the lock is UX, not enforcement

Lessons are unlisted YouTube videos, and the video IDs live in
`assets/js/lessons.js`, which every visitor downloads. Anyone who opens
devtools can read the ID of a locked lesson and watch it on YouTube directly.

The paywall stops an honest parent from wandering into paid content. It does
not stop a determined one. **Do not describe it to families as though it
does.** Nothing in this repo should imply the content is sealed.

Real enforcement means the video is served from something that can check who
is asking — signed URLs from Bunny Stream or Cloudflare Stream, roughly
$5–20/month at this scale, plus per-GB egress. That is a real cost against a
real benefit, and it is a decision to make deliberately later, not something
to fake now. Until then this file is the honest record of the limitation.

The same applies to the watch-coverage rule in `assets/js/coverage.js`: it
defeats *seeking to the end*, which is the common case, but a student who
deliberately scrubs bucket by bucket can still register coverage. It is an
attendance measure, not an anti-cheat system.

## What is enforced

| Thing | Enforced by | Real? |
|---|---|---|
| Only the account owner reads their record | `firestore.rules` | Yes |
| Only an admin reads the whole roster | `firestore.rules` | Yes |
| No client can write `paid`, `role`, `email`, `uid`, `createdAt` | `firestore.rules` | Yes |
| `studySeconds` only rises, ≤120 per write | `firestore.rules` | Yes |
| Quiz results require a verified email | `firestore.rules` | Yes |
| Locked lessons are not playable in the UI | `requireAuth({requirePaid})` | **No — UI only** |

## Why there is no Stripe integration yet

Two blockers, one technical and one organisational.

**Organisational.** Stripe does not support merchants in Ethiopia. The Stripe
account has to belong to the US parish, and the developer's share moves
separately (Payoneer). Nothing in this codebase may assume an Ethiopian
merchant account.

**Technical.** GitHub Pages serves static files and cannot run a webhook.
Without a webhook there is no trustworthy way to learn that a payment
succeeded — a browser redirect saying `?paid=true` is a URL anyone can type,
so honouring it would hand out free subscriptions.

So the automatic flow needs somewhere to run server code. Cloud Functions
requires the Blaze plan; Netlify Functions is free at this volume. Either
works. Until one exists, a teacher confirms payment by hand, which is
correct and safe — just manual.

## The automatic flow, when it is time

```
browser                      server (Cloud Function)        Stripe
  |  createCheckoutSession  ------->                          |
  |                          create session (amount, uid) --> |
  |  <---- session url -----                                  |
  |  redirect to Stripe hosted checkout ---------------------->|
  |                                                            |
  |                          <-- webhook: checkout.completed --|
  |                          verify signature                  |
  |                          set users/{uid}.paid = true       |
```

Two things make this trustworthy, and both must be kept:

1. **The amount is decided on the server**, never sent from the browser.
   A client-supplied price is a client-supplied discount.
2. **The webhook signature is verified** with `stripe.webhooks.constructEvent`.
   An unverified webhook endpoint is a public "make me paid" button.

`client_reference_id` carries the Firebase uid through Stripe and back, which
is how the webhook knows whose document to update.

### Cloud Function source, ready to deploy

Not added to the repo as a `functions/` directory yet — deploying it requires
the Blaze plan and a Stripe account that does not exist. When both are ready,
`firebase init functions`, drop this in, and set the secrets.

```js
// functions/index.js
const { onRequest, onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const STRIPE_SECRET = defineSecret('STRIPE_SECRET');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

admin.initializeApp();

const PRICE_CENTS = 2500;          // keep in step with PRICE_USD in config.js
const SITE = 'https://bereket18x2.github.io';

/* Called from the browser by a signed-in parent. The price is set HERE,
   not passed in, so nobody can check out at a price of their choosing. */
exports.createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET] },
  async (request) => {
    if (!request.auth) throw new Error('unauthenticated');
    const uid = request.auth.uid;

    const stripe = require('stripe')(STRIPE_SECRET.value());
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) throw new Error('no such user');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: uid,               // how the webhook finds them again
      customer_email: userDoc.data().email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_CENTS,
          recurring: { interval: 'month' },
          product_data: { name: 'የቅዱሳት መጻሕፍት ትምህርት ቤት — ወርኃዊ ደንበኝነት' }
        }
      }],
      success_url: `${SITE}/dashboard.html`,
      cancel_url: `${SITE}/billing.html`
    });

    return { url: session.url };
  }
);

/* The only thing that may set paid = true. Runs with admin credentials,
   so it bypasses the security rules that stop the browser doing this. */
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const stripe = require('stripe')(STRIPE_SECRET.value());
    let event;
    try {
      // req.rawBody, not req.body — a parsed body fails signature checking
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'],
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) {
      console.error('bad signature', err.message);
      return res.status(400).send('bad signature');   // never trust an unverified event
    }

    const db = admin.firestore();

    if (event.type === 'checkout.session.completed') {
      const uid = event.data.object.client_reference_id;
      if (uid) {
        await db.doc(`users/${uid}`).set({
          paid: true,
          stripeCustomerId: event.data.object.customer,
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }

    // A subscription that lapses must close the door again, or the first
    // month's payment buys permanent access.
    if (event.type === 'customer.subscription.deleted' ||
        event.type === 'invoice.payment_failed') {
      const customer = event.data.object.customer;
      const hit = await db.collection('users')
        .where('stripeCustomerId', '==', customer).limit(1).get();
      if (!hit.empty) await hit.docs[0].ref.set({ paid: false }, { merge: true });
    }

    res.json({ received: true });
  }
);
```

Deploy:

```bash
firebase functions:secrets:set STRIPE_SECRET
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase deploy --only functions
```

Then point a Stripe webhook endpoint at the deployed `stripeWebhook` URL and
subscribe it to `checkout.session.completed`,
`customer.subscription.deleted`, and `invoice.payment_failed`.

### Rules change that will be needed

`paid` is currently writable only by an admin. The Cloud Function uses the
Admin SDK, which bypasses rules entirely, so **no rules change is required** —
the function writes as a privileged server, not as a client. Leave the client
restriction exactly as it is.

## Meanwhile: confirming a payment by hand

1. Parent arranges payment using the contact shown on `billing.html`
   (`CHURCH_CONTACT` in `assets/js/config.js` — one place to change it).
2. Teacher signs in, opens `admin.html`, finds the student, presses
   **ክፍያ አረጋግጥ**.
3. That calls `Store.setPaid(uid, true)`, which the rules permit only for an
   account whose own document says `role == 'admin'`.

A student pressing the same button gets a permission error, because the rules
check the caller's role rather than trusting the page.
