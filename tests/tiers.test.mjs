/* node tests/tiers.test.mjs

   Acceptance 11 plus the drift guard that matters most: a tier naming a
   subject that does not exist would silently show a parent a shorter
   course than they paid for, and nothing would fail loudly. */

import { TIERS, tierById, subjectIdsOfTier, tiersByPrice, CONSENT_VERSION }
  from '../assets/js/config.js';
import { SUBJECTS, subjectById, subjectsFor } from '../assets/js/lessons.js';
import { TRACKS } from '../assets/js/validators.js';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

console.log('\nprices come from one place');
check('three tiers', Object.keys(TIERS).length, 3);
check('bible is $40', TIERS.bible.priceUSD, 40);
check('zema_full is $30', TIERS.zema_full.priceUSD, 30);
check('zema_basic is $20', TIERS.zema_basic.priceUSD, 20);
check('listed cheapest first',
  tiersByPrice().map(t => t.id), ['zema_basic', 'zema_full', 'bible']);
check('every tier declares a price above zero',
  Object.values(TIERS).every(t => typeof t.priceUSD === 'number' && t.priceUSD > 0), true);

console.log('\nevery tier subject actually exists');
// the drift guard: a typo here would quietly shorten a paid course
for (const t of Object.values(TIERS)) {
  const missing = t.subjects.filter(id => !subjectById(id));
  check(`${t.id} names only real subjects`, missing, []);
  const wrongTrack = t.subjects.filter(id => subjectById(id).track !== t.track);
  check(`${t.id} subjects all belong to its own track`, wrongTrack, []);
}

console.log('\nacceptance 11: zema_basic sees only its three subjects');
check('zema_basic subject ids',
  subjectIdsOfTier('zema_basic'), ['wengele', 'wudase', 'mezmur']);
check('zema_basic does NOT include aquaquam',
  subjectIdsOfTier('zema_basic').includes('aquaquam'), false);
check('zema_basic does NOT include zemaadv',
  subjectIdsOfTier('zema_basic').includes('zemaadv'), false);
check('their Amharic names',
  subjectIdsOfTier('zema_basic').map(id => subjectById(id).am),
  ['ወንጌለ ዮሐንስ', 'ውዳሴ ማርያም', 'መዝሙረ ዳዊት']);

console.log('\nzema_full NESTS zema_basic');
// wengele precedes aquaquam in the traditional order, so the dearer tier
// contains the cheaper one rather than sitting beside it
{
  const basic = subjectIdsOfTier('zema_basic');
  const full = subjectIdsOfTier('zema_full');
  check('full contains every basic subject', basic.every(id => full.includes(id)), true);
  check('full adds aquaquam and zemaadv',
    full.filter(id => !basic.includes(id)), ['aquaquam', 'zemaadv']);
  check('full is strictly larger', full.length > basic.length, true);
}

console.log('\nbible tier covers all five subjects');
check('five subjects', subjectIdsOfTier('bible').length, 5);
check('matches the track exactly',
  subjectIdsOfTier('bible').slice().sort(),
  subjectsFor('bible').map(s => s.id).sort());

console.log('\ntrack is derived, never chosen separately');
check('bible tier -> bible track', TIERS.bible.track, 'bible');
check('both zema tiers -> zema track',
  [TIERS.zema_full.track, TIERS.zema_basic.track], ['zema', 'zema']);
check('every tier names a real track',
  Object.values(TIERS).every(t => !!TRACKS[t.track]), true);

console.log('\nlookup helpers');
check('tierById finds one', tierById('bible').id, 'bible');
check('tierById on nonsense is null', tierById('gold'), null);
check('subjectIdsOfTier on nonsense is empty', subjectIdsOfTier('gold'), []);
check('consent version is a non-empty string',
  typeof CONSENT_VERSION === 'string' && CONSENT_VERSION.length > 0, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
