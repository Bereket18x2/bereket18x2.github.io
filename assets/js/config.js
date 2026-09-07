/* ===========================================================
   config.js — Firebase project configuration.

   THESE VALUES ARE PUBLIC BY DESIGN. Do not "fix" this later by
   hiding the key in an env var, a build step, or a server proxy —
   there is nothing to hide. Every Firebase web app ships this exact
   block in its client bundle; Google documents it as public. The
   apiKey is a project identifier for routing requests, not a secret
   and not a credential.

   What actually protects your data is firestore.rules (in the repo
   root) plus Firebase Auth. If the rules are right, a stranger with
   this config can do nothing they could not already do. If the rules
   are wrong, hiding this config saves you nothing.
   =========================================================== */

export const firebaseConfig = {
  apiKey: "AIzaSyARXhyCD9PeZ24e6bcNF7l7dwhqdK6nO7Q",
  authDomain: "finote-yared.firebaseapp.com",
  projectId: "finote-yared",
  storageBucket: "finote-yared.firebasestorage.app",
  messagingSenderId: "828888713418",
  appId: "1:828888713418:web:0db10658af6e83ae220c33"
};

/* ---------------- pricing ----------------

   Every figure the site quotes lives here, so a parish changes what it
   charges by editing this block and nothing else. The terms page renders
   its price table from these values, which means the terms can never
   quote a number the site does not charge.

   BIBLE is a three-month course. A parent either pays monthly or prepays
   the term at a discount. There is NO auto-renewal: the term ends and the
   parent chooses again, deliberately.

   ZEMA is a flat price whatever subjects are chosen — which is exactly
   why registration ticks all five by default. A parent who unticks gains
   nothing today and pays to undo it later, so unticking has to be a
   deliberate act rather than an oversight.

   Payment is arranged by hand (docs/PAYMENTS.md). Nothing here talks to
   Stripe, and `paid`, `amountPaid` and `paidUntil` are written by a
   teacher or admin, never by a student. */
export const PRICING = {
  bible: {
    track: 'bible',
    monthlyUSD: 40,
    termMonths: 3,
    termPrepaidUSD: 105,
    get termFullUSD() { return this.monthlyUSD * this.termMonths; },   // 120
    get termSavingUSD() { return this.termFullUSD - this.termPrepaidUSD; } // 15
  },
  zema: {
    track: 'zema',
    flatUSD: 30,
    // adding a subject after enrolment, once the selection is fixed
    addSubjectUSD: 10
  }
};

/* What a given enrolment costs, so the figure on screen and the figure a
   teacher records come from the same function rather than two sums that
   can drift apart. */
export function priceFor(track, { prepaidTerm = false } = {}) {
  if (track === 'bible') {
    return prepaidTerm ? PRICING.bible.termPrepaidUSD : PRICING.bible.monthlyUSD;
  }
  if (track === 'zema') return PRICING.zema.flatUSD;
  return null;
}

/* The version of privacy.html + terms.html a parent agreed to, recorded on
   their account at registration. Date-stamped rather than numbered so it is
   obvious which text was in force. Change it when the substance of either
   document changes — not for a typo — and existing parents can then be asked
   to agree again, because the record will no longer match. */
export const CONSENT_VERSION = '2026-09-07';

/* Card payment is not live yet (see docs/PAYMENTS.md). Until it is, the
   billing page tells parents how to arrange payment with the church
   directly. One constant, so changing the number or the address is one
   edit rather than a search across every page. */
export const CHURCH_CONTACT = {
  name: 'ፍኖተ ያሬድ · TewahedoDevs',
  email: 'info@example.org',
  phone: '+1 (000) 000-0000'
};
