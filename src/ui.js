const SETTINGS_KEY = 'ta3s_gmc_pro_settings';

const defaultSettings = {
  volume: 0.7,
  sfx: true,
  blood: true,
  vibration: true,
  contrast: false,
  invert: false,
  buttonScale: 1,
  language: 'ar',
  hudHidden: false,
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
      vibration: 'الاهتزاز',
      contrast: 'نمط التباين العالي',
      invert: 'عكس الاتجاه',
      buttons: 'حجم الأزرار',
      buttonsSmall: 'صغير',
      buttonsMedium: 'متوسط',
      buttonsLarge: 'كبير',
      language: 'اللغة',
      flip: 'قلب الاتجاه سريعًا',
    },
    qteSuccess: 'فكّ التغريز',
    choiceHint: 'اضغط 1/2/3 للاختيار بسرعة',
  },
  en: {
    hud: { speed: 'Speed', score: 'Score', combo: 'Combo', nitro: 'Nitro', winch: 'Winch', time: 'Time' },
    end: { retry: 'Retry', score: 'Score', time: 'Time', combo: 'Best Combo', pb: 'Best Record' },
    settings: {
      title: 'Settings',
      volume: 'Master Volume',
      sfx: 'Enable SFX',
      blood: 'Cartoon Blood',
      vibration: 'Vibration',
      contrast: 'High Contrast',
      invert: 'Invert Direction',
      buttons: 'Button Size',
      buttonsSmall: 'Small',
      buttonsMedium: 'Medium',
      buttonsLarge: 'Large',
      language: 'Language',
      flip: 'Flip Direction Quickly',
    },
    qteSuccess: 'Freed the wheels',
    choiceHint: 'Press 1/2/3 to choose quickly',
  },
};

const applyLanguage = lang => {
  const dict = strings[lang] || strings.ar;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const path = node.dataset.i18n.split('.');
    let value = dict;
    for (const part of path) value = value?.[part];
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
  const hudPhase = document.getElementById('hudPhase');
  const hudProgress = document.getElementById('hudProgress');
  const topBar = document.getElementById('topBar');
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
  const settingsClose = document.getElementById('settingsClose');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingVolume = document.getElementById('settingVolume');
  const settingSfx = document.getElementById('settingSfx');
  const settingBlood = document.getElementById('settingBlood');
  const settingVibration = document.getElementById('settingVibration');
  const settingContrast = document.getElementById('settingContrast');
  const settingInvert = document.getElementById('settingInvert');
  const settingButtonScale = document.getElementById('settingButtonScale');
  const settingLanguage = document.getElementById('settingLanguage');
  const settingsFlipDev = document.getElementById('settingsFlipDev');
  const hudToggle = document.getElementById('hudToggle');
  const controlsButtons = document.querySelectorAll('#controls button');

  const toastState = { timer: 0 };
  const bannerState = { timer: 0 };

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

  function applySettings(cfg) {
    settingVolume.value = cfg.volume;
    settingSfx.checked = cfg.sfx;
    settingBlood.checked = cfg.blood;
    settingVibration.checked = cfg.vibration;
    settingContrast.checked = cfg.contrast;
    settingInvert.checked = cfg.invert;
    settingButtonScale.value = cfg.buttonScale;
    settingLanguage.value = cfg.language;
    document.documentElement.style.setProperty('--button-scale', cfg.buttonScale);
    document.body.classList.toggle('high-contrast', cfg.contrast);
    applyLanguage(cfg.language);
    topBar.classList.toggle('hidden', cfg.hudHidden);
    hudToggle.setAttribute('aria-pressed', String(cfg.hudHidden));
    hudToggle.textContent = cfg.hudHidden ? '🖥️' : '🛑';
  }

  settingVolume.addEventListener('input', () => {
    settings.volume = Number(settingVolume.value);
    persistSettings();
  });
  settingSfx.addEventListener('change', () => {
    settings.sfx = settingSfx.checked;
    persistSettings();
  });
  settingBlood.addEventListener('change', () => {
    settings.blood = settingBlood.checked;
    persistSettings();
  });
  settingVibration.addEventListener('change', () => {
    settings.vibration = settingVibration.checked;
    persistSettings();
  });
  settingContrast.addEventListener('change', () => {
    settings.contrast = settingContrast.checked;
    document.body.classList.toggle('high-contrast', settings.contrast);
    persistSettings();
  });
  settingInvert.addEventListener('change', () => {
    settings.invert = settingInvert.checked;
    persistSettings();
  });
  settingButtonScale.addEventListener('change', () => {
    settings.buttonScale = Number(settingButtonScale.value);
    document.documentElement.style.setProperty('--button-scale', settings.buttonScale);
    persistSettings();
  });
  settingLanguage.addEventListener('change', () => {
    settings.language = settingLanguage.value;
    applyLanguage(settings.language);
    persistSettings();
  });

  settingsToggle.addEventListener('click', () => toggleSettings(true));
  settingsClose.addEventListener('click', () => toggleSettings(false));
  settingsPanel.addEventListener('click', e => {
    if (e.target === settingsPanel) toggleSettings(false);
  });

  settingsFlipDev.addEventListener('click', () => {
    settings.invert = !settings.invert;
    settingInvert.checked = settings.invert;
    persistSettings();
  });

  hudToggle.addEventListener('click', () => {
    settings.hudHidden = !settings.hudHidden;
    topBar.classList.toggle('hidden', settings.hudHidden);
    hudToggle.setAttribute('aria-pressed', String(settings.hudHidden));
    hudToggle.textContent = settings.hudHidden ? '🖥️' : '🛑';
    persistSettings();
  });

  const toggleSettings = open => {
    settingsPanel.classList.toggle('open', open);
    settingsPanel.setAttribute('aria-hidden', String(!open));
  };

  const showToast = (text, duration = 1.6) => {
    toast.textContent = text;
    toast.classList.add('visible');
    toastState.timer = duration;
  };

  const showBanner = (text, duration = 2.2) => {
    banner.textContent = text;
    banner.classList.add('visible');
    bannerState.timer = duration;
  };

  const showChoiceBanner = (text, options) => {
    const hint = strings[settings.language].choiceHint;
    banner.innerHTML = `${text}<br>${options.map(opt => opt.label).join(' • ')}<br><small>${hint}</small>`;
    banner.classList.add('visible');
    bannerState.timer = 3;
  };

  const hideBanner = () => {
    banner.classList.remove('visible');
    bannerState.timer = 0;
  };

  const setQTE = visible => {
    qte.classList.toggle('active', visible);
    qte.setAttribute('aria-hidden', String(!visible));
  };

  const updateQTE = (progress, expect) => {
    qteFill.style.width = `${(progress * 100).toFixed(1)}%`;
    qteTitle.textContent = expect === 'KeyK' ? '☁️ تغريز! اضرب K ثم L' : '☁️ تغريز! اضرب L ثم K';
  };

  const updateHUD = data => {
    hudSpeed.textContent = data.speed.toFixed(0);
    hudScore.textContent = Math.round(data.score);
    hudCombo.textContent = `x${data.combo.toFixed(2)}`;
    hudComboTime.textContent = data.comboTime > 0 ? `(${data.comboTime.toFixed(1)}s)` : '';
    hudNitro.textContent = data.nitro;
    hudWinch.textContent = data.winch;
    hudTime.textContent = data.time.toFixed(1);
    hudPhase.textContent = data.phase;
    hudProgress.style.width = `${(data.progress * 100).toFixed(1)}%`;
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

  restartBtn.addEventListener('click', hideEndCard);

  return {
    settings,
    showToast,
    showBanner,
    hideBanner,
    showChoiceBanner,
    setQTE,
    updateQTE,
    updateHUD,
    showEndCard,
    hideEndCard,
    restartBtn,
    topBar,
    controlsButtons,
    strings: () => strings[settings.language] || strings.ar,
    setHudInvert(active) {
      topBar.classList.toggle('invert', active);
    },
    update(dt) {
      if (toastState.timer > 0) {
        toastState.timer -= dt;
        if (toastState.timer <= 0) toast.classList.remove('visible');
      }
      if (bannerState.timer > 0) {
        bannerState.timer -= dt;
        if (bannerState.timer <= 0) hideBanner();
      }
    },
  };
};
