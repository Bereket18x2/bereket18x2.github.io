/* ===========================================================
   i18n.js — a small bilingual toggle (Amharic / English).
   Scope: the homepage (index.html, including the sign-in section)
   and register.html (sign-up) — the two flows this was asked for,
   not a full-site translation. Any element that should switch
   carries data-am="..." and data-en="..."; add data-ph-am/data-ph-en
   instead when the element is an input whose placeholder should
   switch rather than its text.
   =========================================================== */

(() => {
  const KEY = 'eotc.lang';
  const get = () => {
    try { return localStorage.getItem(KEY) || 'am'; } catch (e) { return 'am'; }
  };
  const set = (lang) => {
    try { localStorage.setItem(KEY, lang); } catch (e) { /* memory only */ }
  };

  function apply(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-am]').forEach((el) => {
      const text = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-am');
      if (text != null) el.textContent = text;
    });

    document.querySelectorAll('[data-ph-am]').forEach((el) => {
      const ph = lang === 'en' ? el.getAttribute('data-ph-en') : el.getAttribute('data-ph-am');
      if (ph != null) el.setAttribute('placeholder', ph);
    });

    // <optgroup label="..."> renders its `label` attribute, not textContent
    document.querySelectorAll('[data-label-am]').forEach((el) => {
      const label = lang === 'en' ? el.getAttribute('data-label-en') : el.getAttribute('data-label-am');
      if (label != null) el.setAttribute('label', label);
    });

    document.querySelectorAll('.lang-toggle').forEach((btn) => {
      btn.textContent = lang === 'en' ? 'አማርኛ' : 'English';
      btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Amharic' : 'ወደ እንግሊዝኛ ቀይር');
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-toggle');
    if (!btn) return;
    const next = get() === 'en' ? 'am' : 'en';
    set(next);
    apply(next);
  });

  apply(get());
})();
