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
   why registration ticks every subject by default. A parent who unticks gains
   nothing today and pays to undo it later, so unticking has to be a
   deliberate act rather than an oversight.

   Payment is arranged by hand (docs/PAYMENTS.md). Nothing here talks to
   Stripe, and `paid`, `amountPaid` and `paidUntil` are written by a
   teacher or admin, never by a student. */
export const PRICING = {
  bible: {
    track: 'bible',
    monthlyUSD: 50,
    termMonths: 3,
    /* Moved with the monthly price, deliberately. When monthly went
       $40 -> $50 this stayed at $105 and the term discount silently
       tripled from $15 to $45. $135 restores the $15 saving the original
       $105-against-$120 offer made. tests/pricing.test.mjs asserts the
       SAVING rather than the figure, so the next price change fails
       loudly instead of quietly becoming a giveaway. */
    termPrepaidUSD: 135,
    get termFullUSD() { return this.monthlyUSD * this.termMonths; },   // 150
    get termSavingUSD() { return this.termFullUSD - this.termPrepaidUSD; } // 15
  },
  zema: {
    track: 'zema',
    flatUSD: 40,
    // adding a subject after enrolment, once the selection is fixed
    addSubjectUSD: 10
  },

  /* ---------------- regional variation ----------------

     An EXPLICIT TABLE. Never computed, never inferred from a country
     string at runtime: a price that is calculated is a price nobody can
     check, and the one thing a parish must be able to do is read what it
     charges and see that it is right.

     Every region currently sits at the base price. That is deliberate —
     what a family in Addis should pay versus one in Seattle is a
     decision for the parish, not a number a developer invents. The table
     exists so that setting it is editing figures here, and nothing else
     anywhere changes.

     To vary a region, replace null with { bible, zema } in USD:

         ETHIOPIA: { bible: 20, zema: 15 },

     `region` is written on the account at registration and locked by
     firestore.rules, so a parent cannot move themselves to a cheaper
     region — which is the only reason the field needs protecting. */
  byRegion: {
    ETHIOPIA:      null,
    AFRICA:        null,
    NORTH_AMERICA: null,
    EUROPE:        null,
    ASIA:          null,
    OTHER:         null
  }
};

/* ---------------- where the family is ----------------

   Asked at registration so the parish knows who it is serving, and so
   regional pricing has something to key off. Both `country` and `region`
   are locked by firestore.rules after create.

   Region ids are the six the school uses. They are duplicated as a
   literal list inside firestore.rules, which cannot import this file —
   change one and change the other. */
export const REGIONS = {
  ETHIOPIA:      { id: 'ETHIOPIA',      am: 'ኢትዮጵያ',            en: 'Ethiopia' },
  AFRICA:        { id: 'AFRICA',        am: 'አፍሪካ',             en: 'Africa' },
  NORTH_AMERICA: { id: 'NORTH_AMERICA', am: 'ሰሜን አሜሪካ',         en: 'North America' },
  EUROPE:        { id: 'EUROPE',        am: 'አውሮፓ',             en: 'Europe' },
  ASIA:          { id: 'ASIA',          am: 'እስያ',              en: 'Asia' },
  OTHER:         { id: 'OTHER',         am: 'ሌላ',               en: 'Other' }
};

export const REGION_IDS = Object.keys(REGIONS);

/* ISO 3166-1 alpha-2, the region it belongs to, and the local currency
   used only for the approximate figure below. `ZZ` is deliberate: a
   family whose country is not listed must still be able to register, and
   a school does not turn a child away over a dropdown. */
export const COUNTRIES = [
  { code: 'ET', region: 'ETHIOPIA', currency: 'ETB', am: 'ኢትዮጵያ', en: 'Ethiopia' },

  { code: 'KE', region: 'AFRICA', currency: 'KES', am: 'ኬንያ', en: 'Kenya' },
  { code: 'SD', region: 'AFRICA', currency: 'SDG', am: 'ሱዳን', en: 'Sudan' },
  { code: 'SS', region: 'AFRICA', currency: 'SSP', am: 'ደቡብ ሱዳን', en: 'South Sudan' },
  { code: 'DJ', region: 'AFRICA', currency: 'DJF', am: 'ጅቡቲ', en: 'Djibouti' },
  { code: 'SO', region: 'AFRICA', currency: 'SOS', am: 'ሶማሊያ', en: 'Somalia' },
  { code: 'ER', region: 'AFRICA', currency: 'ERN', am: 'ኤርትራ', en: 'Eritrea' },
  { code: 'EG', region: 'AFRICA', currency: 'EGP', am: 'ግብጽ', en: 'Egypt' },
  { code: 'ZA', region: 'AFRICA', currency: 'ZAR', am: 'ደቡብ አፍሪካ', en: 'South Africa' },
  { code: 'TZ', region: 'AFRICA', currency: 'TZS', am: 'ታንዛኒያ', en: 'Tanzania' },
  { code: 'UG', region: 'AFRICA', currency: 'UGX', am: 'ኡጋንዳ', en: 'Uganda' },

  { code: 'US', region: 'NORTH_AMERICA', currency: 'USD', am: 'አሜሪካ', en: 'United States' },
  { code: 'CA', region: 'NORTH_AMERICA', currency: 'CAD', am: 'ካናዳ', en: 'Canada' },
  { code: 'MX', region: 'NORTH_AMERICA', currency: 'MXN', am: 'ሜክሲኮ', en: 'Mexico' },

  { code: 'GB', region: 'EUROPE', currency: 'GBP', am: 'እንግሊዝ', en: 'United Kingdom' },
  { code: 'DE', region: 'EUROPE', currency: 'EUR', am: 'ጀርመን', en: 'Germany' },
  { code: 'SE', region: 'EUROPE', currency: 'SEK', am: 'ስዊድን', en: 'Sweden' },
  { code: 'NO', region: 'EUROPE', currency: 'NOK', am: 'ኖርዌይ', en: 'Norway' },
  { code: 'DK', region: 'EUROPE', currency: 'DKK', am: 'ዴንማርክ', en: 'Denmark' },
  { code: 'FI', region: 'EUROPE', currency: 'EUR', am: 'ፊንላንድ', en: 'Finland' },
  { code: 'NL', region: 'EUROPE', currency: 'EUR', am: 'ኔዘርላንድ', en: 'Netherlands' },
  { code: 'BE', region: 'EUROPE', currency: 'EUR', am: 'ቤልጂየም', en: 'Belgium' },
  { code: 'FR', region: 'EUROPE', currency: 'EUR', am: 'ፈረንሳይ', en: 'France' },
  { code: 'IT', region: 'EUROPE', currency: 'EUR', am: 'ጣሊያን', en: 'Italy' },
  { code: 'ES', region: 'EUROPE', currency: 'EUR', am: 'ስፔን', en: 'Spain' },
  { code: 'GR', region: 'EUROPE', currency: 'EUR', am: 'ግሪክ', en: 'Greece' },
  { code: 'IE', region: 'EUROPE', currency: 'EUR', am: 'አየርላንድ', en: 'Ireland' },
  { code: 'AT', region: 'EUROPE', currency: 'EUR', am: 'ኦስትሪያ', en: 'Austria' },
  { code: 'CH', region: 'EUROPE', currency: 'CHF', am: 'ስዊዘርላንድ', en: 'Switzerland' },

  { code: 'AE', region: 'ASIA', currency: 'AED', am: 'የተባበሩት ዓረብ ኤምሬትስ', en: 'United Arab Emirates' },
  { code: 'SA', region: 'ASIA', currency: 'SAR', am: 'ሳዑዲ ዓረቢያ', en: 'Saudi Arabia' },
  { code: 'QA', region: 'ASIA', currency: 'QAR', am: 'ቀጠር', en: 'Qatar' },
  { code: 'KW', region: 'ASIA', currency: 'KWD', am: 'ኩዌት', en: 'Kuwait' },
  { code: 'BH', region: 'ASIA', currency: 'BHD', am: 'ባህሬን', en: 'Bahrain' },
  { code: 'OM', region: 'ASIA', currency: 'OMR', am: 'ኦማን', en: 'Oman' },
  { code: 'LB', region: 'ASIA', currency: 'LBP', am: 'ሊባኖስ', en: 'Lebanon' },
  { code: 'JO', region: 'ASIA', currency: 'JOD', am: 'ዮርዳኖስ', en: 'Jordan' },
  { code: 'IL', region: 'ASIA', currency: 'ILS', am: 'እስራኤል', en: 'Israel' },
  { code: 'IN', region: 'ASIA', currency: 'INR', am: 'ሕንድ', en: 'India' },
  { code: 'JP', region: 'ASIA', currency: 'JPY', am: 'ጃፓን', en: 'Japan' },

  { code: 'AU', region: 'OTHER', currency: 'AUD', am: 'አውስትራሊያ', en: 'Australia' },
  { code: 'NZ', region: 'OTHER', currency: 'NZD', am: 'ኒውዚላንድ', en: 'New Zealand' },
  { code: 'BR', region: 'OTHER', currency: 'BRL', am: 'ብራዚል', en: 'Brazil' },
  { code: 'ZZ', region: 'OTHER', currency: null,  am: 'ሌላ አገር', en: 'Another country' }
];

export const countryByCode = (code) => COUNTRIES.find(c => c.code === code) || null;
export const countriesInRegion = (region) => COUNTRIES.filter(c => c.region === region);

/* ---------------- approximate local figures ----------------

   THE CHARGE IS ALWAYS IN USD. Nothing below converts a price; it only
   produces a courtesy figure so a parent can judge whether $50 is a lot
   of money where they live. The UI must mark it approximate and must say
   the bank sets the final rate — a parent who reads €46 and is billed
   something else does not come back.

   Static on purpose. A live rate feed would make the number drift under
   a parent between page loads, costs money, and adds a runtime
   dependency to a site that has none. If the parish ever wants live
   rates, see the note in docs/PAYMENTS.md before building it.

   !! THESE RATES WERE NOT FETCHED FROM A LIVE SOURCE. !!
   They are approximations entered by hand and must be checked against a
   real source before the site is shown to families — see
   docs/CHURCH-DECISIONS.md §6. A currency with no entry simply shows no
   local figure, which is the correct behaviour when we do not know; set
   a rate to null to switch one off.

   ETB IS DELIBERATELY UNSET. The birr has moved a great deal since the
   2024 float and any figure entered here from memory would be badly
   wrong — and a parent in Addis is exactly the person who would notice.
   Showing nothing is honest; showing a wrong number is not. Fill it in
   from a real source and the approximate line appears by itself. */
export const FX = {
  asOf: '2026-09-15',       // shown to the parent beside the figure
  perUSD: {
    // ETB: <unset — see the note above>
    KES: 129,
    ZAR: 18.5,
    EGP: 48,
    CAD: 1.36,
    GBP: 0.79,
    EUR: 0.92,
    SEK: 10.5,
    NOK: 10.8,
    DKK: 6.9,
    CHF: 0.88,
    AED: 3.67,            // pegged
    SAR: 3.75,            // pegged
    QAR: 3.64,            // pegged
    ILS: 3.7,
    INR: 86,
    AUD: 1.50,
    NZD: 1.64
  }
};

/* The approximate local amount, or null when we have no rate for that
   currency — in which case the UI shows the USD price alone rather than
   inventing a figure. Rounded to whole units: false precision on an
   approximation is worse than none. */
export function approxLocal(usd, currency) {
  const amount = Number(usd);
  if (!isFinite(amount) || !currency || currency === 'USD') return null;
  const rate = FX.perUSD[currency];
  if (!isFinite(rate) || rate <= 0) return null;
  return { amount: Math.round(amount * rate), currency, asOf: FX.asOf };
}

/* What a given enrolment costs, so the figure on screen and the figure a
   teacher records come from the same function rather than two sums that
   can drift apart.

   Zema deliberately ignores the subject count — that IS the pricing, and
   writing it as a sum over subjects would invite a later "optimisation"
   into charging per subject. */
export function priceFor(track, { prepaidTerm = false, region = null } = {}) {
  /* Regional override, read from the explicit table — never computed.
     An unknown region falls through to the base price rather than
     guessing, which fails in the direction of the published figure. */
  const override = region ? PRICING.byRegion[region] : null;

  if (track === 'bible') {
    if (override && !prepaidTerm && isFinite(override.bible)) return override.bible;
    return prepaidTerm ? PRICING.bible.termPrepaidUSD : PRICING.bible.monthlyUSD;
  }
  if (track === 'zema') {
    if (override && isFinite(override.zema)) return override.zema;
    return PRICING.zema.flatUSD;
  }
  return null;
}

/* Adding Zema subjects AFTER the selection was fixed at enrolment. This is
   the cost of unticking a box that was already ticked for free, which is
   why registration warns before it happens rather than after. */
export function priceToAddSubjects(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return n * PRICING.zema.addSubjectUSD;
}

/* How long a term runs, so `paidUntil` on a payment a teacher records is
   derived from the plan rather than typed by hand into a date box. Bible
   monthly buys one month; the prepaid term buys all three. Zema's flat
   price buys the same three-month term. */
export function termMonthsFor(track, { prepaidTerm = false } = {}) {
  if (track === 'bible') return prepaidTerm ? PRICING.bible.termMonths : 1;
  if (track === 'zema') return PRICING.bible.termMonths;
  return 0;
}

/* 'YYYY-MM-DD', n whole months after `from`. Kept as a plain string
   because that is what paidUntil holds and what a date input reads, and
   because a Timestamp would invite timezone questions nobody needs for a
   term that ends at the end of a day. */
export function addMonths(from, months) {
  const d = from instanceof Date ? new Date(from.getTime()) : new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 0));
  // 31 Jan + 1 month is 28/29 Feb, not 3 March
  if (d.getDate() < day) d.setDate(0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* The version of privacy.html + terms.html a parent agreed to, recorded on
   their account at registration. Date-stamped rather than numbered so it is
   obvious which text was in force. Change it when the substance of either
   document changes — not for a typo — and existing parents can then be asked
   to agree again, because the record will no longer match. */
export const CONSENT_VERSION = '2026-09-15';

/* ---------------- certificate signatories — PARKED, UNUSED ----------------

   Nothing reads these. The certificate currently carries NO signature
   block at all: a ruled line with no name on it reads as an unfinished
   document, which is worse for a family to receive than a certificate
   that simply does not claim a signature.

   They are kept here so the names are not lost and so restoring the
   block is one change rather than a rediscovery. Whose names belong on a
   document about a child — and whether a priest signs alongside the
   teacher, and which parish is named — is the parish's decision:
   see docs/CHURCH-DECISIONS.md §5.

   When it is answered, replace these and put the block back in
   assets/js/certificate.js. */
export const CERTIFICATE_SIGNATORIES = {
  teacher: 'TEACHER_NAME',
  priest:  'PRIEST_NAME',
  parish:  'PARISH_NAME'
};

/* Card payment is not live yet (see docs/PAYMENTS.md). Until it is, the
   billing page tells parents how to arrange payment with the church
   directly. One constant, so changing the number or the address is one
   edit rather than a search across every page. */
export const CHURCH_CONTACT = {
  name: 'ፍኖተ ያሬድ · TewahedoDevs',
  email: 'info@example.org',
  phone: '+1 (000) 000-0000'
};
