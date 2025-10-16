const EVENT_UI_READY = 'level-ready';
const EVENT_UI_HUD = 'level-hud';
const EVENT_UI_TOAST = 'level-toast';
const EVENT_UI_STATUS = 'level-status';
const EVENT_UI_FINISH = 'level-finish';
const EVENT_UI_STORM = 'level-sandstorm';

const EVENT_START = 'ui-start-request';
const EVENT_PAUSE = 'ui-pause-request';
const EVENT_RESTART = 'ui-restart-request';
const EVENT_LANGUAGE = 'ui-language-request';
const EVENT_MODE = 'ui-mode-toggle';
const EVENT_AUDIO = 'ui-audio-toggle';
const EVENT_MOBILE_INPUT = 'ui-mobile-input';
const EVENT_REDUCED_MOTION = 'ui-reduced-motion';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.shared = null;
  }

  init() {
    this.shared = window.RAFIAH_SHARED || this.game.registry.get('shared') || {};
    this.language = this.shared.language ?? 'ar';
    this.eventsBus = this.shared.events || this.game.events;
    this.state = {
      paused: true,
      finished: false,
      combo: 0,
      score: 0,
      speed: 0,
      nitro: { active: false, timer: 0, cooldown: 0, duration: 1.25 },
      kettle: 0
    };
    this.mobileState = {
      left: false,
      right: false,
      reverse: false,
      brake: false,
      nitro: false,
      throttle: false
    };
  }

  create() {
    this.createHUD();
    this.createStartOverlay();
    this.createPauseMenu();
    this.createToast();
    this.createFinishOverlay();
    this.createPauseButton();
    this.createSandstormBadge();
    this.createMobileControls();
    this.registerEvents();
    this.updateLanguage();
  }

  registerEvents() {
    this.eventsBus.on(EVENT_UI_READY, this.handleReady, this);
    this.eventsBus.on(EVENT_UI_HUD, this.updateHud, this);
    this.eventsBus.on(EVENT_UI_STATUS, this.updateStatus, this);
    this.eventsBus.on(EVENT_UI_TOAST, this.showToast, this);
    this.eventsBus.on(EVENT_UI_FINISH, this.showFinish, this);
    this.eventsBus.on(EVENT_UI_STORM, this.onSandstormState, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupEvents());
  }

  cleanupEvents() {
    this.eventsBus.off(EVENT_UI_READY, this.handleReady, this);
    this.eventsBus.off(EVENT_UI_HUD, this.updateHud, this);
    this.eventsBus.off(EVENT_UI_STATUS, this.updateStatus, this);
    this.eventsBus.off(EVENT_UI_TOAST, this.showToast, this);
    this.eventsBus.off(EVENT_UI_FINISH, this.showFinish, this);
    this.eventsBus.off(EVENT_UI_STORM, this.onSandstormState, this);
  }

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(100);

    this.speedText = this.add.text(32, 24, '0 km/h', {
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      color: '#1D2A38',
      backgroundColor: 'rgba(255,255,255,0.65)',
      padding: { x: 12, y: 8 }
    }).setScrollFactor(0);

    this.scoreText = this.add.text(this.scale.width - 32, 24, '0', {
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      color: '#1D2A38',
      backgroundColor: 'rgba(255,255,255,0.65)',
      padding: { x: 12, y: 8 }
    }).setOrigin(1, 0).setScrollFactor(0);

    this.comboText = this.add.text(this.scale.width - 32, 64, 'Combo 0', {
      fontSize: 18,
      fontFamily: 'system-ui, sans-serif',
      color: '#2E86AB',
      backgroundColor: 'rgba(255,255,255,0.65)',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setScrollFactor(0);

    this.nitroBarBg = this.add.rectangle(32, 80, 200, 18, 0xffffff, 0.5).setOrigin(0, 0).setScrollFactor(0);
    this.nitroBar = this.add.rectangle(32, 80, 200, 18, 0x2E86AB, 0.9).setOrigin(0, 0).setScale(0, 1).setScrollFactor(0);

    this.kettleIcon = this.add.image(this.scale.width / 2, this.scale.height - 80, 'kettle-icon')
      .setScale(0.35)
      .setScrollFactor(0)
      .setDepth(102);
  }

  createStartOverlay() {
    const { width, height } = this.scale;
    this.startOverlay = this.add.container(0, 0).setDepth(200);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);
    const title = this.add.text(width / 2, height / 2 - 120, 'طعيس – Rafiah Dune Adventure', {
      fontSize: 42,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);
    const button = this.createButton(width / 2, height / 2 + 40, 'menu.start', () => {
      this.startOverlay.setVisible(false);
      this.state.paused = false;
      this.eventsBus.emit(EVENT_START);
    });
    this.startOverlay.add([bg, title, button]);
  }

  createPauseMenu() {
    const { width, height } = this.scale;
    this.pauseOverlay = this.add.container(0, 0).setDepth(210).setVisible(false);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    const panel = this.add.rectangle(width / 2, height / 2, 420, 420, 0xF8E9D2, 0.96)
      .setStrokeStyle(4, 0x5E3116, 0.6);
    this.resumeButton = this.createButton(width / 2, height / 2 - 120, 'menu.resume', () => {
      this.pauseOverlay.setVisible(false);
      this.state.paused = false;
      this.eventsBus.emit(EVENT_START);
    });
    this.restartButton = this.createButton(width / 2, height / 2 - 40, 'menu.restart', () => {
      this.pauseOverlay.setVisible(false);
      this.state.paused = true;
      this.eventsBus.emit(EVENT_RESTART);
    });
    this.musicToggle = this.createToggle(width / 2, height / 2 + 40, 'ui.mute', true, enabled => {
      this.eventsBus.emit(EVENT_AUDIO, { type: 'music', enabled });
    });
    this.sfxToggle = this.createToggle(width / 2, height / 2 + 110, 'ui.mute', true, enabled => {
      this.eventsBus.emit(EVENT_AUDIO, { type: 'sfx', enabled });
    });
    this.langButton = this.createButton(width / 2, height / 2 + 180, 'menu.language', () => {
      this.language = this.language === 'ar' ? 'en' : 'ar';
      this.updateLanguage();
      this.eventsBus.emit(EVENT_LANGUAGE, this.language);
    });
    this.pauseOverlay.add([
      bg,
      panel,
      this.resumeButton,
      this.restartButton,
      this.musicToggle.container,
      this.sfxToggle.container,
      this.langButton
    ]);
  }

  createToast() {
    this.toastText = this.add.text(this.scale.width / 2, this.scale.height * 0.18, '', {
      fontSize: 28,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(46,134,171,0.85)',
      padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setDepth(205).setScrollFactor(0).setAlpha(0);

    this.toastQueue = [];
  }

  createFinishOverlay() {
    const { width, height } = this.scale;
    this.finishOverlay = this.add.container(0, 0).setDepth(220).setVisible(false);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    const panel = this.add.rectangle(width / 2, height / 2, 460, 360, 0xF8E9D2, 0.98)
      .setStrokeStyle(5, 0x5E3116, 0.7);
    this.finishTitle = this.add.text(width / 2, height / 2 - 110, '', {
      fontSize: 36,
      fontFamily: 'system-ui, sans-serif',
      color: '#2E3116'
    }).setOrigin(0.5);
    this.finishScore = this.add.text(width / 2, height / 2 - 30, '', {
      fontSize: 28,
      color: '#2E86AB',
      fontFamily: 'system-ui, sans-serif'
    }).setOrigin(0.5);
    this.finishRank = this.add.text(width / 2, height / 2 + 40, '', {
      fontSize: 32,
      color: '#A86B38',
      fontFamily: 'system-ui, sans-serif'
    }).setOrigin(0.5);
    const closeBtn = this.createButton(width / 2, height / 2 + 120, 'menu.restart', () => {
      this.finishOverlay.setVisible(false);
      this.eventsBus.emit(EVENT_RESTART);
    });
    this.finishOverlay.add([bg, panel, this.finishTitle, this.finishScore, this.finishRank, closeBtn]);
  }

  createPauseButton() {
    this.pauseButton = this.add.text(this.scale.width - 32, this.scale.height - 32, 'II', {
      fontSize: 28,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: { x: 12, y: 6 }
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(150).setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => {
      this.pauseOverlay.setVisible(true);
      this.state.paused = true;
      this.eventsBus.emit(EVENT_PAUSE);
    });
  }

  createSandstormBadge() {
    this.stormBadge = this.add.text(32, this.scale.height - 60, '', {
      fontSize: 20,
      fontFamily: 'system-ui, sans-serif',
      color: '#F4C27A',
      backgroundColor: 'rgba(46,49,22,0.65)',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(160).setVisible(false);
  }

  createMobileControls() {
    const mobileEnabled = this.shared.config?.mobile?.buttons ?? true;
    if (!mobileEnabled) return;
    const size = 96;
    const spacing = 16;
    const bottom = this.scale.height - spacing - size / 2;

    const makePad = (x, y, label, onPress) => {
      const pad = this.add.rectangle(x, y, size, size, 0x2E86AB, 0.85)
        .setStrokeStyle(4, 0x000000, 0.35)
        .setScrollFactor(0)
        .setDepth(140)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, {
        fontSize: 28,
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(141);
      pad.on('pointerdown', () => onPress(true));
      pad.on('pointerup', () => onPress(false));
      pad.on('pointerout', () => onPress(false));
      return { pad, text };
    };

    const leftX = spacing + size / 2;
    const rightX = leftX + size + spacing;
    const rightSideStart = this.scale.width - spacing - size / 2;
    const brakeX = rightSideStart;
    const nitroX = brakeX - size - spacing;

    makePad(leftX, bottom, '⟵', state => {
      this.mobileState.left = state;
      this.mobileState.reverse = state;
      this.pushMobileState();
    });
    makePad(rightX, bottom, '⟶', state => {
      this.mobileState.right = state;
      this.mobileState.throttle = state;
      this.pushMobileState();
    });
    makePad(brakeX, bottom, '⛔', state => {
      this.mobileState.brake = state;
      this.pushMobileState();
    });
    makePad(nitroX, bottom, '⚡', state => {
      this.mobileState.nitro = state;
      this.pushMobileState();
    });
  }

  pushMobileState() {
    this.eventsBus.emit(EVENT_MOBILE_INPUT, { ...this.mobileState });
  }

  createButton(x, y, key, handler) {
    const button = this.add.text(x, y, '', {
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2E86AB',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    button.on('pointerdown', handler);
    button.setData('key', key);
    return button;
  }

  createToggle(x, y, key, initial, handler) {
    const container = this.add.container(x, y).setScrollFactor(0);
    const bg = this.add.rectangle(0, 0, 210, 54, 0x2E86AB, 0.9)
      .setStrokeStyle(4, 0x000000, 0.35)
      .setScrollFactor(0);
    const text = this.add.text(0, 0, '', {
      fontSize: 22,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);
    container.add([bg, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-105, -27, 210, 54), Phaser.Geom.Rectangle.Contains);
    const toggleState = { value: initial };
    container.on('pointerdown', () => {
      toggleState.value = !toggleState.value;
      handler(toggleState.value);
      this.updateToggleLabel(text, toggleState.value);
    });
    container.getData = () => toggleState.value;
    container.setDataEnabled();
    container.data.set('key', key);
    this.updateToggleLabel(text, initial);
    return { container, text, state: toggleState };
  }

  updateToggleLabel(text, enabled) {
    text.setText(this.translate(enabled ? 'ui.unmute' : 'ui.mute'));
  }

  handleReady = () => {
    this.startOverlay.setVisible(true);
  };

  updateHud = hud => {
    if (!hud) return;
    this.state.score = hud.score ?? this.state.score;
    this.state.combo = hud.combo ?? this.state.combo;
    this.state.speed = hud.speed ?? this.state.speed;
    this.state.nitro = hud.nitro ?? this.state.nitro;
    this.state.kettle = hud.kettle ?? this.state.kettle;
    this.refreshHud();
  };

  updateStatus = status => {
    if (!status) return;
    this.state.paused = status.paused;
    if (status.paused) {
      this.pauseOverlay.setVisible(true);
    } else {
      this.pauseOverlay.setVisible(false);
    }
  };

  showToast = payload => {
    const message = payload?.text || this.translate(payload?.key);
    if (!message) return;
    this.toastQueue.push(message);
    if (!this.toastTween || !this.toastTween.isPlaying()) {
      this.displayNextToast();
    }
  };

  displayNextToast() {
    if (this.toastQueue.length === 0) return;
    const message = this.toastQueue.shift();
    this.toastText.setText(message);
    this.toastText.setAlpha(0);
    this.toastText.setVisible(true);
    this.toastTween = this.tweens.timeline({
      tweens: [
        { targets: this.toastText, alpha: 1, duration: 250 },
        { targets: this.toastText, alpha: 1, duration: 1500 },
        {
          targets: this.toastText,
          alpha: 0,
          duration: 350,
          onComplete: () => {
            this.toastText.setVisible(false);
            this.displayNextToast();
          }
        }
      ]
    });
  }

  showFinish = payload => {
    this.finishOverlay.setVisible(true);
    this.finishTitle.setText(this.translate('finish.text'));
    this.finishScore.setText(`${this.translate('hud.score')}: ${payload?.score ?? 0}`);
    this.finishRank.setText(this.translate('finish.rank').replace('{rank}', payload?.rank ?? 'C'));
  };

  onSandstormState = data => {
    if (data?.active) {
      this.stormBadge.setVisible(true);
      this.stormBadge.setText(this.translate('toast.sandstorm'));
    } else {
      this.stormBadge.setText(this.translate('toast.stormClear'));
      this.time.delayedCall(1200, () => this.stormBadge.setVisible(false));
    }
  };

  refreshHud() {
    const speedLabel = `${Math.round(this.state.speed || 0)} km/h`;
    this.speedText.setText(speedLabel);
    this.scoreText.setText(`${this.translate('hud.score')}: ${this.state.score}`);
    this.comboText.setText(`${this.translate('hud.combo')} ${this.state.combo}`);
    const nitro = this.state.nitro;
    const progress = nitro.active
      ? Phaser.Math.Clamp(nitro.timer / (nitro.duration || 1), 0, 1)
      : 1 - Phaser.Math.Clamp(nitro.cooldown / (nitro.duration || 1), 0, 1);
    this.nitroBar.setScale(progress, 1);
    this.kettleIcon.setScale(0.35 + 0.05 * Phaser.Math.Clamp(this.state.kettle, 0, 1));
  }

  updateLanguage() {
    const startBtn = this.startOverlay.list.find(child => child.getData && child.getData('key') === 'menu.start');
    if (startBtn) startBtn.setText(this.translate('menu.start'));
    if (this.resumeButton) this.resumeButton.setText(this.translate('menu.resume'));
    if (this.restartButton) this.restartButton.setText(this.translate('menu.restart'));
    if (this.langButton) this.langButton.setText(this.translate('menu.language'));
    if (this.musicToggle) this.updateToggleLabel(this.musicToggle.text, this.musicToggle.state.value);
    if (this.sfxToggle) this.updateToggleLabel(this.sfxToggle.text, this.sfxToggle.state.value);
    this.refreshHud();
  }

  translate(key) {
    if (!key) return '';
    const map = this.cache.json.get(`i18n-${this.language}`) || {};
    return map[key] || key;
  }
}
