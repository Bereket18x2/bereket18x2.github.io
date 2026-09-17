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

/* ---------------- the country list ----------------

   Every country with an ISO 3166-1 alpha-2 code, plus `ZZ`. Generated
   from CLDR's English names rather than typed by hand, then committed as
   plain data — there is no build step here and there is not going to be
   one.

   FIELDS
     code      ISO 3166-1 alpha-2. This is what is stored on the account.
     region    one of REGION_IDS. Every country has one; a country that
               mapped to undefined would fall out of regional pricing
               silently, so tests/pricing.test.mjs asserts none does.
     currency  ISO 4217, used ONLY for the approximate local figure. A
               code with no rate in FX simply shows nothing, so an entry
               here is harmless until somebody adds a rate for it.
     en        what the combobox shows and what a parent types. English on
               purpose: it is what a parent types and what every other
               site they use shows them.
     am        OPTIONAL, and present only on the forty-odd countries whose
               Amharic names were written by hand before the list was
               expanded. Nothing renders it today. It is kept rather than
               deleted because the parish may one day want an Amharic-first
               list, and re-translating by hand is the expensive half.
     alt       OPTIONAL extra search terms, lowercase. CLDR is correct and
               a parent is not wrong: somebody looking for Turkey types
               "turkey", not "Türkiye", and somebody in Abidjan may well
               type "ivory coast". Matching is accent-folded (see
               searchCountries), so "turkiye" and "cote" already work —
               `alt` is for the names that are genuinely different.

   REGIONS. Africa, Europe and Asia follow the usual continental lines;
   Turkey, the Caucasus and the Gulf sit in ASIA. NORTH_AMERICA is the
   CONTINENT — the US, Canada, Mexico, Central America and the Caribbean —
   rather than the UN's narrower "Northern America", because a treasurer
   reading the region table should find the continent they expect. OTHER
   holds South America, Oceania and the Antarctic territories, which is
   honest about what it is: the bucket for everywhere the school has not
   yet had a reason to name.

   `ZZ` is deliberate and stays last. A family whose country is not listed
   must still be able to register — a school does not turn a child away
   over a dropdown. */
export const COUNTRIES = [
  { code: 'ET', region: 'ETHIOPIA', currency: 'ETB', en: 'Ethiopia', am: 'ኢትዮጵያ' },
  { code: 'AF', region: 'ASIA', currency: 'AFN', en: 'Afghanistan' },
  { code: 'AX', region: 'EUROPE', currency: 'EUR', en: 'Åland Islands' },
  { code: 'AL', region: 'EUROPE', currency: 'ALL', en: 'Albania' },
  { code: 'DZ', region: 'AFRICA', currency: 'DZD', en: 'Algeria' },
  { code: 'AS', region: 'OTHER', currency: 'USD', en: 'American Samoa' },
  { code: 'AD', region: 'EUROPE', currency: 'EUR', en: 'Andorra' },
  { code: 'AO', region: 'AFRICA', currency: 'AOA', en: 'Angola' },
  { code: 'AI', region: 'NORTH_AMERICA', currency: 'XCD', en: 'Anguilla' },
  { code: 'AQ', region: 'OTHER', currency: null, en: 'Antarctica' },
  { code: 'AG', region: 'NORTH_AMERICA', currency: 'XCD', en: 'Antigua & Barbuda' },
  { code: 'AR', region: 'OTHER', currency: 'ARS', en: 'Argentina' },
  { code: 'AM', region: 'ASIA', currency: 'AMD', en: 'Armenia' },
  { code: 'AW', region: 'NORTH_AMERICA', currency: 'AWG', en: 'Aruba' },
  { code: 'AU', region: 'OTHER', currency: 'AUD', en: 'Australia', am: 'አውስትራሊያ' },
  { code: 'AT', region: 'EUROPE', currency: 'EUR', en: 'Austria', am: 'ኦስትሪያ' },
  { code: 'AZ', region: 'ASIA', currency: 'AZN', en: 'Azerbaijan' },
  { code: 'BS', region: 'NORTH_AMERICA', currency: 'BSD', en: 'Bahamas' },
  { code: 'BH', region: 'ASIA', currency: 'BHD', en: 'Bahrain', am: 'ባህሬን' },
  { code: 'BD', region: 'ASIA', currency: 'BDT', en: 'Bangladesh' },
  { code: 'BB', region: 'NORTH_AMERICA', currency: 'BBD', en: 'Barbados' },
  { code: 'BY', region: 'EUROPE', currency: 'BYN', en: 'Belarus' },
  { code: 'BE', region: 'EUROPE', currency: 'EUR', en: 'Belgium', am: 'ቤልጂየም' },
  { code: 'BZ', region: 'NORTH_AMERICA', currency: 'BZD', en: 'Belize' },
  { code: 'BJ', region: 'AFRICA', currency: 'XOF', en: 'Benin' },
  { code: 'BM', region: 'NORTH_AMERICA', currency: 'BMD', en: 'Bermuda' },
  { code: 'BT', region: 'ASIA', currency: 'BTN', en: 'Bhutan' },
  { code: 'BO', region: 'OTHER', currency: 'BOB', en: 'Bolivia' },
  { code: 'BA', region: 'EUROPE', currency: 'BAM', en: 'Bosnia & Herzegovina' },
  { code: 'BW', region: 'AFRICA', currency: 'BWP', en: 'Botswana' },
  { code: 'BV', region: 'OTHER', currency: 'NOK', en: 'Bouvet Island' },
  { code: 'BR', region: 'OTHER', currency: 'BRL', en: 'Brazil', am: 'ብራዚል' },
  { code: 'IO', region: 'OTHER', currency: 'USD', en: 'British Indian Ocean Territory' },
  { code: 'VG', region: 'NORTH_AMERICA', currency: 'USD', en: 'British Virgin Islands' },
  { code: 'BN', region: 'ASIA', currency: 'BND', en: 'Brunei' },
  { code: 'BG', region: 'EUROPE', currency: 'BGN', en: 'Bulgaria' },
  { code: 'BF', region: 'AFRICA', currency: 'XOF', en: 'Burkina Faso' },
  { code: 'BI', region: 'AFRICA', currency: 'BIF', en: 'Burundi' },
  { code: 'KH', region: 'ASIA', currency: 'KHR', en: 'Cambodia' },
  { code: 'CM', region: 'AFRICA', currency: 'XAF', en: 'Cameroon' },
  { code: 'CA', region: 'NORTH_AMERICA', currency: 'CAD', en: 'Canada', am: 'ካናዳ' },
  { code: 'CV', region: 'AFRICA', currency: 'CVE', en: 'Cape Verde', alt: ['cabo verde'] },
  { code: 'BQ', region: 'NORTH_AMERICA', currency: 'USD', en: 'Caribbean Netherlands' },
  { code: 'KY', region: 'NORTH_AMERICA', currency: 'KYD', en: 'Cayman Islands' },
  { code: 'CF', region: 'AFRICA', currency: 'XAF', en: 'Central African Republic' },
  { code: 'TD', region: 'AFRICA', currency: 'XAF', en: 'Chad' },
  { code: 'CL', region: 'OTHER', currency: 'CLP', en: 'Chile' },
  { code: 'CN', region: 'ASIA', currency: 'CNY', en: 'China' },
  { code: 'CO', region: 'OTHER', currency: 'COP', en: 'Colombia' },
  { code: 'KM', region: 'AFRICA', currency: 'KMF', en: 'Comoros' },
  { code: 'CG', region: 'AFRICA', currency: 'XAF', en: 'Congo - Brazzaville', alt: ['republic of the congo'] },
  { code: 'CD', region: 'AFRICA', currency: 'CDF', en: 'Congo - Kinshasa', alt: ['drc', 'democratic republic of the congo', 'zaire'] },
  { code: 'CK', region: 'OTHER', currency: 'NZD', en: 'Cook Islands' },
  { code: 'CR', region: 'NORTH_AMERICA', currency: 'CRC', en: 'Costa Rica' },
  { code: 'CI', region: 'AFRICA', currency: 'XOF', en: 'Côte d’Ivoire', alt: ['ivory coast'] },
  { code: 'HR', region: 'EUROPE', currency: 'EUR', en: 'Croatia' },
  { code: 'CU', region: 'NORTH_AMERICA', currency: 'CUP', en: 'Cuba' },
  { code: 'CW', region: 'NORTH_AMERICA', currency: 'XCG', en: 'Curaçao' },
  { code: 'CY', region: 'EUROPE', currency: 'EUR', en: 'Cyprus' },
  { code: 'CZ', region: 'EUROPE', currency: 'CZK', en: 'Czechia', alt: ['czech republic'] },
  { code: 'DK', region: 'EUROPE', currency: 'DKK', en: 'Denmark', am: 'ዴንማርክ' },
  { code: 'DJ', region: 'AFRICA', currency: 'DJF', en: 'Djibouti', am: 'ጅቡቲ' },
  { code: 'DM', region: 'NORTH_AMERICA', currency: 'XCD', en: 'Dominica' },
  { code: 'DO', region: 'NORTH_AMERICA', currency: 'DOP', en: 'Dominican Republic' },
  { code: 'EC', region: 'OTHER', currency: 'USD', en: 'Ecuador' },
  { code: 'EG', region: 'AFRICA', currency: 'EGP', en: 'Egypt', am: 'ግብጽ' },
  { code: 'SV', region: 'NORTH_AMERICA', currency: 'USD', en: 'El Salvador' },
  { code: 'GQ', region: 'AFRICA', currency: 'XAF', en: 'Equatorial Guinea' },
  { code: 'ER', region: 'AFRICA', currency: 'ERN', en: 'Eritrea', am: 'ኤርትራ' },
  { code: 'EE', region: 'EUROPE', currency: 'EUR', en: 'Estonia' },
  { code: 'SZ', region: 'AFRICA', currency: 'SZL', en: 'Eswatini', alt: ['swaziland'] },
  { code: 'FK', region: 'OTHER', currency: 'FKP', en: 'Falkland Islands' },
  { code: 'FO', region: 'EUROPE', currency: 'DKK', en: 'Faroe Islands' },
  { code: 'FJ', region: 'OTHER', currency: 'FJD', en: 'Fiji' },
  { code: 'FI', region: 'EUROPE', currency: 'EUR', en: 'Finland', am: 'ፊንላንድ' },
  { code: 'FR', region: 'EUROPE', currency: 'EUR', en: 'France', am: 'ፈረንሳይ' },
  { code: 'GF', region: 'OTHER', currency: 'EUR', en: 'French Guiana' },
  { code: 'PF', region: 'OTHER', currency: 'XPF', en: 'French Polynesia' },
  { code: 'TF', region: 'OTHER', currency: 'EUR', en: 'French Southern Territories' },
  { code: 'GA', region: 'AFRICA', currency: 'XAF', en: 'Gabon' },
  { code: 'GM', region: 'AFRICA', currency: 'GMD', en: 'Gambia' },
  { code: 'GE', region: 'ASIA', currency: 'GEL', en: 'Georgia' },
  { code: 'DE', region: 'EUROPE', currency: 'EUR', en: 'Germany', am: 'ጀርመን' },
  { code: 'GH', region: 'AFRICA', currency: 'GHS', en: 'Ghana' },
  { code: 'GI', region: 'EUROPE', currency: 'GIP', en: 'Gibraltar' },
  { code: 'GR', region: 'EUROPE', currency: 'EUR', en: 'Greece', am: 'ግሪክ' },
  { code: 'GL', region: 'NORTH_AMERICA', currency: 'DKK', en: 'Greenland' },
  { code: 'GD', region: 'NORTH_AMERICA', currency: 'XCD', en: 'Grenada' },
  { code: 'GP', region: 'NORTH_AMERICA', currency: 'EUR', en: 'Guadeloupe' },
  { code: 'GU', region: 'OTHER', currency: 'USD', en: 'Guam' },
  { code: 'GT', region: 'NORTH_AMERICA', currency: 'GTQ', en: 'Guatemala' },
  { code: 'GG', region: 'EUROPE', currency: 'GBP', en: 'Guernsey' },
  { code: 'GN', region: 'AFRICA', currency: 'GNF', en: 'Guinea' },
  { code: 'GW', region: 'AFRICA', currency: 'XOF', en: 'Guinea-Bissau' },
  { code: 'GY', region: 'OTHER', currency: 'GYD', en: 'Guyana' },
  { code: 'HT', region: 'NORTH_AMERICA', currency: 'HTG', en: 'Haiti' },
  { code: 'HM', region: 'OTHER', currency: 'AUD', en: 'Heard & McDonald Islands' },
  { code: 'HN', region: 'NORTH_AMERICA', currency: 'HNL', en: 'Honduras' },
  { code: 'HK', region: 'ASIA', currency: 'HKD', en: 'Hong Kong SAR China' },
  { code: 'HU', region: 'EUROPE', currency: 'HUF', en: 'Hungary' },
  { code: 'IS', region: 'EUROPE', currency: 'ISK', en: 'Iceland' },
  { code: 'IN', region: 'ASIA', currency: 'INR', en: 'India', am: 'ሕንድ' },
  { code: 'ID', region: 'ASIA', currency: 'IDR', en: 'Indonesia' },
  { code: 'IR', region: 'ASIA', currency: 'IRR', en: 'Iran' },
  { code: 'IQ', region: 'ASIA', currency: 'IQD', en: 'Iraq' },
  { code: 'IE', region: 'EUROPE', currency: 'EUR', en: 'Ireland', am: 'አየርላንድ', alt: ['eire'] },
  { code: 'IM', region: 'EUROPE', currency: 'GBP', en: 'Isle of Man' },
  { code: 'IL', region: 'ASIA', currency: 'ILS', en: 'Israel', am: 'እስራኤል' },
  { code: 'IT', region: 'EUROPE', currency: 'EUR', en: 'Italy', am: 'ጣሊያን' },
  { code: 'JM', region: 'NORTH_AMERICA', currency: 'JMD', en: 'Jamaica' },
  { code: 'JP', region: 'ASIA', currency: 'JPY', en: 'Japan', am: 'ጃፓን' },
  { code: 'JE', region: 'EUROPE', currency: 'GBP', en: 'Jersey' },
  { code: 'JO', region: 'ASIA', currency: 'JOD', en: 'Jordan', am: 'ዮርዳኖስ' },
  { code: 'KZ', region: 'ASIA', currency: 'KZT', en: 'Kazakhstan' },
  { code: 'KE', region: 'AFRICA', currency: 'KES', en: 'Kenya', am: 'ኬንያ' },
  { code: 'KI', region: 'OTHER', currency: 'AUD', en: 'Kiribati' },
  { code: 'KW', region: 'ASIA', currency: 'KWD', en: 'Kuwait', am: 'ኩዌት' },
  { code: 'KG', region: 'ASIA', currency: 'KGS', en: 'Kyrgyzstan' },
  { code: 'LA', region: 'ASIA', currency: 'LAK', en: 'Laos', alt: ['lao'] },
  { code: 'LV', region: 'EUROPE', currency: 'EUR', en: 'Latvia' },
  { code: 'LB', region: 'ASIA', currency: 'LBP', en: 'Lebanon', am: 'ሊባኖስ' },
  { code: 'LS', region: 'AFRICA', currency: 'LSL', en: 'Lesotho' },
  { code: 'LR', region: 'AFRICA', currency: 'LRD', en: 'Liberia' },
  { code: 'LY', region: 'AFRICA', currency: 'LYD', en: 'Libya' },
  { code: 'LI', region: 'EUROPE', currency: 'CHF', en: 'Liechtenstein' },
  { code: 'LT', region: 'EUROPE', currency: 'EUR', en: 'Lithuania' },
  { code: 'LU', region: 'EUROPE', currency: 'EUR', en: 'Luxembourg' },
  { code: 'MO', region: 'ASIA', currency: 'MOP', en: 'Macao SAR China' },
  { code: 'MG', region: 'AFRICA', currency: 'MGA', en: 'Madagascar' },
  { code: 'MW', region: 'AFRICA', currency: 'MWK', en: 'Malawi' },
  { code: 'MY', region: 'ASIA', currency: 'MYR', en: 'Malaysia' },
  { code: 'MV', region: 'ASIA', currency: 'MVR', en: 'Maldives' },
  { code: 'ML', region: 'AFRICA', currency: 'XOF', en: 'Mali' },
  { code: 'MT', region: 'EUROPE', currency: 'EUR', en: 'Malta' },
  { code: 'MH', region: 'OTHER', currency: 'USD', en: 'Marshall Islands' },
  { code: 'MQ', region: 'NORTH_AMERICA', currency: 'EUR', en: 'Martinique' },
  { code: 'MR', region: 'AFRICA', currency: 'MRU', en: 'Mauritania' },
  { code: 'MU', region: 'AFRICA', currency: 'MUR', en: 'Mauritius' },
  { code: 'YT', region: 'AFRICA', currency: 'EUR', en: 'Mayotte' },
  { code: 'MX', region: 'NORTH_AMERICA', currency: 'MXN', en: 'Mexico', am: 'ሜክሲኮ' },
  { code: 'FM', region: 'OTHER', currency: 'USD', en: 'Micronesia' },
  { code: 'MD', region: 'EUROPE', currency: 'MDL', en: 'Moldova' },
  { code: 'MC', region: 'EUROPE', currency: 'EUR', en: 'Monaco' },
  { code: 'MN', region: 'ASIA', currency: 'MNT', en: 'Mongolia' },
  { code: 'ME', region: 'EUROPE', currency: 'EUR', en: 'Montenegro' },
  { code: 'MS', region: 'NORTH_AMERICA', currency: 'XCD', en: 'Montserrat' },
  { code: 'MA', region: 'AFRICA', currency: 'MAD', en: 'Morocco' },
  { code: 'MZ', region: 'AFRICA', currency: 'MZN', en: 'Mozambique' },
  { code: 'MM', region: 'ASIA', currency: 'MMK', en: 'Myanmar (Burma)', alt: ['burma'] },
  { code: 'NA', region: 'AFRICA', currency: 'NAD', en: 'Namibia' },
  { code: 'NR', region: 'OTHER', currency: 'AUD', en: 'Nauru' },
  { code: 'NP', region: 'ASIA', currency: 'NPR', en: 'Nepal' },
  { code: 'NL', region: 'EUROPE', currency: 'EUR', en: 'Netherlands', am: 'ኔዘርላንድ', alt: ['holland'] },
  { code: 'NC', region: 'OTHER', currency: 'XPF', en: 'New Caledonia' },
  { code: 'NZ', region: 'OTHER', currency: 'NZD', en: 'New Zealand', am: 'ኒውዚላንድ', alt: ['aotearoa'] },
  { code: 'NI', region: 'NORTH_AMERICA', currency: 'NIO', en: 'Nicaragua' },
  { code: 'NE', region: 'AFRICA', currency: 'XOF', en: 'Niger' },
  { code: 'NG', region: 'AFRICA', currency: 'NGN', en: 'Nigeria' },
  { code: 'NU', region: 'OTHER', currency: 'NZD', en: 'Niue' },
  { code: 'NF', region: 'OTHER', currency: 'AUD', en: 'Norfolk Island' },
  { code: 'KP', region: 'ASIA', currency: 'KPW', en: 'North Korea' },
  { code: 'MK', region: 'EUROPE', currency: 'MKD', en: 'North Macedonia', alt: ['macedonia'] },
  { code: 'MP', region: 'OTHER', currency: 'USD', en: 'Northern Mariana Islands' },
  { code: 'NO', region: 'EUROPE', currency: 'NOK', en: 'Norway', am: 'ኖርዌይ' },
  { code: 'OM', region: 'ASIA', currency: 'OMR', en: 'Oman', am: 'ኦማን' },
  { code: 'PK', region: 'ASIA', currency: 'PKR', en: 'Pakistan' },
  { code: 'PW', region: 'OTHER', currency: 'USD', en: 'Palau' },
  { code: 'PS', region: 'ASIA', currency: 'ILS', en: 'Palestinian Territories', alt: ['palestine'] },
  { code: 'PA', region: 'NORTH_AMERICA', currency: 'PAB', en: 'Panama' },
  { code: 'PG', region: 'OTHER', currency: 'PGK', en: 'Papua New Guinea' },
  { code: 'PY', region: 'OTHER', currency: 'PYG', en: 'Paraguay' },
  { code: 'PE', region: 'OTHER', currency: 'PEN', en: 'Peru' },
  { code: 'PH', region: 'ASIA', currency: 'PHP', en: 'Philippines' },
  { code: 'PN', region: 'OTHER', currency: 'NZD', en: 'Pitcairn Islands' },
  { code: 'PL', region: 'EUROPE', currency: 'PLN', en: 'Poland' },
  { code: 'PT', region: 'EUROPE', currency: 'EUR', en: 'Portugal' },
  { code: 'PR', region: 'NORTH_AMERICA', currency: 'USD', en: 'Puerto Rico' },
  { code: 'QA', region: 'ASIA', currency: 'QAR', en: 'Qatar', am: 'ቀጠር' },
  { code: 'RE', region: 'AFRICA', currency: 'EUR', en: 'Réunion' },
  { code: 'RO', region: 'EUROPE', currency: 'RON', en: 'Romania' },
  { code: 'RU', region: 'EUROPE', currency: 'RUB', en: 'Russia' },
  { code: 'RW', region: 'AFRICA', currency: 'RWF', en: 'Rwanda' },
  { code: 'WS', region: 'OTHER', currency: 'WST', en: 'Samoa' },
  { code: 'SM', region: 'EUROPE', currency: 'EUR', en: 'San Marino' },
  { code: 'ST', region: 'AFRICA', currency: 'STN', en: 'São Tomé & Príncipe' },
  { code: 'SA', region: 'ASIA', currency: 'SAR', en: 'Saudi Arabia', am: 'ሳዑዲ ዓረቢያ' },
  { code: 'SN', region: 'AFRICA', currency: 'XOF', en: 'Senegal' },
  { code: 'RS', region: 'EUROPE', currency: 'RSD', en: 'Serbia' },
  { code: 'SC', region: 'AFRICA', currency: 'SCR', en: 'Seychelles' },
  { code: 'SL', region: 'AFRICA', currency: 'SLE', en: 'Sierra Leone' },
  { code: 'SG', region: 'ASIA', currency: 'SGD', en: 'Singapore' },
  { code: 'SX', region: 'NORTH_AMERICA', currency: 'XCG', en: 'Sint Maarten' },
  { code: 'SK', region: 'EUROPE', currency: 'EUR', en: 'Slovakia' },
  { code: 'SI', region: 'EUROPE', currency: 'EUR', en: 'Slovenia' },
  { code: 'SB', region: 'OTHER', currency: 'SBD', en: 'Solomon Islands' },
  { code: 'SO', region: 'AFRICA', currency: 'SOS', en: 'Somalia', am: 'ሶማሊያ' },
  { code: 'ZA', region: 'AFRICA', currency: 'ZAR', en: 'South Africa', am: 'ደቡብ አፍሪካ' },
  { code: 'GS', region: 'OTHER', currency: 'GBP', en: 'South Georgia & South Sandwich Islands' },
  { code: 'KR', region: 'ASIA', currency: 'KRW', en: 'South Korea', alt: ['korea'] },
  { code: 'SS', region: 'AFRICA', currency: 'SSP', en: 'South Sudan', am: 'ደቡብ ሱዳን' },
  { code: 'ES', region: 'EUROPE', currency: 'EUR', en: 'Spain', am: 'ስፔን' },
  { code: 'LK', region: 'ASIA', currency: 'LKR', en: 'Sri Lanka' },
  { code: 'BL', region: 'NORTH_AMERICA', currency: 'EUR', en: 'St. Barthélemy' },
  { code: 'SH', region: 'AFRICA', currency: 'SHP', en: 'St. Helena' },
  { code: 'KN', region: 'NORTH_AMERICA', currency: 'XCD', en: 'St. Kitts & Nevis' },
  { code: 'LC', region: 'NORTH_AMERICA', currency: 'XCD', en: 'St. Lucia' },
  { code: 'MF', region: 'NORTH_AMERICA', currency: 'EUR', en: 'St. Martin' },
  { code: 'PM', region: 'NORTH_AMERICA', currency: 'EUR', en: 'St. Pierre & Miquelon' },
  { code: 'VC', region: 'NORTH_AMERICA', currency: 'XCD', en: 'St. Vincent & Grenadines' },
  { code: 'SD', region: 'AFRICA', currency: 'SDG', en: 'Sudan', am: 'ሱዳን' },
  { code: 'SR', region: 'OTHER', currency: 'SRD', en: 'Suriname' },
  { code: 'SJ', region: 'EUROPE', currency: 'NOK', en: 'Svalbard & Jan Mayen' },
  { code: 'SE', region: 'EUROPE', currency: 'SEK', en: 'Sweden', am: 'ስዊድን' },
  { code: 'CH', region: 'EUROPE', currency: 'CHF', en: 'Switzerland', am: 'ስዊዘርላንድ' },
  { code: 'SY', region: 'ASIA', currency: 'SYP', en: 'Syria' },
  { code: 'TW', region: 'ASIA', currency: 'TWD', en: 'Taiwan' },
  { code: 'TJ', region: 'ASIA', currency: 'TJS', en: 'Tajikistan' },
  { code: 'TZ', region: 'AFRICA', currency: 'TZS', en: 'Tanzania', am: 'ታንዛኒያ' },
  { code: 'TH', region: 'ASIA', currency: 'THB', en: 'Thailand' },
  { code: 'TL', region: 'ASIA', currency: 'USD', en: 'Timor-Leste', alt: ['east timor'] },
  { code: 'TG', region: 'AFRICA', currency: 'XOF', en: 'Togo' },
  { code: 'TK', region: 'OTHER', currency: 'NZD', en: 'Tokelau' },
  { code: 'TO', region: 'OTHER', currency: 'TOP', en: 'Tonga' },
  { code: 'TT', region: 'NORTH_AMERICA', currency: 'TTD', en: 'Trinidad & Tobago' },
  { code: 'TN', region: 'AFRICA', currency: 'TND', en: 'Tunisia' },
  { code: 'TR', region: 'ASIA', currency: 'TRY', en: 'Türkiye', alt: ['turkey'] },
  { code: 'TM', region: 'ASIA', currency: 'TMT', en: 'Turkmenistan' },
  { code: 'TC', region: 'NORTH_AMERICA', currency: 'USD', en: 'Turks & Caicos Islands' },
  { code: 'TV', region: 'OTHER', currency: 'AUD', en: 'Tuvalu' },
  { code: 'UM', region: 'OTHER', currency: 'USD', en: 'U.S. Outlying Islands' },
  { code: 'VI', region: 'NORTH_AMERICA', currency: 'USD', en: 'U.S. Virgin Islands' },
  { code: 'UG', region: 'AFRICA', currency: 'UGX', en: 'Uganda', am: 'ኡጋንዳ' },
  { code: 'UA', region: 'EUROPE', currency: 'UAH', en: 'Ukraine' },
  { code: 'AE', region: 'ASIA', currency: 'AED', en: 'United Arab Emirates', am: 'የተባበሩት ዓረብ ኤምሬትስ', alt: ['uae'] },
  { code: 'GB', region: 'EUROPE', currency: 'GBP', en: 'United Kingdom', am: 'እንግሊዝ', alt: ['uk', 'britain', 'great britain', 'england', 'scotland', 'wales'] },
  { code: 'US', region: 'NORTH_AMERICA', currency: 'USD', en: 'United States', am: 'አሜሪካ', alt: ['usa', 'america', 'united states of america'] },
  { code: 'UY', region: 'OTHER', currency: 'UYU', en: 'Uruguay' },
  { code: 'UZ', region: 'ASIA', currency: 'UZS', en: 'Uzbekistan' },
  { code: 'VU', region: 'OTHER', currency: 'VUV', en: 'Vanuatu' },
  { code: 'VA', region: 'EUROPE', currency: 'EUR', en: 'Vatican City', alt: ['holy see'] },
  { code: 'VE', region: 'OTHER', currency: 'VES', en: 'Venezuela' },
  { code: 'VN', region: 'ASIA', currency: 'VND', en: 'Vietnam' },
  { code: 'WF', region: 'OTHER', currency: 'XPF', en: 'Wallis & Futuna' },
  { code: 'EH', region: 'AFRICA', currency: 'MAD', en: 'Western Sahara' },
  { code: 'YE', region: 'ASIA', currency: 'YER', en: 'Yemen' },
  { code: 'ZM', region: 'AFRICA', currency: 'ZMW', en: 'Zambia' },
  { code: 'ZW', region: 'AFRICA', currency: 'ZWG', en: 'Zimbabwe' },
  /* Stays at the bottom of the unfiltered list, and carries no currency
     because we do not know which one to show. */
  { code: 'ZZ', region: 'OTHER', currency: null, en: 'Another country', am: 'ሌላ አገር', alt: ['other', 'not listed'] }
];

/* The flag, from the country code and nothing else.

   A regional-indicator symbol is U+1F1E6 + (letter - 'A'), so the two
   letters of an ISO code ARE the flag — two characters of arithmetic, no
   image files, no sprite sheet, no network request, nothing to maintain
   when a flag changes.

   SOME WINDOWS BROWSERS RENDER THESE AS LETTER PAIRS (a boxed "ET")
   rather than a flag, because Windows ships no colour flag font. That is
   acceptable: the country name is right beside it and carries the
   meaning. It must NOT become a reason to add flag images to a site with
   no build step — that trade is a few hundred network requests and a
   maintenance burden in exchange for decoration.

   ZZ has no flag; it is not a place. */
export const flagEmoji = (code) => {
  if (typeof code !== 'string' || !/^[A-Za-z]{2}$/.test(code) || code.toUpperCase() === 'ZZ') return '';
  return [...code.toUpperCase()]
    .map(ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65)).join('');
};

/* Accent-folded, lowercased, so "turkiye" finds Türkiye, "cote" finds
   Côte d'Ivoire and "aland" finds Åland. A parent on a phone keyboard is
   not going to reach for ü. */
const fold = (s) => String(s ?? '').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase().trim();

/* Filters the list for the combobox. Prefix matches come first, because
   typing "in" should offer India before Argentina — a substring match
   that outranks a prefix match is what makes a picker feel broken.

   An empty query returns everything, ZZ included and last, which is what
   the list shows before a parent has typed anything. */
export function searchCountries(query) {
  const q = fold(query);
  if (!q) return COUNTRIES.slice();
  const hits = [];
  for (const c of COUNTRIES) {
    const name = fold(c.en);
    const terms = [name, ...(c.alt || []).map(fold), c.code.toLowerCase()];
    let rank = -1;
    for (const t of terms) {
      if (t.startsWith(q)) { rank = 0; break; }
      if (t.includes(q)) rank = 1;
    }
    if (rank >= 0) hits.push({ c, rank, name });
  }
  hits.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return hits.map(h => h.c);
}

export const countryByCode = (code) => COUNTRIES.find(c => c.code === code) || null;

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
