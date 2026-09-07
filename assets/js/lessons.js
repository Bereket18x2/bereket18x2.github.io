/* ===========================================================
   lessons.js — the curriculum, as track -> subject -> lessons.

   A subject is what a certificate is earned for, what an exam covers,
   and what the dashboard groups by. Lessons belong to a subject; the
   track is read from the subject rather than stored twice.

   Drop a YouTube ID into `youtube` and the lesson goes live. Use
   UNLISTED videos: playable by anyone with the link, not findable on
   YouTube, and free to stream. See README.

   Teacher names and every Zema lesson below are placeholders — replace
   them before students see them.

   ZEMA CARRIES NO QUESTIONS. It is listen-and-learn: attendance is the
   whole of its progress. The questions are absent from the data, not
   merely hidden, so no page can accidentally render a score for a Zema
   student.
   =========================================================== */

/* A lesson should run 10-12 minutes. Anything outside 9-13 is either a
   mistyped `minutes` or the wrong upload; both are worth catching before
   a child sits through it. */
export const LESSON_MIN_MINUTES = 9;
export const LESSON_MAX_MINUTES = 13;

export const SUBJECTS = [
  { id: 'amestu', track: 'bible', num: '፩', am: 'አምስቱ አዕማደ ምስጢራት', en: 'The Five Pillars of Mystery', badge: 'የምስጢራት ዐዋቂ' },
  { id: 'sirate', track: 'bible', num: '፪', am: 'ሥርዓተ ቤተ ክርስቲያን', en: 'Order of the Church', badge: 'የሥርዓት ጠባቂ' },
  { id: 'meshaftarik', track: 'bible', num: '፫', am: 'የመጽሐፍ ቅዱስ ታሪክ', en: 'Bible History', badge: 'የታሪክ አዋቂ' },
  { id: 'betekrtarik', track: 'bible', num: '፬', am: 'የቤተ ክርስቲያን ታሪክ', en: 'Church History', badge: 'የአበው ታሪክ ዐዋቂ' },
  { id: 'sinemigbar', track: 'bible', num: '፭', am: 'ክርስቲያናዊ ሥነ ምግባር', en: 'Christian Conduct', badge: 'የመልካም ምግባር ባለቤት' },
  { id: 'wengele', track: 'zema', num: '፩', am: 'ወንጌለ ዮሐንስ', en: 'Gospel of John', badge: 'የወንጌል ዜማ ተማሪ' },
  { id: 'wudase', track: 'zema', num: '፪', am: 'ውዳሴ ማርያም', en: 'Praise of Mary', badge: 'የውዳሴ ማርያም ዘማሪ' },
  { id: 'mezmur', track: 'zema', num: '፫', am: 'መዝሙረ ዳዊት', en: 'Psalms of David', badge: 'የመዝሙር ባለቤት' },
  { id: 'aquaquam', track: 'zema', num: '፬', am: 'አቋቋም', en: 'Aquaquam', badge: 'የአቋቋም ሰልጣኝ' },
  { id: 'zemaadv', track: 'zema', num: '፭', am: 'ዜማ', en: 'Zema', badge: 'የያሬድ ዜማ ወራሽ' }
];

export const LESSONS = [
  {
    id: 'l1', num: '፩', subject: 'amestu',
    title: 'ሃይማኖተ አበው፡ መግቢያ',
    teacher: 'መምህር ዳንኤል',
    minutes: 16,
    youtube: '',
    summary: 'የተዋሕዶ እምነት መሠረት፣ ሦስቱ ጉባኤያት እና አበው ያስተላለፉልን አደራ።',
    questions: [
      {
        q: 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን የምትቀበላቸው ጉባኤያት ስንት ናቸው?',
        options: ['ሁለት', 'ሦስት', 'አምስት', 'ሰባት'],
        answer: 1,
        why: 'ጉባኤ ኒቅያ፣ ጉባኤ ቁስጥንጥንያ እና ጉባኤ ኤፌሶን — ሦስቱ ጉባኤያት።'
      },
      {
        q: 'ጉባኤ ኒቅያ የተደረገበት ዘመን?',
        options: ['፫፻፳፭ ዓ.ም', '፬፻፴፩ ዓ.ም', '፫፻፹፩ ዓ.ም', '፭፻፵፩ ዓ.ም'],
        answer: 0,
        why: 'ጉባኤ ኒቅያ በ፫፻፳፭ ዓ.ም በ፫፻፲፰ቱ ሊቃውንት ተደረገ።'
      },
      {
        q: '"ተዋሕዶ" የሚለው ቃል ትርጉሙ ምንድን ነው?',
        options: ['መለያየት', 'መዋሐድ — አንድ መሆን', 'መመለስ', 'መጽናት'],
        answer: 1,
        why: 'መለኮትና ትስብእት ያለመለወጥና ያለመቀላቀል አንድ መሆናቸውን ያመለክታል።'
      }
    ]
  },
  {
    id: 'l6', num: '፮', subject: 'amestu',
    title: 'ቅዱሳን መላእክት',
    teacher: 'መምህር ተስፋዬ',
    minutes: 13,
    youtube: '',
    summary: 'ዐሥሩ ነገደ መላእክት፣ ሚካኤልና ገብርኤል፣ የጠባቂ መልአክ ትምህርት።',
    questions: [
      {
        q: 'ነገደ መላእክት ስንት ናቸው?',
        options: ['ሦስት', 'ሰባት', 'ዘጠኝ', 'ዐሥር'],
        answer: 3,
        why: 'ዐሥሩ ነገደ መላእክት ይባላሉ።'
      },
      {
        q: 'ለቅድስት ድንግል ማርያም የምሥራች ያበሠረው መልአክ ማን ነው?',
        options: ['ቅዱስ ሚካኤል', 'ቅዱስ ገብርኤል', 'ቅዱስ ሩፋኤል', 'ቅዱስ ኡራኤል'],
        answer: 1,
        why: 'ቅዱስ ገብርኤል በሉቃስ ወንጌል እንደተጻፈ አበሠረ።'
      },
      {
        q: 'መላእክት ምን ዓይነት ፍጥረት ናቸው?',
        options: ['ሥጋዊ', 'መንፈሳዊ', 'ምድራዊ', 'ጊዜያዊ'],
        answer: 1,
        why: 'መላእክት መንፈሳውያን ፍጥረታት ናቸው።'
      }
    ]
  },
  {
    id: 'l3', num: '፫', subject: 'sirate',
    title: 'ጾም እና ምጽዋት',
    teacher: 'መምህር ተስፋዬ',
    minutes: 18,
    youtube: '',
    summary: 'ሰባቱ አጽዋማት፣ የጾም ዓላማ እና ከምጽዋት ጋር ያለው ግንኙነት።',
    questions: [
      {
        q: 'በዓመት ውስጥ ያሉት አጽዋማት ስንት ናቸው?',
        options: ['አራት', 'አምስት', 'ሰባት', 'ዘጠኝ'],
        answer: 2,
        why: 'ሰባቱ አጽዋማት ይባላሉ።'
      },
      {
        q: 'ዐቢይ ጾም ስንት ቀን ነው?',
        options: ['፵ ቀን', '፶፭ ቀን', '፵፫ ቀን', '፲፬ ቀን'],
        answer: 1,
        why: 'ዐቢይ ጾም ፶፭ ቀናት ነው።'
      },
      {
        q: 'የጾም ዋና ዓላማ ምንድን ነው?',
        options: ['ክብደት መቀነስ', 'ሥጋን ገዝቶ ነፍስን ማጽናት', 'ገንዘብ መቆጠብ', 'ልማድ መከተል'],
        answer: 1,
        why: 'ጾም ከምጽዋትና ከጸሎት ጋር ተያይዞ ነፍስን የሚያንጽ ነው።'
      }
    ]
  },
  {
    id: 'l4', num: '፬', subject: 'sirate',
    title: 'ሥርዓተ ቅዳሴ',
    teacher: 'መምህር ዳንኤል',
    minutes: 20,
    youtube: '',
    summary: 'ቅዳሴ ምንድን ነው፣ ዐሥራ አራቱ ቅዳሴያት እና በቅዳሴ ጊዜ ያለን ሥርዓት።',
    questions: [
      {
        q: 'በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ያሉት ቅዳሴያት ስንት ናቸው?',
        options: ['፯', '፲', '፲፬', '፳'],
        answer: 2,
        why: 'ዐሥራ አራቱ ቅዳሴያት ይባላሉ።'
      },
      {
        q: 'ቅዳሴ የሚከናወነው የት ነው?',
        options: ['በቅኔ ማኅሌት', 'በመቅደስ', 'በቅጽረ ቤተ ክርስቲያን', 'በደጀ ሰላም'],
        answer: 1,
        why: 'ቅዱስ ቁርባን የሚፈጸመው በመቅደስ ነው።'
      },
      {
        q: 'ወደ ቅዳሴ ስንሄድ ማድረግ የሚገባን?',
        options: ['ዘግይቶ መግባት', 'ተዘጋጅቶ ቀድሞ መገኘት', 'እየተነጋገሩ መቆም', 'ስልክ መጠቀም'],
        answer: 1,
        why: 'በንጽሕናና በተዘጋጀ ልብ ቀድሞ መገኘት ይገባል።'
      }
    ]
  },
  {
    id: 'l5', num: '፭', subject: 'sirate',
    title: 'ንስሐ',
    teacher: 'መምህር ሰላም',
    minutes: 15,
    youtube: '',
    summary: 'የንስሐ ክፍሎች፣ የነፍስ አባት ሚና እና ኑዛዜ።',
    questions: [
      {
        q: 'የንስሐ ሦስቱ ክፍሎች የትኞቹ ናቸው?',
        options: ['ጸሎት፣ ጾም፣ ስግደት', 'ጸጸት፣ ኑዛዜ፣ ቀኖና', 'እምነት፣ ተስፋ፣ ፍቅር', 'ስማ፣ እወቅ፣ አድርግ'],
        answer: 1,
        why: 'ጸጸት፣ ኑዛዜ እና ቀኖና የንስሐ ክፍሎች ናቸው።'
      },
      {
        q: 'ኑዛዜ የሚደረገው ለማን ነው?',
        options: ['ለጓደኛ', 'ለወላጅ', 'ለነፍስ አባት', 'በራስ ብቻ'],
        answer: 2,
        why: 'ኑዛዜ ለተመረጠው የነፍስ አባት ይደረጋል።'
      },
      {
        q: 'ቀኖና ማለት ምን ማለት ነው?',
        options: ['ቅጣት ብቻ', 'የነፍስ አባት የሚሰጠው መንፈሳዊ መድኃኒት', 'ክፍያ', 'መዝሙር'],
        answer: 1,
        why: 'ቀኖና ነፍስን ለማዳን የሚሰጥ መንፈሳዊ ሥርዓት ነው።'
      }
    ]
  },
  {
    id: 'l2', num: '፪', subject: 'sinemigbar',
    title: 'ጸሎት እና ክርስቲያናዊ አኗኗር',
    teacher: 'መምህር ሰላም',
    minutes: 14,
    youtube: '',
    summary: 'ሰባቱ ጊዜያተ ጸሎት፣ አቡነ ዘበሰማያት እና ጸሎት በዕለት ተዕለት ሕይወት።',
    questions: [
      {
        q: 'በሥርዓተ ቤተ ክርስቲያን በቀን ስንት ጊዜ ጸሎት ይደረጋል?',
        options: ['ሦስት ጊዜ', 'አምስት ጊዜ', 'ሰባት ጊዜ', 'ዐሥር ጊዜ'],
        answer: 2,
        why: 'ሰባቱ ጊዜያተ ጸሎት ይባላሉ።'
      },
      {
        q: 'ጌታችን ኢየሱስ ክርስቶስ ያስተማረን ጸሎት ማን ይባላል?',
        options: ['አቡነ ዘበሰማያት', 'መዝሙረ ዳዊት', 'ውዳሴ ማርያም', 'አንቀጸ ብርሃን'],
        answer: 0,
        why: 'በማቴዎስ ወንጌል ምዕራፍ ፮ ላይ ተጽፎ ይገኛል።'
      },
      {
        q: 'ጸሎት ከሚያስፈልጋቸው ነገሮች አንዱ ያልሆነው የትኛው ነው?',
        options: ['እምነት', 'ትሕትና', 'ትዕግሥት', 'ችኩልነት'],
        answer: 3,
        why: 'ጸሎት በእምነት፣ በትሕትናና በትዕግሥት የሚደረግ ነው።'
      }
    ]
  },
  {
    id: 'z1', num: '፩', subject: 'wengele',
    title: 'ወንጌለ ዮሐንስ — መግቢያ',
    teacher: 'መምህር (ይተካ)',
    minutes: 18,
    youtube: '',
    summary: 'የዜማ ትምህርት መነሻ፣ ቅዱስ ያሬድና ሦስቱ ዜማዎች።'
  },
  {
    id: 'z2', num: '፪', subject: 'zemaadv',
    title: 'ድጓ',
    teacher: 'መምህር (ይተካ)',
    minutes: 20,
    youtube: '',
    summary: 'የዓመቱን በዓላት የሚሸፍነው የቅዱስ ያሬድ ዋና የዜማ መጽሐፍ።'
  },
  {
    id: 'z3', num: '፫', subject: 'zemaadv',
    title: 'ጾመ ድጓ',
    teacher: 'መምህር (ይተካ)',
    minutes: 19,
    youtube: '',
    summary: 'የዐቢይ ጾም ዜማ፣ እና ዕዝል ለምን እንደሚያገለግል።'
  },
  {
    id: 'z4', num: '፬', subject: 'zemaadv',
    title: 'ምዕራፍ',
    teacher: 'መምህር (ይተካ)',
    minutes: 16,
    youtube: '',
    summary: 'የምዕራፍ አከፋፈልና በዜማ ውስጥ ያለው ቦታ።'
  },
  {
    id: 'z5', num: '፭', subject: 'zemaadv',
    title: 'ዝማሬ ወመዋሥዕት',
    teacher: 'መምህር (ይተካ)',
    minutes: 17,
    youtube: '',
    summary: 'ዝማሬ ከቁርባን በኋላ፣ መዋሥዕት በምላሽ ሥርዓት።'
  },
  {
    id: 'z6', num: '፮', subject: 'zemaadv',
    title: 'ቅዳሴ በዜማ',
    teacher: 'መምህር (ይተካ)',
    minutes: 20,
    youtube: '',
    summary: 'የቅዳሴ ዜማና ተማሪው የሚደርስበት የመጨረሻ ደረጃ።'
  }
];

/* Lesson l1 is the free preview: a parent can watch one whole lesson
   before being asked to pay. Everything else needs a paid account. */
export const FREE_PREVIEW_ID = 'l1';

/* ---------------- lookups ---------------- */

export const findLesson = (id) => LESSONS.find(l => l.id === id);
export const subjectById = (id) => SUBJECTS.find(s => s.id === id);
export const subjectsFor = (track) => SUBJECTS.filter(s => s.track === track);
export const lessonsForSubject = (subjectId) => LESSONS.filter(l => l.subject === subjectId);

/* The track of a lesson comes from its subject — stored once, so the two
   can never disagree. */
export const trackOfLesson = (lesson) => subjectById(lesson && lesson.subject)?.track ?? null;
export const lessonsFor = (track) =>
  LESSONS.filter(l => trackOfLesson(l) === track);

export const isFree = (id) => id === FREE_PREVIEW_ID;

/* ---------------- duration sanity ----------------
   Returns the lessons whose DECLARED minutes fall outside the range.
   This catches a typo in the metadata. It cannot catch a 22-minute video
   labelled 11 — only the player knows that, so lesson.html compares the
   real getDuration() against these minutes once the video is ready. */
export function outOfRangeLessons(lessons = LESSONS) {
  return lessons.filter(l =>
    typeof l.minutes === 'number' &&
    (l.minutes < LESSON_MIN_MINUTES || l.minutes > LESSON_MAX_MINUTES));
}

// One grouped warning at load rather than one per lesson, so a handful of
// placeholders does not bury everything else in the console.
const offenders = outOfRangeLessons();
if (offenders.length) {
  console.warn(
    `[lessons] ${offenders.length} lesson(s) declare a length outside ` +
    `${LESSON_MIN_MINUTES}-${LESSON_MAX_MINUTES} minutes:`,
    offenders.map(l => `${l.id} (${l.minutes}m)`).join(', ')
  );
}
