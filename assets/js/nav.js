/* ===========================================================
   nav.js — puts a way out on every page.

   Sign-out used to exist only on the three pages that already loaded
   store.js: the dashboard, the teacher page and admin. A signed-in
   parent reading billing, a lesson, the privacy policy or the terms had
   no way to sign out without first navigating somewhere else.

   THIS FILE DELIBERATELY DOES NOT IMPORT store.js.

   privacy.html and terms.html are public pages a parent may well read
   BEFORE they ever register — they are linked from the consent gate, so
   they must stay reachable by an account that has not agreed to
   anything. Pulling the Firebase SDK onto them to render one link would
   make every visitor download an auth library to read a policy.

   Instead store.js maintains a one-character hint in localStorage, and
   this file reads it. The hint is UI ONLY. It is not a credential, it
   decides nothing about access, and a visitor who forges it gets exactly
   one thing: a sign-out link that signs out a session they do not have.
   Everything real is decided by requireAuth() and firestore.rules.

   Loaded as a plain deferred script, not a module, so it costs one small
   file and no import map entry.
   =========================================================== */
(function () {
  'use strict';

  var HINT = 'eotc.signedin';

  function signedInHint() {
    try { return localStorage.getItem(HINT) === '1'; }
    catch (e) { return false; }   // private mode, blocked storage
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    var links = document.querySelector('.nav-links');
    if (!links) return;

    /* The pages that already own a sign-out button wire it to store.js
       directly and handle their own redirect. Leave them alone. */
    if (document.getElementById('out')) return;
    if (!signedInHint()) return;

    /* A link rather than a button, and it goes to the homepage rather
       than signing out in place. index.html already loads store.js, so
       the actual sign-out happens there — see its #signout handler.
       That keeps this file dependency-free. */
    var out = document.createElement('a');
    out.href = 'index.html#signout';
    out.id = 'navSignOut';
    out.textContent = 'ውጣ';
    out.setAttribute('data-am', 'ውጣ');
    out.setAttribute('data-en', 'Sign out');

    /* Before the language and theme toggles, so it sits with the other
       links rather than after the controls. */
    var firstControl = links.querySelector('button');
    if (firstControl) links.insertBefore(out, firstControl);
    else links.appendChild(out);
  });
})();
