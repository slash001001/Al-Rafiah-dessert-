import { formatTime } from './utils.js';
import { setAudioEnabled, setMasterVolume } from './audio.js';
import { registerTouchControl, registerQTEButton, setInvertControls, setQTEVisible } from './input.js';

const SETTINGS_KEY = 'ta3s_gmc_settings';

const defaultSettings = {
  volume: 0.7,
  sfx: true,
  blood: true,
  highContrast: false,
  invert: false,
  buttonScale: 1,
  language: 'ar',
};

const strings = {
  ar: {
    hud: { speed: 'السرعة', score: 'النقاط', combo: 'الكومبو', nitro: 'النيترو', winch: 'الونش', time: 'الوقت' },
    end: { retry: 'إعادة اللعب', score: 'النقاط', time: 'الزمن', combo: 'أعلى كومبو', pb: 'أفضل نتيجة' },
    settings: {
      title: 'الإعدادات',
      volume: 'مستوى الصوت',
      sfx: 'تشغيل المؤثرات',
      blood: 'الدم الكرتوني',
      contrast: 'نمط التباين العالي',
      invert: 'عكس الاتجاه',
      buttons: 'حجم الأزرار',
      language: 'اللغة',
      flip: 'قلب الاتجاه سريعًا',
    },
    qteSuccess: 'فكّ التغريز',
    choicesHint: 'اضغط 1 / 2 / 3 للاختيار',
  },
  en: {
    hud: { speed: 'Speed', score: 'Score', combo: 'Combo', nitro: 'Nitro', winch: 'Winch', time: 'Time' },
    end: { retry: 'Retry', score: 'Score', time: 'Time', combo: 'Best Combo', pb: 'Best Record' },
    settings: {
      title: 'Settings',
      volume: 'Master Volume',
      sfx: 'Enable SFX',
      blood: 'Cartoon Blood',
      contrast: 'High Contrast',
      invert: 'Invert Direction',
      buttons: 'Button Size',
      language: 'Language',
      flip: 'Flip Direction Quickly',
    },
    qteSuccess: 'Freed the wheels',
    choicesHint: 'Press 1 / 2 / 3 to choose',
  },
};

const applyLanguage = lang => {
  const table = strings[lang] || strings.ar;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const path = node.dataset.i18n.split('.');
    let value = table;
    for (const part of path) {
      value = value?.[part];
    }
    if (typeof value === 'string') node.textContent = value;
  });
};

export const initUI = () => {
  const hudSpeed = document.getElementById('hudSpeed');
  const hudScore = document.getElementById('hudScore');
  const hudCombo = document.getElementById('hudCombo');
  const hudComboTime = document.getElementById('hudComboTime');
  const hudNitro = document.getElementById('hudNitro');
  const hudWinch = document.getElementById('hudWinch');
  const hudTime = document.getElementById('hudTime');
  const hudProgress = document.getElementById('hudProgress');
  const hudPhase = document.getElementById('hudPhase');
  const toast = document.getElementById('toast');
  const banner = document.getElementById('banner');
  const qte = document.getElementById('qte');
  const qteFill = document.getElementById('qteFill');
  const qteTitle = document.getElementById('qteTitle');
  const endCard = document.getElementById('endCard');
  const endScore = document.getElementById('endScore');
  const endTime = document.getElementById('endTime');
  const endCombo = document.getElementById('endCombo');
  const endPB = document.getElementById('endPB');
  const restartBtn = document.getElementById('restartBtn');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsClose = document.getElementById('settingsClose');
  const settingVolume = document.getElementById('settingVolume');
  const settingSfx = document.getElementById('settingSfx');
  const settingBlood = document.getElementById('settingBlood');
  const settingContrast = document.getElementById('settingContrast');
  const settingInvert = document.getElementById('settingInvert');
  const settingButtonScale = document.getElementById('settingButtonScale');
  const settingLanguage = document.getElementById('settingLanguage');
  const settingsFlipDev = document.getElementById('settingsFlipDev');
  const controls = document.querySelectorAll('#controls button');
  const qteButtons = document.querySelectorAll('#qteKeys button');
  const debugOverlay = document.getElementById('debugOverlay');
  const debugContent = document.getElementById('debugContent');
  const topBar = document.getElementById('topBar');

  controls.forEach(btn => {
    const action = btn.dataset.control;
    if (!action) return;
    if (action.startsWith('qte:')) {
      registerQTEButton(btn);
    } else {
      registerTouchControl(btn, action);
    }
  });

  qteButtons.forEach(btn => {
    registerQTEButton(btn);
    btn.addEventListener('pointerdown', e => e.preventDefault());
  });

  const uiState = {
    toastTimer: 0,
    bannerTimer: 0,
    settingsOpen: false,
    highContrast: false,
    strings: strings.ar,
  };

  const settings = loadSettings();
  applySettings(settings);

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return { ...defaultSettings, ...saved };
    } catch {
      return { ...defaultSettings };
    }
  }

  function persistSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function applySettings(s) {
    settingVolume.value = s.volume;
    settingSfx.checked = s.sfx;
    settingBlood.checked = s.blood;
    settingContrast.checked = s.highContrast;
    settingInvert.checked = s.invert;
    settingButtonScale.value = s.buttonScale;
    settingLanguage.value = s.language;
    document.body.classList.toggle('high-contrast', s.highContrast);
    document.documentElement.style.setProperty('--button-scale', s.buttonScale);
    setMasterVolume(s.volume);
    setAudioEnabled(s.sfx);
    setInvertControls(s.invert);
    applyLanguage(s.language);
    uiState.strings = strings[s.language] || strings.ar;
  }

  settingVolume.addEventListener('input', () => {
    settings.volume = Number(settingVolume.value);
    setMasterVolume(settings.volume);
    persistSettings();
  });
  settingSfx.addEventListener('change', () => {
    settings.sfx = settingSfx.checked;
    setAudioEnabled(settings.sfx);
    persistSettings();
  });
  settingBlood.addEventListener('change', () => {
    settings.blood = settingBlood.checked;
    persistSettings();
  });
  settingContrast.addEventListener('change', () => {
    settings.highContrast = settingContrast.checked;
    document.body.classList.toggle('high-contrast', settings.highContrast);
    persistSettings();
  });
  settingInvert.addEventListener('change', () => {
    settings.invert = settingInvert.checked;
    setInvertControls(settings.invert);
    persistSettings();
  });
  settingButtonScale.addEventListener('input', () => {
    settings.buttonScale = Number(settingButtonScale.value);
    document.documentElement.style.setProperty('--button-scale', settings.buttonScale);
    persistSettings();
  });
  settingLanguage.addEventListener('change', () => {
    settings.language = settingLanguage.value;
    applyLanguage(settings.language);
    uiState.strings = strings[settings.language] || strings.ar;
    persistSettings();
  });

  const toggleSettings = open => {
    const next = open ?? !settingsPanel.classList.contains('open');
    settingsPanel.classList.toggle('open', next);
    settingsPanel.setAttribute('aria-hidden', String(!next));
  };

  settingsToggle.addEventListener('click', () => toggleSettings(true));
  settingsClose.addEventListener('click', () => toggleSettings(false));
  settingsPanel.addEventListener('click', e => {
    if (e.target === settingsPanel) toggleSettings(false);
  });

  settingsFlipDev.addEventListener('click', () => {
    settings.invert = !settings.invert;
    settingInvert.checked = settings.invert;
    setInvertControls(settings.invert);
    persistSettings();
  });

  const showToast = (msg, duration = 1.4) => {
    toast.textContent = msg;
    toast.classList.add('visible');
    uiState.toastTimer = duration;
  };

  const showBanner = (msg, duration = 2.2) => {
    banner.textContent = msg;
    banner.classList.add('visible');
    uiState.bannerTimer = duration;
  };

  const showChoiceBanner = (msg, options) => {
    const hint = uiState.strings.choicesHint;
    banner.innerHTML = `${msg}<br>${options.map(opt => opt.label).join(' · ')}<br><small>${hint}</small>`;
    banner.classList.add('visible');
    uiState.bannerTimer = 4;
  };

  const hideBanner = () => {
    banner.classList.remove('visible');
    uiState.bannerTimer = 0;
  };

  const setQTE = visible => {
    qte.classList.toggle('active', visible);
    setQTEVisible(visible);
    qte.setAttribute('aria-hidden', String(!visible));
  };

  const updateQTE = (progress, expect) => {
    qteFill.style.width = `${(progress * 100).toFixed(1)}%`;
    const title = expect === 'KeyK' ? '☁️ تغريز! اضرب K ثم L' : '☁️ تغريز! اضرب L ثم K';
    qteTitle.textContent = title;
  };

  const updateHUD = data => {
    hudSpeed.textContent = data.speed.toFixed(0);
    hudScore.textContent = Math.round(data.score);
    hudCombo.textContent = `x${data.combo.toFixed(2)}`;
    hudComboTime.textContent = data.comboTime > 0 ? `(${data.comboTime.toFixed(1)}s)` : '';
    hudNitro.textContent = data.nitro;
    hudWinch.textContent = data.winch;
    hudTime.textContent = formatTime(data.time);
    hudProgress.style.width = `${(data.progress * 100).toFixed(1)}%`;
    hudPhase.textContent = data.phase;
  };

  const setHudInvert = active => {
    topBar.classList.toggle('invert', active);
  };

  const showEndCard = result => {
    endScore.textContent = Math.round(result.score);
    endTime.textContent = `${result.time.toFixed(1)}s`;
    endCombo.textContent = `x${result.maxCombo.toFixed(2)}`;
    endPB.textContent = result.pb ? `${result.pb.score} pts • x${result.pb.combo.toFixed(2)}` : '—';
    endCard.classList.add('visible');
    endCard.setAttribute('aria-hidden', 'false');
  };

  const hideEndCard = () => {
    endCard.classList.remove('visible');
    endCard.setAttribute('aria-hidden', 'true');
  };

  const setDebug = info => {
    debugOverlay.hidden = false;
    debugContent.textContent = info;
  };

  return {
    update(dt) {
      if (uiState.toastTimer > 0) {
        uiState.toastTimer -= dt;
        if (uiState.toastTimer <= 0) toast.classList.remove('visible');
      }
      if (uiState.bannerTimer > 0) {
        uiState.bannerTimer -= dt;
        if (uiState.bannerTimer <= 0) hideBanner();
      }
    },
    showToast,
    showBanner,
    showChoiceBanner,
    hideBanner,
    setQTE,
    updateQTE,
    updateHUD,
    showEndCard,
    hideEndCard,
    restartBtn,
    settings,
    setHudInvert,
    setDebug,
    toggleSettings,
    strings: () => uiState.strings,
  };
};
