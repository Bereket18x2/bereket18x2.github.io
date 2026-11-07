/* Parse shipped JavaScript, inline page scripts and emulator tests.
   Security tests must not wait for Firebase to install just to find a
   SyntaxError in their own source. This uses Node's actual parser. */
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let passed = 0, failed = 0;
const checkSource = (label, source) => {
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: source, encoding: 'utf8', timeout: 15000
  });
  if (result.status === 0) {
    passed++; console.log('  ok   ' + label);
  } else {
    failed++; console.log(' FAIL  ' + label + ': ' + String(result.stderr).slice(0, 500));
  }
};

const jsRoot = new URL('../assets/js/', import.meta.url);
for (const name of readdirSync(jsRoot).filter(f => f.endsWith('.js'))) {
  checkSource('assets/js/' + name, readFileSync(new URL(name, jsRoot), 'utf8'));
}

const htmlRoot = new URL('../', import.meta.url);
for (const name of readdirSync(htmlRoot).filter(f => f.endsWith('.html'))) {
  const page = readFileSync(new URL(name, htmlRoot), 'utf8');
  let index = 0;
  for (const match of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = match[1], source = match[2];
    if (/\bsrc\s*=/.test(attrs) || !source.trim()) continue;
    if (/\btype\s*=\s*["'](?:importmap|application\/json)["']/.test(attrs)) continue;
    checkSource(name + ' inline script ' + (++index), source);
  }
}
const rules = readFileSync(new URL('../tools/rules.test.mjs', import.meta.url), 'utf8');
checkSource('tools/rules.test.mjs', rules);
console.log(`\n${passed} parsed, ${failed} syntax failures\n`);
process.exit(failed ? 1 : 0);
