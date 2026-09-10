/* node tests/nav.test.mjs

   Acceptance 7, the "sign out" half: a signed-in visitor must be able to
   sign out from every page.

   nav.js is a plain IIFE over `document` and `localStorage`, so it runs
   here against a small stub of both rather than in a browser. That keeps
   the assertion cheap enough to run on every change — the alternative
   was checking nine pages by hand, which is how the gap appeared in the
   first place. */

import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
};

const SRC = readFileSync(new URL('../assets/js/nav.js', import.meta.url), 'utf8');

/* The smallest DOM that nav.js actually touches. Deliberately minimal:
   if nav.js starts needing more of the DOM than this, that is worth
   noticing rather than papering over with a bigger stub. */
function runNav({ signedIn, hasOut = false, hasNavLinks = true, hasButton = true, storageThrows = false }) {
  const made = [];
  const el = (tag) => {
    const node = {
      tagName: tag, id: '', href: '', textContent: '', attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      children: []
    };
    made.push(node);
    return node;
  };

  const navLinks = hasNavLinks ? {
    inserted: [], appended: [],
    querySelector: (sel) => (sel === 'button' && hasButton) ? { tagName: 'BUTTON' } : null,
    insertBefore(node) { this.inserted.push(node); },
    appendChild(node) { this.appended.push(node); }
  } : null;

  const document = {
    readyState: 'complete',
    addEventListener() {},
    querySelector: (sel) => (sel === '.nav-links' ? navLinks : null),
    getElementById: (id) => (id === 'out' && hasOut ? { id: 'out' } : null),
    createElement: el
  };

  const localStorage = {
    getItem(k) {
      if (storageThrows) throw new Error('blocked');
      return (k === 'eotc.signedin' && signedIn) ? '1' : null;
    }
  };

  new Function('document', 'localStorage', SRC)(document, localStorage);
  const added = navLinks ? [...navLinks.inserted, ...navLinks.appended] : [];
  return { added, navLinks };
}

console.log('\na signed-in visitor gets a way out');
{
  const { added } = runNav({ signedIn: true });
  check('one link is added', added.length, 1);
  check('it goes to the homepage sign-out route', added[0].href, 'index.html#signout');
  check('it is labelled in Amharic', added[0].textContent, 'ውጣ');
  check('it carries both languages for the toggle',
    [added[0].attrs['data-am'], added[0].attrs['data-en']], ['ውጣ', 'Sign out']);
  check('it is identifiable', added[0].id, 'navSignOut');
}

console.log('\nit does not duplicate or interfere');
{
  // dashboard, teacher and admin own a real sign-out wired to store.js
  check('a page that already has #out is left alone',
    runNav({ signedIn: true, hasOut: true }).added.length, 0);
  check('a signed-OUT visitor gets no sign-out link',
    runNav({ signedIn: false }).added.length, 0);
  check('a page with no nav does not throw',
    runNav({ signedIn: true, hasNavLinks: false }).added.length, 0);
}

console.log('\nit degrades rather than breaking');
{
  // private browsing, or a browser configured to block site data
  check('blocked storage is treated as signed out, not as a crash',
    runNav({ signedIn: true, storageThrows: true }).added.length, 0);
  // a nav with no toggle buttons still receives the link
  const { navLinks } = runNav({ signedIn: true, hasButton: false });
  check('with no buttons it is appended at the end', navLinks.appended.length, 1);
  const withButtons = runNav({ signedIn: true, hasButton: true });
  check('with buttons it is inserted before them',
    withButtons.navLinks.inserted.length, 1);
}

/* The hint is a UI convenience, never a credential. This asserts the
   property that makes it safe to keep in localStorage at all. */
console.log('\nthe session hint decides nothing that matters');
{
  /* Comments stripped first: this file's own prose explains why it does
     NOT touch store.js or Firebase, and matching that would be checking
     the documentation rather than the code. */
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('nav.js never reads a token, uid or role',
    /token|uid|\brole\b|password/i.test(code), false);
  /* The point of the localStorage hint: privacy.html and terms.html are
     read by people who have not registered and are linked from the
     consent gate, so they must not pull the auth SDK to render a link. */
  check('nav.js pulls in no module at all',
    /\bimport\b|\brequire\(/.test(code), false);
  check('and never names firebase', /firebase/i.test(code), false);
  check('the only thing a forged hint yields is a link',
    runNav({ signedIn: true }).added[0].href, 'index.html#signout');
}

console.log('\nevery page that has a nav loads nav.js');
{
  const pages = ['index.html', 'register.html', 'dashboard.html', 'teacher.html',
                 'admin.html', 'billing.html', 'lesson.html', 'privacy.html', 'terms.html'];
  /* The actual <script> tag, not the filename anywhere in the file.
     index.html mentions assets/js/nav.js in a comment explaining the
     #signout route, and a substring check happily accepted that while
     the page had no script tag at all — the browser found it, this
     assertion did not. */
  const missing = pages.filter(p => {
    const html = readFileSync(new URL('../' + p, import.meta.url), 'utf8');
    return !/<script\s+src="assets\/js\/nav\.js"/.test(html);
  });
  check('none is missing the script tag', missing, []);

  // and the brand link is a deliberate homepage visit, so index.html
  // does not bounce a signed-in family straight back out
  const notHome = pages.filter(p => {
    const html = readFileSync(new URL('../' + p, import.meta.url), 'utf8');
    return !html.includes('<a class="brand" href="index.html#home">');
  });
  check('every brand link asks for the homepage explicitly', notHome, []);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
