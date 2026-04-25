export const ITEMS = {
  salt: {
    en: 'Salt', ar: 'ملح', color: '#f8f5df', short: 'S',
    joke: { en: 'No salt: camp chef files a complaint.', ar: 'بدون ملح: الشيف دخل وضع النكد.' }
  },
  knife: {
    en: 'Knife', ar: 'سكين', color: '#dce7ff', short: 'K',
    joke: { en: 'No knife: cutting onions with optimism.', ar: 'بدون سكين: تقطيع البصل بالأمل.' }
  },
  tongs: {
    en: 'Tongs', ar: 'ملقط', color: '#b5b8c8', short: 'T',
    joke: { en: 'No tongs: grill flip speed reduced.', ar: 'بدون ملقط: التقليب صار بمقاس المغامرة.' }
  },
  onion: {
    en: 'Onion', ar: 'بصل', color: '#b887ff', short: 'O',
    joke: { en: 'No onion: burger feels emotionally empty.', ar: 'بدون بصل: البرجر ناقصه شخصية.' }
  },
  mayo: {
    en: 'Mayo', ar: 'مايونيز', color: '#fff6c9', short: 'M',
    joke: { en: 'No mayo: sandwich enters dry mode.', ar: 'بدون مايونيز: الساندوتش دخل وضع ناشف.' }
  }
};

export const UPGRADE_KEYS = ['engine', 'tires', 'suspension', 'winch'];

export const TEXT = {
  ar: {
    title: 'لعبة الرافعية',
    subtitle: 'اصعد السيف، تجنب الربادات، وجهّز القعدة.',
    play: 'ابدأ الطلعة',
    upgrades: 'التطويرات',
    back: 'رجوع',
    menu: 'القائمة',
    restart: 'إعادة',
    language: 'English',
    coins: 'نقاط',
    best: 'أفضل ارتفاع',
    height: 'الارتفاع',
    mood: 'مزاج القعدة',
    score: 'النتيجة',
    event: 'حدث',
    checklist: 'منسيات القعدة',
    controls: 'D/→ بنزين • A/← فرامل • Space ونش • Q/E توازن',
    touchHint: 'أزرار لمس تظهر أثناء اللعب',
    winTitle: 'وصلت السيف!',
    loseTitle: 'انقلبنا… عادي تصير',
    visit: 'زوروا الرافعية | Visit Alrafyah',
    safety: 'تنبيه: القيادة في الطعوس الحقيقية تحتاج دبل وممارسة آمنة.',
    collected: 'جمعت',
    missing: 'ناقص',
    finalMood: 'مزاج النهاية',
    earned: 'مكافأة الطلعة',
    upgradeTitle: 'تطوير الدبل',
    level: 'المستوى',
    max: 'الأقصى',
    buy: 'طوّر',
    cost: 'التكلفة',
    notEnough: 'النقاط ما تكفي',
    engine: 'العزم',
    tires: 'الكفرات',
    suspension: 'التعليق',
    winch: 'الونش',
    engineDesc: 'قوة صعود أعلى فوق السيف.',
    tiresDesc: 'تماسك أفضل مع الرمل والربادات.',
    suspensionDesc: 'ثبات أعلى وهبوط أنعم.',
    winchDesc: 'خروج أسرع من التغريز.',
    storm: 'هبة رملية',
    helicopter: 'هليكوبتر تدريب بعيد',
    rabdat: 'ربادة! هز السيارة يمين/يسار',
    winchReady: 'الونش جاهز',
    winchCooldown: 'الونش يبرد',
    noWinch: 'طوّر الونش للخروج أسرع',
    finishHint: 'القمة قدامك… لا تهدّي!',
    startHint: 'ادخل من جسر الرافعية واتجه للطعوس.',
    github: 'جاهزة لـ GitHub Pages',
    runSummary: 'الملخص',
    personalBest: 'رقمك الجديد',
    noItems: 'ما جمعت ولا غرض… القعدة بتصير درس حياة.',
    audio: 'الصوت يعمل عند أول لمسة/زر.',
    agentReady: 'نسخة MVP جاهزة للتشغيل والدبلويمنت.'
  },
  en: {
    title: 'Alrafyah Game',
    subtitle: 'Climb Al-Seef, dodge Rabdat traps, and prep the camp.',
    play: 'Start Run',
    upgrades: 'Upgrades',
    back: 'Back',
    menu: 'Menu',
    restart: 'Restart',
    language: 'العربية',
    coins: 'Coins',
    best: 'Best Height',
    height: 'Height',
    mood: 'Camp Mood',
    score: 'Score',
    event: 'Event',
    checklist: 'Camp Checklist',
    controls: 'D/→ gas • A/← brake • Space winch • Q/E balance',
    touchHint: 'Touch controls appear in-game',
    winTitle: 'You reached Al-Seef!',
    loseTitle: 'Rolled over… desert happens.',
    visit: 'زوروا الرافعية | Visit Alrafyah',
    safety: 'Safety: real dune driving requires 4x4 skill and safe practice.',
    collected: 'Collected',
    missing: 'Missing',
    finalMood: 'Final Mood',
    earned: 'Run Reward',
    upgradeTitle: 'Upgrade the 4x4',
    level: 'Level',
    max: 'Max',
    buy: 'Upgrade',
    cost: 'Cost',
    notEnough: 'Not enough coins',
    engine: 'Engine',
    tires: 'Tires',
    suspension: 'Suspension',
    winch: 'Winch',
    engineDesc: 'More torque for dune crests.',
    tiresDesc: 'Better sand and trap traction.',
    suspensionDesc: 'More stability and softer landings.',
    winchDesc: 'Faster recovery from Rabdat traps.',
    storm: 'Sandstorm Gust',
    helicopter: 'Distant Training Helicopter',
    rabdat: 'Rabdat! Rock the car out',
    winchReady: 'Winch ready',
    winchCooldown: 'Winch cooling',
    noWinch: 'Upgrade winch for faster recovery',
    finishHint: 'Summit ahead… keep momentum!',
    startHint: 'Enter via Alrafyah bridge, then into the dunes.',
    github: 'GitHub Pages ready',
    runSummary: 'Summary',
    personalBest: 'New personal best',
    noItems: 'No items collected… camp becomes a life lesson.',
    audio: 'Audio starts after first tap/key.',
    agentReady: 'MVP build ready to run and deploy.'
  }
};

export function t(lang, key, vars = {}) {
  let value = TEXT[lang]?.[key] ?? TEXT.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) value = value.replaceAll(`{${k}}`, String(v));
  return value;
}

export function itemName(lang, id) {
  return ITEMS[id]?.[lang] ?? id;
}

export function itemJoke(lang, id) {
  return ITEMS[id]?.joke?.[lang] ?? '';
}
