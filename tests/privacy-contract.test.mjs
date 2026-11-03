/* node tests/privacy-contract.test.mjs
   Ensure new staff-review data remains visible to families, covered by
   deletion instructions and recorded under a new consent policy version. */
import { readFileSync } from 'node:fs';
import { CONSENT_VERSION } from '../assets/js/config.js';
import { braced } from './extract.mjs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(label, yes) {
  if (yes) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log(' FAIL  ' + label); }
}

const rules = read('firestore.rules');
const consent = read('privacy.html');
const deletion = read('docs/DELETION.md');
const dashboard = read('dashboard.html');
const store = read('assets/js/store.js');

check('changed privacy policy has new consent version',
  CONSENT_VERSION === '2026-11-03');
check('English policy identifies staff grades',
  consent.includes('staff independently assesses a lesson'));
check('Amharic policy identifies teacher evaluations',
  consent.includes('መምህር በራሱ ሲገመግም'));
check('English policy explains nonautomatic deletion',
  consent.includes('administrator processes and confirms a deletion request'));
check('parent identity verification is not presented as complete',
  consent.includes('do not independently prove'));
check('parents can view staff reviews on their dashboard',
  dashboard.includes('reviewRows') && dashboard.includes('review.reviewedByName'));
check('certificate gate uses independent reviews',
  dashboard.includes('verifiedSubject(material, reviews'));
check('staff data-access method stays centralized',
  store.includes('async reviewsOf(uid)'));
check('reviewer and parent access are restricted in rules',
  braced(rules, 'match /reviews/', 'review rules').includes('isMyStudentByGet(uid)'));
check('only staff may create the review',
  braced(rules, 'match /reviews/', 'review rules').includes('allow create: if isStaffFor(uid)'));
check('review is immutable to browser clients',
  braced(rules, 'match /reviews/', 'review rules').includes('allow update, delete: if false'));
check('parents cannot attach arbitrary new fields',
  rules.includes('changed().hasOnly(ownerWritableFields())'));
check('deletion requests have a strict key allowlist',
  braced(rules, 'match /deletionRequests/', 'deletion request rules')
    .includes('request.resource.data.keys().hasOnly'));
check('deletion guide includes all student subcollections',
  ['progress','reviews','comments','questions','consents'].every(
    name => deletion.includes('`' + name + '`')));
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
