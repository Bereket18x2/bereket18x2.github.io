/* ===========================================================
   card-preview.js — the 3D card mirror, parked intact.

   WHY THIS FILE IS NOT IMPORTED ANYWHERE.

   This was built into billing.html, under a hero that now tells a
   parent plainly that payment goes through the church. A card form
   under that sentence contradicts it however carefully it is labelled:
   a parent who sees four card fields fills them in, and then finds out
   the school cannot take the payment. So the form came off the page.

   It was not deleted, because none of it is wrong — it is the right
   component for a page that does not exist yet. When the parish's
   Stripe account is live (docs/CHURCH-DECISIONS.md §1), a checkout
   page imports this, mounts it, and the card returns unchanged.

   WHAT IT IS, AND WHAT IT IS NOT. This is a MIRROR. It shows the
   parent what they are typing on a picture of a card, validates the
   shape of it, and nothing else. Read CLAUDE.md before wiring it up:

     Never handle raw card numbers. Real digits must live in Stripe
     Elements iframes. Any code that reads, stores, logs, or transmits
     a PAN puts the project in PCI DSS scope.

   Nothing here persists, transmits or logs a digit — the value never
   leaves the input it was typed into, and `onReady` is handed no card
   data at all, only the fact that the four fields look well-formed.
   THAT IS LOAD-BEARING. If a future edit makes this function pass the
   number anywhere, the project is in PCI scope and this comment is the
   warning it ignored.

   The honest arrangement for a real checkout is: this card as the
   visual, Stripe Elements iframes as the actual inputs. Mounting this
   as the input of record is the one thing it must not be used for.
   =========================================================== */

/* The markup, so a future page inserts one node rather than
   reconstructing a form from memory. Every id the behaviour below
   binds to is in here; they move together or not at all. */
export const CARD_PREVIEW_MARKUP = `
  <p class="card-note">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B8266" stroke-width="2" stroke-linecap="round"><path d="M12 15v2M7 10V7a5 5 0 0 1 10 0v3"/><rect x="5" y="10" width="14" height="10" rx="2"/></svg>
    ይህ ካርድ ቅድመ-እይታ ብቻ ነው። እዚህ የገባ ቁጥር በዚህ ድረ-ገጽ ላይ አይቀመጥም፣ ወደ የትም አይላክም — እውነተኛው ክፍያ በሚቀጥለው ገጽ በStripe ደህንነቱ በተጠበቀ ገጽ ላይ ይፈጸማል።
  </p>

  <div class="card-stage">
    <div class="card3d" id="card3d">
      <div class="card3d__face card3d__front" id="cardFrontFace">
        <div class="card3d__top">
          <div class="card3d__chip"></div>
          <div class="card3d__brand" id="cardBrand">CARD</div>
        </div>
        <div class="card3d__number" id="cardNumberDisplay">•••• •••• •••• ••••</div>
        <div class="card3d__row">
          <div>
            <div class="card3d__label">ስም</div>
            <div class="card3d__value" id="cardNameDisplay">YOUR NAME</div>
          </div>
          <div>
            <div class="card3d__label">ያበቃበት</div>
            <div class="card3d__value" id="cardExpDisplay">MM/YY</div>
          </div>
        </div>
      </div>
      <div class="card3d__face card3d__back">
        <div class="card3d__stripe"></div>
        <div class="card3d__cvv-row">
          <div class="card3d__cvv-band"></div>
          <div class="card3d__cvv" id="cardCvvDisplay">•••</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card-fields">
    <div class="field field--full">
      <label for="ccName">የካርድ ያዥ ስም</label>
      <input class="input" id="ccName" placeholder="ለምሳሌ፡ Sara Tesfaye" autocomplete="cc-name">
      <p class="field-msg" id="ccNameMsg"></p>
    </div>
    <div class="field field--full">
      <label for="ccNumber">የካርድ ቁጥር</label>
      <input class="input" id="ccNumber" inputmode="numeric" placeholder="•••• •••• •••• ••••" autocomplete="cc-number" maxlength="23">
      <p class="field-msg" id="ccNumberMsg"></p>
    </div>
    <div class="field">
      <label for="ccExp">ያበቃበት (MM/YY)</label>
      <input class="input" id="ccExp" inputmode="numeric" placeholder="MM/YY" autocomplete="cc-exp" maxlength="5">
      <p class="field-msg" id="ccExpMsg"></p>
    </div>
    <div class="field">
      <label for="ccCvv">CVV</label>
      <input class="input" id="ccCvv" inputmode="numeric" placeholder="•••" autocomplete="cc-csc" maxlength="4">
      <p class="field-msg" id="ccCvvMsg"></p>
    </div>
  </div>

  <div class="trust-row">
    <span class="trust-chip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 15v2M7 10V7a5 5 0 0 1 10 0v3"/><rect x="5" y="10" width="14" height="10" rx="2"/></svg>
      256-bit SSL
    </span>
    <span class="trust-chip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6z"/></svg>
      PCI-DSS via Stripe
    </span>
    <span class="trust-chip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
      በማንኛውም ጊዜ ማቋረጥ ይቻላል
    </span>
  </div>
`;

const brandOf = (digits) => {
  if (/^3[47]/.test(digits)) return 'AMEX';
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
  return 'CARD';
};

const groupNumber = (digits, brand) => {
  if (brand === 'AMEX') return digits.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

/* Standard Luhn checksum — catches typos and mashed keyboards, not
   fraud. Stripe re-validates for real when the card actually charges;
   this exists only so a parent is told about a slipped digit before
   they leave the page, not so the site can judge a card. */
const luhnOk = (digits) => {
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
};

/* Mounts the card into `host` (its innerHTML is replaced) and wires the
   behaviour. Returns a small handle:

     isValid()            — do all four fields look well-formed
     focusFirstInvalid()  — put the cursor on the one to fix

   Note what is NOT returned: the values. A caller cannot get the number
   out of this, which is the point. `onReady(ok)` fires on every change
   with the boolean only, so a page can enable its own button. */
export function mountCardPreview(host, { onReady = () => {} } = {}) {
  host.innerHTML = CARD_PREVIEW_MARKUP;
  const $ = (id) => host.querySelector('#' + id);

  const valid = { name: false, number: false, exp: false, cvv: false };
  const settle = () => onReady(valid.name && valid.number && valid.exp && valid.cvv);

  const mark = (input, msgEl, state, msg) => {
    input.classList.remove('is-valid', 'is-invalid');
    msgEl.classList.remove('valid', 'invalid');
    msgEl.textContent = '';
    if (state === 'valid') { input.classList.add('is-valid'); msgEl.classList.add('valid'); msgEl.textContent = msg || '✓ ትክክል'; }
    else if (state === 'invalid') { input.classList.add('is-invalid'); msgEl.classList.add('invalid'); msgEl.textContent = msg; }
  };

  $('ccName').addEventListener('input', () => {
    const name = $('ccName').value.trim();
    $('cardNameDisplay').textContent = name.toUpperCase() || 'YOUR NAME';
    if (!name) { valid.name = false; mark($('ccName'), $('ccNameMsg'), 'none'); }
    else if (name.length < 3 || !name.includes(' ')) { valid.name = false; mark($('ccName'), $('ccNameMsg'), 'invalid', '✕ ሙሉ ስም (የመጀመሪያና የአባት ስም) ያስገቡ'); }
    else { valid.name = true; mark($('ccName'), $('ccNameMsg'), 'valid'); }
    settle();
  });

  $('ccNumber').addEventListener('input', () => {
    const raw = $('ccNumber').value.replace(/\D/g, '');
    const brand = brandOf(raw);
    const expectedLen = brand === 'AMEX' ? 15 : 16;
    const digits = raw.slice(0, expectedLen);
    const grouped = groupNumber(digits, brand);
    $('ccNumber').value = grouped;
    $('cardBrand').textContent = brand;
    $('cardNumberDisplay').textContent = grouped || '•••• •••• •••• ••••';
    $('ccCvv').maxLength = brand === 'AMEX' ? 4 : 3;

    if (!digits) { valid.number = false; mark($('ccNumber'), $('ccNumberMsg'), 'none'); }
    else if (digits.length < expectedLen) { valid.number = false; mark($('ccNumber'), $('ccNumberMsg'), 'none'); }
    else if (!luhnOk(digits)) { valid.number = false; mark($('ccNumber'), $('ccNumberMsg'), 'invalid', '✕ ልክ ያልሆነ የካርድ ቁጥር'); }
    else { valid.number = true; mark($('ccNumber'), $('ccNumberMsg'), 'valid', `✓ ትክክለኛ ${brand} ቁጥር`); }
    settle();
  });

  $('ccExp').addEventListener('input', () => {
    let digits = $('ccExp').value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) digits = digits.slice(0, 2) + '/' + digits.slice(2);
    $('ccExp').value = digits;
    $('cardExpDisplay').textContent = digits || 'MM/YY';

    if (digits.length < 5) { valid.exp = false; mark($('ccExp'), $('ccExpMsg'), 'none'); settle(); return; }
    const [mm, yy] = digits.split('/').map(Number);
    const now = new Date();
    const curYY = now.getFullYear() % 100, curMM = now.getMonth() + 1;
    if (mm < 1 || mm > 12) { valid.exp = false; mark($('ccExp'), $('ccExpMsg'), 'invalid', '✕ ወር ከ01–12 መሆን አለበት'); }
    else if (yy < curYY || (yy === curYY && mm < curMM)) { valid.exp = false; mark($('ccExp'), $('ccExpMsg'), 'invalid', '✕ ካርዱ ጊዜው አልፏል'); }
    else { valid.exp = true; mark($('ccExp'), $('ccExpMsg'), 'valid'); }
    settle();
  });

  $('ccCvv').addEventListener('input', () => {
    $('ccCvv').value = $('ccCvv').value.replace(/\D/g, '');
    const v = $('ccCvv').value;
    $('cardCvvDisplay').textContent = v || '•••';
    const need = +$('ccCvv').maxLength;
    if (!v) { valid.cvv = false; mark($('ccCvv'), $('ccCvvMsg'), 'none'); }
    else if (v.length < need) { valid.cvv = false; mark($('ccCvv'), $('ccCvvMsg'), 'none'); }
    else { valid.cvv = true; mark($('ccCvv'), $('ccCvvMsg'), 'valid'); }
    settle();
  });
  $('ccCvv').addEventListener('focus', () => $('card3d').style.setProperty('--flip', '180deg'));
  $('ccCvv').addEventListener('blur', () => $('card3d').style.setProperty('--flip', '0deg'));

  /* Tilt + gloss follow the pointer — pure decoration. It is inside the
     pointer handler rather than CSS because the angle depends on where
     in the stage the pointer is; prefers-reduced-motion is honoured by
     the transition rules in style.css, which is where that belongs. */
  const stage = host.querySelector('.card-stage');
  const card3d = $('card3d');
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card3d.style.setProperty('--tiltX', ((0.5 - py) * 12).toFixed(2) + 'deg');
    card3d.style.setProperty('--tiltY', ((px - 0.5) * 16).toFixed(2) + 'deg');
    card3d.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    card3d.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  });
  stage.addEventListener('pointerleave', () => {
    card3d.style.setProperty('--tiltX', '0deg');
    card3d.style.setProperty('--tiltY', '0deg');
  });

  return {
    isValid: () => valid.name && valid.number && valid.exp && valid.cvv,
    focusFirstInvalid: () => {
      (!valid.name ? $('ccName') : !valid.number ? $('ccNumber')
        : !valid.exp ? $('ccExp') : $('ccCvv')).focus();
    }
  };
}
