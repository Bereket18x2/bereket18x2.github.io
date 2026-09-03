/* ===========================================================
   theme.js — the day/night switch.

   The theme is applied by a tiny inline script in each page's <head>,
   BEFORE the stylesheet loads, so the page never paints one theme and
   then flips to the other. This file only handles the toggle button
   and remembering the choice.

   localStorage is the right home for this: it is a display preference
   belonging to the device, not data about the student. Nothing here
   goes to Firestore.
   =========================================================== */

(() => {
  const KEY = 'eotc.theme';

  const read = () => {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  };
  const write = (t) => {
    try { localStorage.setItem(KEY, t); } catch (e) { /* private mode; session only */ }
  };

  const systemPreference = () =>
    matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';

  const current = () => document.documentElement.getAttribute('data-theme') || systemPreference();

  const SUN = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>`;
  const MOON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/></svg>`;

  function paintButtons(theme) {
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      // show what you would switch TO, which is the convention people expect
      btn.innerHTML = theme === 'day' ? MOON : SUN;
      btn.setAttribute('aria-label', theme === 'day' ? 'ወደ ሌሊት ገጽታ ቀይር' : 'ወደ ቀን ገጽታ ቀይር');
      btn.setAttribute('aria-pressed', theme === 'day' ? 'true' : 'false');
    });
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    paintButtons(theme);
    // sky.js repaints itself: stars at night, drifting motes by day
    window.dispatchEvent(new CustomEvent('eotc:themechange', { detail: { theme } }));
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.theme-toggle')) return;
    const next = current() === 'day' ? 'night' : 'day';
    write(next);
    apply(next);
  });

  // Follow the OS only while the visitor has not chosen for themselves.
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!read()) apply(systemPreference());
  });

  paintButtons(current());
})();
