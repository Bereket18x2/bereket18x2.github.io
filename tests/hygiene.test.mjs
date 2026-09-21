/* node tests/hygiene.test.mjs

   Tests about the tests.

   CLAUDE.md says a test that locates content by offset is not a test.
   This is what makes that a rule rather than a hope — it reads every
   suite in this directory and refuses the patterns that let an assertion
   go green while asserting nothing.

   The bug it exists for: tests/validators.test.mjs read a block out of
   firestore.rules with `slice(i, i + 3000)`. A comment pushed `allow
   delete: if false` past character 3000, and the check that nobody can
   erase a child's question began passing against an empty string. It
   only surfaced because 3000 was short enough that a neighbouring
   assertion flipped to failing first. A longer window would still be
   lying, and nothing would ever have said so.

   Deliberately crude. It matches source text rather than parsing, which
   means it can be fooled by anybody determined to fool it — but the
   failure this guards against is nobody noticing, not somebody
   circumventing. */

import { readFileSync, readdirSync } from 'node:fs';
import { between, after, braced } from './extract.mjs';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

const dir = new URL('./', import.meta.url);
/* Every suite in this directory, plus the emulator suite under tools/.
   That one lives elsewhere because it needs npm, but it is a test and
   the rule is about tests — leaving it out would be the loophole
   somebody eventually walks through. */
const suites = [
  ...readdirSync(dir).filter(f => f.endsWith('.test.mjs')),
  '../tools/rules.test.mjs'
];
const sourceOf = (f) => readFileSync(new URL(f, dir), 'utf8');

console.log('\nno suite locates content by offset');
check('there are suites to check', suites.length > 5, true);

/* The rule is about locating content IN A FILE, so the check is scoped
   to variables that hold file contents — `full.slice(i, i + 2)` parsing
   a hex colour is arithmetic on a string somebody typed, not a position
   in a document, and flagging it would teach people to ignore this
   suite.

   Names are collected from `= readFileSync(...)` and then followed
   transitively through `.replace()` and friends, which is how
   landing.test.mjs gets from RAW to HTML to MARKUP. */
function fileVars(code) {
  const names = new Set();
  for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*readFileSync/g)) names.add(m[1]);
  // two passes is enough for RAW -> HTML -> MARKUP; a third would be
  // a chain nobody should be writing in a test anyway
  for (let i = 0; i < 2; i++) {
    for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*\./g)) {
      if (names.has(m[2])) names.add(m[1]);
    }
  }
  return names;
}

const offenders = (code, re) => {
  const vars = fileVars(code);
  const hits = [];
  for (const m of code.matchAll(re)) if (vars.has(m[1])) hits.push(m[0].trim());
  return hits;
};

/* `css.slice(i + 3000)`, `REG.slice(REG.indexOf(x) - 900, ...)` —
   arithmetic on a position in a file, the exact shape of the original
   bug. Bounded by the semicolon rather than by `)`, because the position
   is usually produced by a nested call and a `[^)]*` window stops at
   that call's own closing paren — which is how the first version of
   this check passed against the very line it was written to catch. */
const OFFSET_ARITHMETIC = /\b(\w+)\.(?:slice|substring|substr)\s*\([^;]{0,400}?[-+]\s*\d+/g;
// `src.split('\n')[42]` — a line number is the same mistake wearing a hat
const LINE_NUMBER = /\b(\w+)\.split\(\s*['"`]\\n['"`]\s*\)\s*\[\s*\d+\s*\]/g;
// `html.slice(0, 500)` — a fixed window bounded by nothing at all
const FIXED_WINDOW = /\b(\w+)\.(?:slice|substring|substr)\s*\(\s*\d+\s*,\s*\d+\s*\)/g;
// a bare indexOf on file contents: -1 becomes slice(-1) becomes one
// character, and every negative assertion then passes against it
const BARE_INDEXOF = /=\s*(\w+)\.indexOf\(/g;

for (const f of suites) {
  if (f === 'hygiene.test.mjs') continue;   // the patterns above live here
  const src = sourceOf(f);
  // strip comments, so a comment ABOUT the bug does not read as the bug
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check(`${f}: no offset arithmetic into a file`, offenders(code, OFFSET_ARITHMETIC), []);
  check(`${f}: no line-number indexing`, offenders(code, LINE_NUMBER), []);
  check(`${f}: no fixed-size window`, offenders(code, FIXED_WINDOW), []);
  check(`${f}: no unguarded indexOf into a file`, offenders(code, BARE_INDEXOF), []);
}

console.log('\nthe extractors themselves fail loudly rather than quietly');
const SAMPLE = `alpha\nmatch /questions/{qid} {\n  allow delete: if false;\n}\nomega`;
check('braced reaches the closing brace, not the path parameter',
  braced(SAMPLE, 'match /questions/').includes('allow delete: if false;'), true);
check('and stops at the block, not the rest of the file',
  braced(SAMPLE, 'match /questions/').includes('omega'), false);
check('between is inclusive of its end marker',
  between(SAMPLE, 'alpha', 'omega').endsWith('omega'), true);
check('after runs to the end of the file',
  after(SAMPLE, 'match').endsWith('omega'), true);

/* Each of these would, with a bare indexOf, have returned a one- or
   zero-character string that every negative assertion then passes
   against. That is the whole failure mode. */
const throws = (fn) => { try { fn(); return false; } catch (e) { return e.name === 'MarkerMissing'; } };
check('braced throws on a missing marker', throws(() => braced(SAMPLE, 'match /nope/')), true);
check('between throws on a missing start', throws(() => between(SAMPLE, 'nope', 'omega')), true);
check('between throws on a missing end', throws(() => between(SAMPLE, 'alpha', 'nope')), true);
check('after throws on a missing marker', throws(() => after(SAMPLE, 'nope')), true);
// an end marker that only appears BEFORE the start is not an end marker
check('between will not invert a region',
  throws(() => between(SAMPLE, 'omega', 'alpha')), true);

console.log('\nCLAUDE.md carries the rule, so it survives this file being deleted');
{
  const md = readFileSync(new URL('../CLAUDE.md', import.meta.url), 'utf8');
  check('the rule is written down',
    md.includes('locates content by offset is not a test'), true);
  check('and says what to do instead', md.includes('Bound it by structure'), true);
  check('and that a test which cannot find its target has failed',
    md.includes('cannot find what it is testing has FAILED'), true);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
