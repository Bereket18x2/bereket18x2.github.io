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

/* ---------------- enrollment tiers ----------------

   Every price the site quotes comes from here, so a parish changes what
   it charges by editing this block and nothing else.

   `subjects` lists the subject ids from lessons.js that the tier opens.
   zema_full NESTS zema_basic: ወንጌለ ዮሐንስ comes before አቋቋም in the
   traditional order and a student cannot sensibly skip it, so the $30
   tier contains the $20 one rather than sitting beside it.

   Remedial support is included in every tier. A student who needs more
   help is not charged more for needing it.

   Payment is still arranged by hand — see docs/PAYMENTS.md. Nothing here
   talks to Stripe, and `paid` remains un-writable by any client. */
export const TIERS = {
  bible: {
    id: 'bible',
    track: 'bible',
    priceUSD: 40,
    am: 'የቅዱሳት መጻሕፍት ትምህርት',
    en: 'Bible study',
    blurbAm: 'አምስቱም የመጽሐፍ ቅዱስ ትምህርት ክፍሎች፤ ጥያቄዎች፣ ፈተናዎችና የምስክር ወረቀት።',
    blurbEn: 'All five Bible subjects, with quizzes, exams and certificates.',
    subjects: ['amestu', 'sirate', 'meshaftarik', 'betekrtarik', 'sinemigbar']
  },
  zema_full: {
    id: 'zema_full',
    track: 'zema',
    priceUSD: 30,
    am: 'ሙሉ ዜማ',
    en: 'Full Zema',
    blurbAm: 'የመሠረታዊ ዜማውን ሁሉ ጨምሮ አቋቋምና ዜማ።',
    blurbEn: 'Everything in Basic Zema, plus Aquaquam and Zema.',
    subjects: ['wengele', 'wudase', 'mezmur', 'aquaquam', 'zemaadv']
  },
  zema_basic: {
    id: 'zema_basic',
    track: 'zema',
    priceUSD: 20,
    am: 'መሠረታዊ ዜማ',
    en: 'Basic Zema',
    blurbAm: 'ወንጌለ ዮሐንስ፣ ውዳሴ ማርያምና መዝሙረ ዳዊት።',
    blurbEn: 'Wengele Yohannes, Wudase Maryam and Mezmure Dawit.',
    subjects: ['wengele', 'wudase', 'mezmur']
  }
};

export const tierById = (id) => TIERS[id] || null;

/* The subjects a tier opens. Returns ids; the caller resolves them against
   lessons.js, which keeps this file free of curriculum imports so it stays
   loadable on its own. */
export const subjectIdsOfTier = (tierId) => TIERS[tierId]?.subjects ?? [];

/* Ordered cheapest-first for the pricing list, so a parent reads up rather
   than down and the smallest commitment is the easiest to find. */
export const tiersByPrice = () =>
  Object.values(TIERS).sort((a, b) => a.priceUSD - b.priceUSD);

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
