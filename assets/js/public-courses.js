// Public curriculum and prices share the same sources as registration.
import { subjectsFor } from '@lessons';
import { PRICING } from '@config';
import { TRACKS } from '@validators';
const copy = (am, en) => `data-am="${am}" data-en="${en}"`;
const action = (track) => TRACKS[track].enrollable
  ? `<a class="btn btn--gold" href="register.html" ${copy('ይመዝገቡ →','Register →')}>ይመዝገቡ →</a>`
  : `<button class="btn btn--gold" disabled ${copy('በቅርቡ ይጀምራል','Coming soon')}>በቅርቡ ይጀምራል</button>`;
const title = (track) => track === 'bible' ? 'የመጽሐፍ ቅዱስ ትምህርት' : 'የዜማ ትምህርት';
const enTitle = (track) => track === 'bible' ? 'Bible study' : 'Zema';
const courses = document.getElementById('publicCourses');
if (courses) courses.innerHTML = ['bible','zema'].map(track => `<section class="panel public-course"><h2 ${copy(title(track),enTitle(track))}>${title(track)}</h2><p ${copy(track === 'bible' ? 'ዕድሜ ከ፯ እስከ ፲፫' : 'ዕድሜ ከ፯ ዓመት ጀምሮ',track === 'bible' ? 'Ages 7–13' : 'Ages 7 and up')}>${track === 'bible' ? 'ዕድሜ ከ፯ እስከ ፲፫' : 'ዕድሜ ከ፯ ዓመት ጀምሮ'}</p><ul class="public-subjects">${subjectsFor(track).map(s => `<li><span>${s.num}</span> <span ${copy(s.am,s.en)}>${s.am}</span></li>`).join('')}</ul>${action(track)}</section>`).join('');
const plans = document.getElementById('publicPlans');
if (plans) plans.innerHTML = ['bible','zema'].map(track => {
 const bible = track === 'bible', p = PRICING.bible;
 return `<section class="panel plan-card"><img class="plan-art" src="assets/${bible ? 'manuscript' : 'kebero'}.webp" alt="" width="96" height="128"><h2 ${copy(title(track),enTitle(track))}>${title(track)}</h2><p class="plan-price">$${bible ? p.monthlyUSD : PRICING.zema.flatUSD} <small ${copy(bible ? '/ ወር' : 'አንድ ጊዜ',bible ? '/ month' : 'one time')}>${bible ? '/ ወር' : 'አንድ ጊዜ'}</small></p><p ${copy(bible ? 'የቪዲዮ ትምህርቶች፣ ጥያቄዎችና የመማር ክትትል።' : 'በማዳመጥና በመድገም የዜማ ትምህርት። ምዝገባ ገና አልተከፈተም።',bible ? 'Video lessons, quizzes and learning progress.' : 'Learn chant through listening and repetition. Enrollment is not open yet.')}>${bible ? 'የቪዲዮ ትምህርቶች፣ ጥያቄዎችና የመማር ክትትል።' : 'በማዳመጥና በመድገም የዜማ ትምህርት። ምዝገባ ገና አልተከፈተም።'}</p>${bible ? `<p ${copy(`ለ${p.termMonths} ወራት $${p.termPrepaidUSD} በቅድሚያ — $${p.termSavingUSD} ይቆጥቡ።`,`Prepay $${p.termPrepaidUSD} for ${p.termMonths} months — save $${p.termSavingUSD}.`)}>ለ${p.termMonths} ወራት $${p.termPrepaidUSD} በቅድሚያ — $${p.termSavingUSD} ይቆጥቡ።</p>` : ''}${action(track)}</section>`;
}).join('');
// The language toggle re-queries data attributes, including these rendered rows.

if (document.documentElement.lang === 'en') {
 document.querySelectorAll('#publicPlans [data-en], #publicCourses [data-en]').forEach(el => { el.textContent = el.dataset.en; });
}
