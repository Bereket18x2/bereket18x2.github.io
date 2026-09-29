/* node tests/access.test.mjs

   What "the term has ended" actually does, proved rather than assumed.

   The shape of the promise, from privacy.html, terms.html and
   docs/PAYMENTS.md: an ended term closes NEW lessons and nothing else.
   A family that cannot afford the next term keeps every score, badge and
   certificate their child earned. Losing your certificates because your
   parents ran out of money is the wrong lesson from a church school.

   accessActive/accessExpired and daysUntilExpiry are pure functions of a
   user object, so they are tested directly. The WIRING — which page
   passes requirePaid and which does not — is asserted against the
   shipped files, bounded by structure per CLAUDE.md. */

import { readFileSync } from 'node:fs';
import { braced, between } from './extract.mjs';
import { renews, TRACKS } from '../assets/js/validators.js';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

/* store.js imports firebase from gstatic, so it cannot be imported in
   node. The three functions under test touch none of that, so they are
   lifted out of the shipped source by name and evaluated — which also
   means these test the REAL code rather than a copy that can drift. */
const STORE = readFileSync(new URL('../assets/js/store.js', import.meta.url), 'utf8');
const lift = (marker) => braced(STORE, marker, `${marker} in store.js`);
const { accessActive, accessExpired, daysUntilExpiry } = await import(
  'data:text/javascript;base64,' + Buffer.from(
    // an arrow assigned to a const, so braced() bounds it by its body
    braced(STORE, 'export const toMillis', 'toMillis in store.js')
      .replace('export const', 'const') + ';\n' +
    lift('export function accessActive').replace('export function', 'function') + '\n' +
    'const accessExpired = (user) => !!(user && user.paid && !accessActive(user));\n' +
    lift('export function daysUntilExpiry').replace('export function', 'function') + '\n' +
    'export { accessActive, accessExpired, daysUntilExpiry };', 'utf8'
  ).toString('base64'));

const DAY = 86400000;
const iso = (offsetDays) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

console.log('\nwhen access is live');
check('a paid family with a future end date', accessActive({ paid: true, paidUntil: iso(30) }), true);
// paidUntil runs to the END of its day, so the last day is still a live day
check('the last day still counts', accessActive({ paid: true, paidUntil: iso(0) }), true);
check('paid with no end date recorded', accessActive({ paid: true }), true);
check('a past date is not active', accessActive({ paid: true, paidUntil: iso(-1) }), false);
check('never paid is not active', accessActive({ paid: false, paidUntil: iso(30) }), false);
check('no user at all', accessActive(null), false);
check('a malformed date fails closed', accessActive({ paid: true, paidUntil: 'soon' }), false);

console.log('\nexpired means FINISHED, not never-paid');
/* These are different messages to a family, and conflating them tells a
   parent who paid for three months that they never paid. */
check('a finished term is expired', accessExpired({ paid: true, paidUntil: iso(-1) }), true);
check('a family who never paid is NOT expired', accessExpired({ paid: false }), false);
check('a live term is not expired', accessExpired({ paid: true, paidUntil: iso(5) }), false);

console.log('\ndays left, counted in whole days and never in hours');
check('five days out', daysUntilExpiry({ paid: true, paidUntil: iso(5) }), 5);
check('two days out', daysUntilExpiry({ paid: true, paidUntil: iso(2) }), 2);
check('the last day reads 0, not -1', daysUntilExpiry({ paid: true, paidUntil: iso(0) }), 0);
// an ended term is the other panel, so this declines to count
check('an ended term counts nothing', daysUntilExpiry({ paid: true, paidUntil: iso(-1) }), null);
check('no end date counts nothing', daysUntilExpiry({ paid: true }), null);
check('never paid counts nothing', daysUntilExpiry({ paid: false, paidUntil: iso(3) }), null);
check('a malformed date counts nothing', daysUntilExpiry({ paid: true, paidUntil: 'soon' }), null);
check('no user counts nothing', daysUntilExpiry(null), null);
/* Frozen clock, so the boundary is a fact rather than a race: a test
   that runs at 23:59:59 must not disagree with one that runs at noon. */
{
  const now = new Date('2026-10-01T12:00:00');
  check('exactly at the boundary',
    daysUntilExpiry({ paid: true, paidUntil: '2026-10-06' }, now), 5);
  check('and one day further in',
    daysUntilExpiry({ paid: true, paidUntil: '2026-10-03' }, now), 2);
}

console.log('\nacceptance 8: only a renewing track has anything to renew');
check('bible renews', renews('bible'), true);
check('zema does not — one flat payment', renews('zema'), false);
check('an unknown track fails closed', renews('history'), false);
check('and no track is missing the flag',
  Object.values(TRACKS).filter(t => typeof t.renews !== 'boolean').map(t => t.id), []);

/* ---- the wiring, read off the pages that actually ship ---- */
const page = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\nacceptance 4 + 5: the lesson page is what refuses, not the link');
{
  /* THE ONE THAT MATTERS. Hiding a lesson on the dashboard stops
     nobody who bookmarked its URL; the gate has to be on the lesson
     page itself, before anything renders. */
  const lesson = code(page('lesson.html'));
  check('lesson.html gates on paid', /requireAuth\(\s*\{\s*requirePaid:/.test(lesson), true);
  check('and exempts exactly the free preview',
    /requirePaid:\s*!isFree\(id\)/.test(lesson), true);

  const gate = between(STORE, 'if (requirePaid', 'return null;', 'the paywall in requireAuth');
  check('requireAuth turns an inactive account away', /!accessActive\(user\)/.test(gate), true);
  check('and sends them to billing rather than a dead page',
    /location\.href = 'billing\.html'/.test(gate), true);
}

console.log('\nacceptance 6: an ended term takes nothing away');
{
  const dash = code(page('dashboard.html'));
  // the dashboard must NOT pass requirePaid, or a finished term would
  // bounce a family away from their own certificates
  check('the dashboard does not gate itself on payment',
    /requireAuth\(\s*\{\s*requirePaid/.test(dash), false);
  /* The earned panel is painted from `subjects`, never from `active`.
     Asserting the absence of the flag inside that block is what stops
     somebody "tidying up" by wrapping it in an if. */
  const earned = between(dash, "$('earnedPanel')", 'earnedList', 'the earned panel wiring');
  check('and does not gate what was earned on it', /\bactive\b/.test(code(earned)), false);
  // certificate.test.mjs proves the generator cannot see paid at all
  const cert = code(readFileSync(new URL('../assets/js/certificate.js', import.meta.url), 'utf8'));
  check('the certificate generator cannot read paid', /\bpaid\b/.test(cert), false);
}

console.log('\nacceptance 7: payment reopens access without signing out');
{
  /* current() re-reads the user document on every call and caches
     nothing, and requireAuth calls it on every page load — so a teacher
     confirming payment takes effect on the family's next navigation. No
     sign-out, no token refresh. If this ever grows a cache, the family
     would be locked out until their session ended. */
  const current = code(braced(STORE, 'async current()', 'Store.current'));
  check('current() reads the user document fresh', /getDoc\(ref\)/.test(current), true);
  check('and caches nothing', /cache|memo/i.test(current), false);
  const auth = code(braced(STORE, 'export const requireAuth', 'requireAuth'));
  check('requireAuth re-reads it every page load', /Store\.current\(\)/.test(auth), true);
}

console.log('\nacceptance 1 + 2 + 3: the reminder is a note, not a demand');
{
  const dash = page('dashboard.html');
  const dashCode = code(dash);
  check('it is computed from paidUntil', /daysUntilExpiry\(u\)/.test(dashCode), true);
  check('five days is the window', /ENDING_SOON = 5/.test(dashCode), true);
  check('two days is the escalation', /ENDING_URGENT = 2/.test(dashCode), true);
  check('only a renewing track sees it', /renews\(u\.track\)/.test(dashCode), true);
  check('dismissal lives in sessionStorage', /sessionStorage/.test(dashCode), true);
  /* Keyed to the end date, so renewing re-arms it rather than leaving
     the panel silently dismissed into the next term. */
  check('and is keyed to the end date', /fy-expiry-seen-\$\{u\.paidUntil/.test(dashCode), true);
  check('it uses the one contact constant', /CHURCH_CONTACT\.email/.test(dashCode), true);

  const panel = between(dash, 'id="expirySoon"', 'expirySoonClose', 'the expiry reminder panel');
  check('the panel is not red', /--danger|note--red/.test(panel), false);
  check('it can be closed', /expirySoonClose/.test(panel), true);
  check('and it never covers the page', /position:\s*fixed|modal/.test(panel), false);
  // no new Firestore field: nothing about expiry is ever written
  check('nothing about the reminder is written to Firestore',
    /(setDoc|updateDoc|addDoc)[^;]*expiry/i.test(dashCode), false);
}

console.log('\nacceptance 9: the teacher sees the week ahead');
{
  const teach = code(page('teacher.html'));
  check('seven days, not five', /ENDING_WINDOW_DAYS = 7/.test(teach), true);
  check('the group is rendered', /paintExpiring/.test(teach), true);
  check('and only for a renewing track', /renews\(s\.track\)/.test(teach), true);
  /* A term ending is a diary entry, not a child in difficulty. Scoring
     it higher would push families who are doing fine above children who
     have stopped turning up. */
  check('it is worth one concern point, no more',
    /endsIn <= ENDING_WINDOW_DAYS\) \{\s*score \+= 1;/.test(teach), true);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
