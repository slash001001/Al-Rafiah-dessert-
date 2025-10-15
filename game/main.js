/*
 * Taees Desert Adventure - Phaser 3 implementation
 * Reimagined Angry Birds meets Hill Climb Racing aesthetic with Saudi dunes flair.
 */

const MODULE_BASE_URL = new URL('.', import.meta.url);
const CONFIG_URL = new URL('./config.json', MODULE_BASE_URL).href;
const ASSET_BASE_URL = new URL('./assets/', MODULE_BASE_URL).href;

const COLORS = {
  sand: 0xF4C27A,
  dunes: 0xD85F1A,
  sky: 0xF8E9D2,
  rocks: 0x5E3116,
  accent: 0x2E86AB,
  ui: 0x2277A9,
};

const COPY = {
  ar: {
    title: 'طعيس – مغامرة الطعوس',
    subtitle: 'قيادة صحراوية مستوحاة من طعوس السعودية',
    start: 'ابدأ الطعيس',
    levelSelect: 'اختر المنطقة',
    resume: 'استمرار',
    restart: 'إعادة',
    paused: 'اللعبة متوقفة',
    speed: 'السرعة',
    coins: 'الذهب',
    checkpoint: 'تسجيل الوصول',
    finish: 'أحسنت! أنهيت الطلعة',
    loading: 'جاري تحميل الرمال...',
    boostReady: 'النيترو جاهز',
    boostUsed: 'نيترو!',
    language: 'English',
  },
  en: {
    title: 'Taees – Desert Adventure',
    subtitle: 'Saudi dune driving with Angry Birds charm',
    start: 'Start Driving',
    levelSelect: 'Choose Region',
    resume: 'Resume',
    restart: 'Restart',
    paused: 'Game Paused',
    speed: 'Speed',
    coins: 'Coins',
    checkpoint: 'Checkpoint',
    finish: 'Great! Stage cleared',
    loading: 'Loading dunes...',
    boostReady: 'Boost Ready',
    boostUsed: 'Boost!',
    language: 'العربية',
  },
};

const UI_DEPTH = {
  background: 10,
  middleground: 20,
  foreground: 40,
  hud: 80,
  overlay: 100,
};

const CAR_CONSTANTS = {
  wheelRadius: 34,
  suspension: 50,
  stiffness: 0.45,
  damping: 0.3,
  driveForce: 0.00035,
  airControlTorque: 0.00012,
  boostForce: 0.0007,
  maxAngularVelocity: 8,
};

const MatterAlias = Phaser.Physics.Matter.Matter;
const { Bodies, Body, Constraint, Composite, Vertices } = MatterAlias;

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2, COPY.ar.loading, {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 28,
      color: '#5E3116',
    }).setOrigin(0.5);
    const onLanguage = lang => loadingText.setText(COPY[lang].loading);
    this.game.events.on('language-changed', onLanguage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('language-changed', onLanguage);
    });
    this.load.json('level-data', CONFIG_URL);
  }

  create() {
    const config = this.cache.json.get('level-data');
    this.registry.set('level-config', config);
    const savedLang = window.localStorage.getItem('taees-lang') || 'ar';
    this.registry.set('lang', savedLang === 'ar' ? 'ar' : 'en');
    document.documentElement.lang = this.registry.get('lang');
    this.game.events.emit('language-changed', this.registry.get('lang'));
    this.scene.launch('PreloadScene');
    this.scene.stop();
  }
}

class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    this.load.setPath(ASSET_BASE_URL);
    const progress = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0xffffff, 0.25);
    progressBox.fillRoundedRect(this.scale.width / 2 - 160, this.scale.height / 2 - 18, 320, 36, 18);

    const loadingLabel = this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, COPY.ar.loading, {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 24,
      color: '#5E3116',
    }).setOrigin(0.5);
    const onLanguage = lang => loadingLabel.setText(COPY[lang].loading);
    this.game.events.on('language-changed', onLanguage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('language-changed', onLanguage);
    });

    this.load.on('progress', value => {
      progress.clear();
      progress.fillStyle(COLORS.accent, 1);
      progress.fillRoundedRect(this.scale.width / 2 - 150, this.scale.height / 2 - 12, 300 * value, 24, 12);
    });

    this.load.svg('car-body', 'cars/hilux-body.svg', { scale: 0.5 });
    this.load.svg('wheel', 'cars/wheel.svg', { scale: 0.5 });
    this.load.svg('hilux', 'cars/hilux.svg', { scale: 0.55 });
    this.load.svg('palm', 'terrain/palm.svg', { scale: 0.35 });
    this.load.svg('cactus', 'terrain/cactus.svg', { scale: 0.28 });
    this.load.svg('camel', 'terrain/camel.svg', { scale: 0.35 });
    this.load.svg('sign', 'terrain/sign.svg', { scale: 0.4 });
    this.load.svg('barrel', 'terrain/barrel.svg', { scale: 0.3 });
    this.load.svg('dune', 'terrain/dune.svg', { scale: 0.4 });
    this.load.svg('button', 'ui/button.svg', { scale: 0.5 });
    this.load.svg('coin', 'ui/coin.svg', { scale: 0.4 });
    this.load.svg('icon-dammam', 'ui/city-dammam.svg', { scale: 0.5 });
    this.load.svg('icon-alula', 'ui/city-alula.svg', { scale: 0.5 });
    this.load.svg('icon-thumamah', 'ui/city-thumamah.svg', { scale: 0.5 });

    // Audio placeholders (procedural fallback if files empty)
    this.load.audio('bgm', ['sounds/bg-oud-loop.wav']);
    this.load.audio('sfx-engine', ['sounds/engine-soft.wav']);
    this.load.audio('sfx-skid', ['sounds/tire-skid.wav']);
    this.load.audio('sfx-coin', ['sounds/coin.wav']);
    this.load.audio('sfx-win', ['sounds/win-cheer.wav']);
  }

  create() {
    this.createGeneratedTextures();
    this.scene.start('MenuScene');
  }

  createGeneratedTextures() {
    // Dust texture
    const dustGfx = this.add.graphics();
    dustGfx.fillStyle(0xffffff, 1);
    dustGfx.fillCircle(16, 16, 16);
    dustGfx.generateTexture('dust', 32, 32);
    dustGfx.destroy();

    // Sky gradient texture
    const skyCanvas = this.textures.createCanvas('sky-gradient', 512, 512);
    const ctx = skyCanvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#F8E9D2');
    gradient.addColorStop(0.6, '#F4C27A');
    gradient.addColorStop(1, '#D85F1A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    skyCanvas.refresh();

    const duneCanvas = this.textures.createCanvas('dune-pattern', 512, 256);
    const dCtx = duneCanvas.getContext();
    dCtx.fillStyle = '#F4C27A';
    dCtx.fillRect(0, 0, 512, 256);
    dCtx.fillStyle = '#D85F1A';
    for (let i = 0; i < 6; i++) {
      const peak = Math.random() * 80 + 40;
      dCtx.beginPath();
      dCtx.moveTo(i * 80, 220);
      dCtx.quadraticCurveTo(i * 80 + 40, 220 - peak, i * 80 + 80, 220);
      dCtx.lineTo(i * 80 + 80, 256);
      dCtx.lineTo(i * 80, 256);
      dCtx.closePath();
      dCtx.fill();
    }
    duneCanvas.refresh();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.scene.launch('BackgroundScene');
    this.createLayout();
  }

  createLayout() {
    const lang = this.registry.get('lang');
    const copy = COPY[lang];
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.title = this.add.text(centerX, centerY - 160, copy.title, {
      fontFamily: 'Tajawal, "Baloo Bhaijaan 2", sans-serif',
      fontSize: 52,
      fontStyle: '700',
      align: 'center',
      color: '#5E3116',
    }).setOrigin(0.5).setDepth(UI_DEPTH.foreground);

    this.subtitle = this.add.text(centerX, centerY - 90, copy.subtitle, {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 24,
      color: '#8C5A2A',
    }).setOrigin(0.5).setDepth(UI_DEPTH.foreground);

    const startButton = this.createButton(centerX, centerY + 20, copy.start, () => {
      this.scene.stop('BackgroundScene');
      this.scene.start('LevelSelectScene');
    });

    const languageButton = this.createButton(centerX, startButton.y + 90, copy.language, () => {
      const current = this.registry.get('lang');
      const next = current === 'ar' ? 'en' : 'ar';
      this.registry.set('lang', next);
      window.localStorage.setItem('taees-lang', next);
      document.documentElement.lang = next;
      this.refreshLanguage();
      this.game.events.emit('language-changed', next);
    }).setScale(0.8);

    this.startButton = startButton;
    this.languageButton = languageButton;

    this.game.events.on('language-changed', this.refreshLanguage, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('language-changed', this.refreshLanguage, this);
    });
  }

  refreshLanguage() {
    const lang = this.registry.get('lang');
    const copy = COPY[lang];
    this.title.setText(copy.title);
    this.subtitle.setText(copy.subtitle);
    this.startButton.getData('label').setText(copy.start);
    this.languageButton.getData('label').setText(copy.language);
  }

  createButton(x, y, labelText, callback) {
    const container = this.add.container(x, y).setDepth(UI_DEPTH.foreground);
    const button = this.add.image(0, 0, 'button').setInteractive({ useHandCursor: true });
    button.setTint(0xffffff);
    const label = this.add.text(0, 0, labelText, {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 28,
      color: '#ffffff',
    }).setOrigin(0.5);

    button.on('pointerdown', () => {
      this.sound.play('sfx-engine', { volume: 0.05, detune: -300 });
      container.setScale(0.96);
    });
    button.on('pointerup', () => {
      container.setScale(1);
      callback();
    });
    button.on('pointerout', () => container.setScale(1));

    container.add([button, label]);
    container.setData('label', label);
    return container;
  }
}

class BackgroundScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BackgroundScene' });
  }

  create() {
    this.createParallaxBackground();
  }

  createParallaxBackground() {
    const { width, height } = this.scale;
    const sky = this.add.image(0, 0, 'sky-gradient').setOrigin(0, 0).setDisplaySize(width, height).setDepth(UI_DEPTH.background);

    const sun = this.add.circle(width * 0.8, height * 0.25, Math.min(width, height) * 0.12, 0xFFF4D4, 0.9);
    sun.setDepth(UI_DEPTH.background + 1);

    this.hills = this.add.tileSprite(0, height * 0.7, width * 1.5, height * 0.4, 'dune-pattern')
      .setOrigin(0, 0.5)
      .setAlpha(0.65)
      .setDepth(UI_DEPTH.background + 2);

    this.foreground = this.add.tileSprite(0, height * 0.85, width * 1.5, height * 0.5, 'dune-pattern')
      .setOrigin(0, 0.5)
      .setAlpha(0.9)
      .setDepth(UI_DEPTH.background + 3);

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.hills.tilePositionX += 0.15;
        this.foreground.tilePositionX += 0.3;
      },
    });
  }
}

class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create() {
    this.scene.launch('BackgroundScene');
    this.createUI();
  }

  createUI() {
    const config = this.registry.get('level-config');
    const lang = this.registry.get('lang');
    const copy = COPY[lang];
    const centerX = this.scale.width / 2;

    const title = this.add.text(centerX, 120, copy.levelSelect, {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 40,
      color: '#5E3116',
    }).setOrigin(0.5).setDepth(UI_DEPTH.foreground);

    const spacing = 240;
    const startX = centerX - spacing;
    config.levels.forEach((level, index) => {
      const iconKey = level.uiIconKey || `icon-${level.id}`;
      const container = this.add.container(startX + index * spacing, this.scale.height * 0.55).setDepth(UI_DEPTH.foreground);
      const button = this.add.image(0, 0, iconKey).setInteractive({ useHandCursor: true });
      button.setDisplaySize(140, 140);
      button.on('pointerup', () => {
        this.scene.stop('BackgroundScene');
        this.scene.start('GameScene', { levelId: level.id });
      });
      const text = this.add.text(0, 110, `${level.nameAr} / ${level.nameEn}`, {
        fontFamily: 'Tajawal, sans-serif',
        fontSize: 22,
        color: '#5E3116',
        align: 'center',
      }).setOrigin(0.5);
      container.add([button, text]);
    });

    const refresh = () => {
      const lang = this.registry.get('lang');
      title.setText(COPY[lang].levelSelect);
    };
    this.game.events.on('language-changed', refresh);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('language-changed', refresh);
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.touchPointers = new Map();
  }

  init(data) {
    this.levelId = data.levelId;
  }

  create() {
    const config = this.registry.get('level-config');
    this.level = config.levels.find(l => l.id === this.levelId) || config.levels[0];

    this.scene.launch('UIScene');

    this.createBackground();
    this.createTerrain();
    this.createDecor();
    this.createVehicle();
    this.createCollectibles();
    this.createParticles();
    this.createTouchControls();
    this.setupInput();

    this.coinCount = 0;
    this.score = 0;
    this.totalDistance = 0;
    this.lastX = this.chassis.body.position.x;
    this.boostEnergy = 1;
    this.boostState = { active: false };
    this.isPaused = false;
    try {
      this.engineSfx = this.sound.add('sfx-engine', { volume: 0.45 });
    } catch (err) {
      this.engineSfx = null;
    }

    this.setupCamera();
    this.setupCollisions();

    this.playAmbientAudio();

    this.events.emit('level-start', {
      nameAr: this.level.nameAr,
      nameEn: this.level.nameEn,
      difficulty: this.level.difficulty,
    });
  }

  createBackground() {
    const { width, height } = this.scale;
    this.bgSky = this.add.image(0, 0, 'sky-gradient').setOrigin(0, 0).setDisplaySize(width, height).setScrollFactor(0);
    this.bgSun = this.add.circle(width * 0.75, height * 0.2, Math.min(width, height) * 0.12, 0xFFF4D4, 0.85).setScrollFactor(0);
    this.bgMountains = this.add.tileSprite(0, height * 0.6, width * 2, height * 0.5, 'dune-pattern').setOrigin(0, 0.5).setScrollFactor(0.2);
    this.bgDunes = this.add.tileSprite(0, height * 0.8, width * 2, height * 0.6, 'dune-pattern').setOrigin(0, 0.5).setScrollFactor(0.4);
  }

  createTerrain() {
    const baseY = this.scale.height * 0.8;
    const points = this.level.terrain.map(point => ({ x: point[0], y: baseY - point[1] }));
    this.trackLength = points[points.length - 1].x + 400;

    // Draw terrain polygon for visuals
    const terrainGraphics = this.add.graphics();
    terrainGraphics.fillStyle(COLORS.sand, 1);
    terrainGraphics.beginPath();
    terrainGraphics.moveTo(points[0].x, baseY + 400);
    points.forEach(p => terrainGraphics.lineTo(p.x, p.y));
    terrainGraphics.lineTo(points[points.length - 1].x, baseY + 400);
    terrainGraphics.closePath();
    terrainGraphics.fillPath();
    terrainGraphics.setDepth(UI_DEPTH.middleground);

    terrainGraphics.lineStyle(12, COLORS.dunes, 0.4);
    terrainGraphics.beginPath();
    terrainGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      terrainGraphics.lineTo(points[i].x, points[i].y);
    }
    terrainGraphics.strokePath();

    this.terrainBodies = [];
    const baseLevel = baseY + 400;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const polygon = [
        { x: p1.x, y: p1.y },
        { x: p2.x, y: p2.y },
        { x: p2.x, y: baseLevel },
        { x: p1.x, y: baseLevel },
      ];
      const vertices = Vertices.create(polygon, Body.create({}));
      const body = Bodies.fromVertices(0, 0, vertices, {
        isStatic: true,
        friction: 0.9,
        frictionStatic: 0.5,
        label: 'terrain',
      }, true);
      Body.setPosition(body, { x: 0, y: 0 });
      this.matter.world.add(body);
      this.terrainBodies.push(body);
    }
  }

  createDecor() {
    if (!this.level.decor) return;
    const decorLayer = this.add.layer().setDepth(UI_DEPTH.foreground - 10);
    const addSprite = (key, item) => {
      const sprite = decorLayer.add(this.add.image(item.x, this.scale.height * 0.8 - item.y, key));
      sprite.setOrigin(0.5, 1);
      sprite.setScale(item.scale || 1);
      sprite.setAlpha(0.9);
    };
    (this.level.decor.palms || []).forEach(item => addSprite('palm', item));
    (this.level.decor.cacti || []).forEach(item => addSprite('cactus', item));
    (this.level.decor.camels || []).forEach(item => addSprite('camel', item));
    (this.level.decor.signs || []).forEach(item => addSprite('sign', item));
    (this.level.decor.barrels || []).forEach(item => addSprite('barrel', item));
  }

  createVehicle() {
    const start = this.level.start || { x: 200, y: this.scale.height * 0.4 };
    const group = this.matter.world.nextGroup(true);
    const wheelOffset = this.level.vehicle?.wheelOffset || 90;

    this.chassis = this.matter.add.image(start.x, start.y, 'car-body', null, {
      label: 'chassis',
      chamfer: { radius: 24 },
    });
    this.chassis.setCollisionGroup(group);
    this.chassis.setMass(28);
    this.chassis.setFrictionAir(0.03);
    this.chassis.setFixedRotation(false);

    this.rearWheel = this.createWheel(start.x - wheelOffset, start.y + 60, group);
    this.frontWheel = this.createWheel(start.x + wheelOffset, start.y + 60, group);

    const constraintOptions = {
      stiffness: CAR_CONSTANTS.stiffness,
      damping: CAR_CONSTANTS.damping,
      render: { visible: false },
    };

    this.suspensionRear = this.matter.add.constraint(this.chassis.body, this.rearWheel.body, CAR_CONSTANTS.suspension, constraintOptions);
    this.suspensionFront = this.matter.add.constraint(this.chassis.body, this.frontWheel.body, CAR_CONSTANTS.suspension, constraintOptions);

    this.vehicleComposite = Composite.create({ label: 'vehicle' });
    Composite.add(this.vehicleComposite, [this.chassis.body, this.rearWheel.body, this.frontWheel.body, this.suspensionRear, this.suspensionFront]);

    this.carVisual = this.add.image(0, 0, 'hilux');
    this.carContainer = this.add.container(0, 0, [this.carVisual])
      .setDepth(UI_DEPTH.foreground)
      .setSize(220, 120);
    this.carContainer.setData('offsetY', -60);
    this.carContainer.setData('offsetX', 0);

    this.wheelSprites = [
      this.add.image(0, 0, 'wheel').setDepth(UI_DEPTH.foreground - 1),
      this.add.image(0, 0, 'wheel').setDepth(UI_DEPTH.foreground - 1),
    ];
  }

  createWheel(x, y, group) {
    const wheel = this.matter.add.image(x, y, 'wheel', null, {
      label: 'wheel',
      circleRadius: CAR_CONSTANTS.wheelRadius,
      friction: 0.85,
      frictionStatic: 1,
    });
    wheel.setCollisionGroup(group);
    wheel.setMass(6);
    return wheel;
  }

  createParticles() {
    this.dust = this.add.particles('dust');
    this.dustEmitter = this.dust.createEmitter({
      lifespan: { min: 300, max: 800 },
      quantity: 0,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: [0xE7AF59, 0xF2C97A],
      gravityY: -60,
      rotate: { min: 0, max: 360 },
    });
  }

  createCollectibles() {
    this.coinGroup = this.add.group();
    this.coinBodies = [];
    const coins = this.level.coins || [];
    coins.forEach((coin, index) => {
      const sprite = this.add.image(coin.x, this.scale.height * 0.8 - coin.y, 'coin').setScale(0.6).setDepth(UI_DEPTH.foreground - 5);
      sprite.setData('id', `coin-${index}`);
      this.coinGroup.add(sprite);
      const body = Bodies.circle(coin.x, this.scale.height * 0.8 - coin.y, 28, {
        isSensor: true,
        isStatic: true,
        label: 'coin',
      });
      body.gameObject = sprite;
      this.matter.world.add(body);
      this.coinBodies.push(body);
    });

    this.checkpointGroup = [];
    (this.level.checkpoints || []).forEach((cp, index) => {
      const body = Bodies.rectangle(cp.x, this.scale.height * 0.8 - cp.y, 80, 140, {
        isSensor: true,
        isStatic: true,
        label: 'checkpoint',
      });
      body.checkpointData = cp;
      this.matter.world.add(body);
      this.checkpointGroup.push(body);
    });

    this.finishBody = Bodies.rectangle(this.trackLength - 120, this.scale.height * 0.4, 120, 300, {
      isSensor: true,
      isStatic: true,
      label: 'finish',
    });
    this.matter.world.add(this.finishBody);
  }

  createTouchControls() {
    const { width, height } = this.scale;
    const zoneConfig = [
      { key: 'reverse', x: width * 0.15, label: '⟲' },
      { key: 'accelerate', x: width * 0.85, label: '⟳' },
      { key: 'boost', x: width * 0.5, label: '⚡' },
    ];

    this.touchZones = {};
    zoneConfig.forEach(cfg => {
      const zone = this.add.zone(cfg.x, height - 110, width * 0.25, 200);
      zone.setInteractive({ draggable: false, useHandCursor: false });
      zone.on('pointerdown', pointer => this.handleTouch(cfg.key, true, pointer));
      zone.on('pointerup', pointer => this.handleTouch(cfg.key, false, pointer));
      zone.on('pointerout', pointer => this.handleTouch(cfg.key, false, pointer));
      zone.on('pointerupoutside', pointer => this.handleTouch(cfg.key, false, pointer));
      this.touchZones[cfg.key] = zone;

      const button = this.add.image(cfg.x, height - 110, 'button').setAlpha(0.45).setScale(0.5);
      const txt = this.add.text(cfg.x, height - 110, cfg.label, {
        fontFamily: 'Tajawal, sans-serif',
        fontSize: 36,
        color: '#ffffff',
      }).setOrigin(0.5);
      button.setDepth(UI_DEPTH.overlay - 10);
      txt.setDepth(UI_DEPTH.overlay - 10);
    });
  }

  handleTouch(action, state, pointer) {
    if (state) {
      this.touchPointers.set(pointer.id, action);
    } else {
      this.touchPointers.delete(pointer.id);
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,S,SPACE');

    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, this.trackLength + 400, this.scale.height * 1.2);
    this.cameras.main.startFollow(this.chassis, true, 0.08, 0.08, 0, 120);
  }

  setupCollisions() {
    this.matter.world.on('collisionstart', event => {
      event.pairs.forEach(pair => {
        const bodies = [pair.bodyA, pair.bodyB];
        bodies.forEach(body => {
          if (body.label === 'coin') {
            this.collectCoin(body);
          } else if (body.label === 'checkpoint') {
            this.hitCheckpoint(body);
          } else if (body.label === 'finish') {
            this.finishLevel();
          }
        });
      });
    });
  }

  collectCoin(body) {
    if (!body.gameObject || !body.gameObject.visible) return;
    body.gameObject.setVisible(false);
    this.coinCount += 1;
    this.score += 50;
    this.events.emit('coin-picked', this.coinCount);
    this.events.emit('score-updated', this.score);
    try {
      this.sound.play('sfx-coin', { volume: 0.35 });
    } catch (err) {
      this.pingSound(880, 0.12);
    }
  }

  hitCheckpoint(body) {
    if (body.checkpointData?.hit) return;
    body.checkpointData.hit = true;
    this.score += 120;
    this.events.emit('score-updated', this.score);
    const lang = this.registry.get('lang');
    this.events.emit('checkpoint-hit', {
      label: lang === 'ar' ? body.checkpointData.labelAr : body.checkpointData.labelEn,
    });
    try {
      this.sound.play('sfx-skid', { volume: 0.3 });
    } catch (err) {
      this.pingSound(440, 0.2);
    }
  }

  finishLevel() {
    if (this.finished) return;
    this.finished = true;
    this.score += 500;
    this.events.emit('score-updated', this.score);
    const lang = this.registry.get('lang');
    this.events.emit('level-finished', COPY[lang].finish);
    try {
      this.sound.play('sfx-win', { volume: 0.45 });
    } catch (err) {
      this.pingSound(660, 0.4);
    }
    this.time.delayedCall(2000, () => {
      this.scene.stop('UIScene');
      this.scene.start('LevelSelectScene');
    });
  }

  playAmbientAudio() {
    const bgm = this.sound.get('bgm');
    if (!bgm || !bgm.isPlaying) {
      try {
        this.sound.play('bgm', { volume: 0.2, loop: true });
      } catch (err) {
        this.createProceduralLoop();
      }
    }
  }

  createProceduralLoop() {
    const ctx = this.sound.context || new AudioContext();
    const duration = 2.8;
    const master = ctx.createGain();
    master.gain.value = 0.2;
    master.connect(ctx.destination);
    const freqs = [220, 246, 196, 174];
    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      const start = ctx.currentTime + index * 0.6;
      gain.gain.linearRampToValueAtTime(0.05, start + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + duration);
    });
  }

  pingSound(freq, duration) {
    if (!this.sound.context) return;
    const ctx = this.sound.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.scene.pause();
      this.events.emit('paused', true);
    } else {
      this.scene.resume();
      this.events.emit('paused', false);
    }
  }

  update(time, delta) {
    if (this.finished || this.isPaused) return;
    const dt = delta / 1000;
    this.handleControls(dt);
    this.updateVehicleSprites();
    this.updateParticles();
    this.reportHUD();
  }

  handleControls(dt) {
    const pointerActions = Array.from(this.touchPointers.values());
    const accelerate = pointerActions.includes('accelerate') || this.cursors.right.isDown || this.keys.D.isDown;
    const reverse = pointerActions.includes('reverse') || this.cursors.left.isDown || this.keys.A.isDown;
    const tiltLeft = this.cursors.up.isDown || this.keys.W.isDown;
    const tiltRight = this.cursors.down.isDown || this.keys.S.isDown;
    const boost = pointerActions.includes('boost') || this.cursors.space?.isDown || this.keys.SPACE.isDown;

    const rear = this.rearWheel.body;
    const front = this.frontWheel.body;

    if (accelerate) {
      Body.applyForce(rear, rear.position, { x: CAR_CONSTANTS.driveForce, y: 0 });
      Body.applyForce(front, front.position, { x: CAR_CONSTANTS.driveForce * 0.8, y: 0 });
    }
    if (reverse) {
      Body.applyForce(rear, rear.position, { x: -CAR_CONSTANTS.driveForce * 0.7, y: 0 });
      Body.applyForce(front, front.position, { x: -CAR_CONSTANTS.driveForce * 0.5, y: 0 });
    }
    if (tiltLeft) {
      Body.setAngularVelocity(this.chassis.body, Phaser.Math.Clamp(this.chassis.body.angularVelocity - CAR_CONSTANTS.airControlTorque, -CAR_CONSTANTS.maxAngularVelocity, CAR_CONSTANTS.maxAngularVelocity));
    } else if (tiltRight) {
      Body.setAngularVelocity(this.chassis.body, Phaser.Math.Clamp(this.chassis.body.angularVelocity + CAR_CONSTANTS.airControlTorque, -CAR_CONSTANTS.maxAngularVelocity, CAR_CONSTANTS.maxAngularVelocity));
    }

    const boostActive = boost && this.boostEnergy > 0.05;
    if (boostActive) {
      Body.applyForce(this.chassis.body, this.chassis.body.position, { x: CAR_CONSTANTS.boostForce, y: -CAR_CONSTANTS.boostForce * 0.1 });
      this.boostEnergy = Math.max(0, this.boostEnergy - dt * 0.25);
      if (!this.boostState.active) {
        this.boostState.active = true;
        if (this.engineSfx) {
          this.engineSfx.stop();
          this.engineSfx.setDetune(200);
          this.engineSfx.play({ volume: 0.6 });
        } else {
          this.pingSound(520, 0.18);
        }
        this.events.emit('boost', { active: true, value: this.boostEnergy });
      }
    } else {
      if (this.boostState.active) {
        this.boostState.active = false;
        this.events.emit('boost', { active: false, value: this.boostEnergy });
      }
      this.boostEnergy = Math.min(1, this.boostEnergy + dt * 0.1);
    }

    const distanceDelta = Math.max(0, this.chassis.body.position.x - this.lastX);
    this.totalDistance += distanceDelta;
    this.score += distanceDelta * 0.02;
    this.lastX = this.chassis.body.position.x;
  }

  updateVehicleSprites() {
    this.carContainer.x = this.chassis.x;
    this.carContainer.y = this.chassis.y - 20;
    this.carContainer.rotation = this.chassis.rotation;

    this.wheelSprites[0].setPosition(this.rearWheel.x, this.rearWheel.y).setRotation(this.rearWheel.rotation);
    this.wheelSprites[1].setPosition(this.frontWheel.x, this.frontWheel.y).setRotation(this.frontWheel.rotation);
  }

  updateParticles() {
    const speed = Math.abs(this.rearWheel.body.angularVelocity);
    const shouldEmit = speed > 2;
    if (shouldEmit) {
      this.dustEmitter.setQuantity(4);
      this.dustEmitter.setPosition(this.rearWheel.x, this.rearWheel.y + 10);
      this.dustEmitter.explode(2);
    }
    this.bgMountains.tilePositionX = this.chassis.x * 0.08;
    this.bgDunes.tilePositionX = this.chassis.x * 0.16;
  }

  reportHUD() {
    const velocity = this.chassis.body.velocity;
    const speedKmh = Math.round(Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y) * 13.6);
    this.events.emit('hud-update', {
      speed: speedKmh,
      coins: this.coinCount,
      score: Math.floor(this.score),
      boost: this.boostEnergy,
    });
  }
}

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.gameScene = this.scene.get('GameScene');
    this.initUI();
    this.registerEvents();
  }

  initUI() {
    this.hudContainer = this.add.container(32, 32).setDepth(UI_DEPTH.hud);
    this.hudBg = this.add.rectangle(0, 0, 260, 108, 0x000000, 0.25).setOrigin(0);
    this.scoreText = this.add.text(24, 18, '', this.textStyle(26));
    this.speedText = this.add.text(24, 54, '', this.textStyle(24));
    this.boostText = this.add.text(24, 90, '', this.textStyle(20));
    this.hudContainer.add([this.hudBg, this.scoreText, this.speedText, this.boostText]);

    this.toast = this.add.text(this.scale.width / 2, 120, '', {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 28,
      color: '#ffffff',
      backgroundColor: 'rgba(34,119,169,0.8)',
      padding: { x: 18, y: 12 },
    }).setDepth(UI_DEPTH.overlay).setOrigin(0.5).setAlpha(0);

    this.pauseButton = this.add.image(this.scale.width - 80, 80, 'button')
      .setDepth(UI_DEPTH.overlay)
      .setScale(0.35)
      .setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerup', () => this.togglePause());
    this.pauseLabel = this.add.text(this.scale.width - 80, 80, 'II', this.textStyle(24)).setOrigin(0.5).setDepth(UI_DEPTH.overlay + 1);

    this.pauseOverlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.45)
      .setDepth(UI_DEPTH.overlay)
      .setVisible(false);
    this.pauseTitle = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, '', {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 36,
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(UI_DEPTH.overlay + 1).setVisible(false);

    this.resumeBtn = this.createOverlayButton(this.scale.width / 2 - 120, this.scale.height / 2 + 30, () => this.togglePause());
    this.restartBtn = this.createOverlayButton(this.scale.width / 2 + 120, this.scale.height / 2 + 30, () => {
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('GameScene', { levelId: this.gameScene.levelId });
    });
    this.refreshLanguage();
  }

  createOverlayButton(x, y, click) {
    const container = this.add.container(x, y).setDepth(UI_DEPTH.overlay + 1).setVisible(false);
    const icon = this.add.image(0, 0, 'button').setScale(0.4).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, '', this.textStyle(24)).setOrigin(0.5);
    icon.on('pointerup', click);
    container.add([icon, label]);
    container.setData('label', label);
    return container;
  }

  registerEvents() {
    this.game.events.on('language-changed', this.refreshLanguage, this);
    const gs = this.gameScene;
    gs.events.on('hud-update', data => this.updateHud(data));
    gs.events.on('coin-picked', () => this.showToast('+50 💰'));
    gs.events.on('checkpoint-hit', data => this.showToast(`${data.label}`));
    gs.events.on('level-finished', msg => this.showToast(msg, 2800));
    gs.events.on('boost', data => {
      const lang = this.registry.get('lang');
      if (data.active) this.showToast(COPY[lang].boostUsed, 500);
    });
    gs.events.on('paused', state => this.togglePause(state));
    this.game.events.on('resize', () => this.handleResize());
    this.input.keyboard.on('keydown-L', () => this.switchLanguage());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('language-changed', this.refreshLanguage, this);
    });
  }

  switchLanguage() {
    const current = this.registry.get('lang');
    const next = current === 'ar' ? 'en' : 'ar';
    this.registry.set('lang', next);
    window.localStorage.setItem('taees-lang', next);
    this.refreshLanguage();
    this.game.events.emit('language-changed', next);
  }

  handleResize() {
    this.scene.restart({ preserveDrawing: true });
  }

  togglePause(forceState) {
    const state = typeof forceState === 'boolean' ? forceState : !this.gameScene.isPaused;
    if (state && !this.gameScene.isPaused) {
      this.gameScene.togglePause();
    } else if (!state && this.gameScene.isPaused) {
      this.gameScene.togglePause();
    }
    const lang = this.registry.get('lang');
    this.pauseOverlay.setVisible(state);
    this.pauseTitle.setVisible(state);
    this.resumeBtn.setVisible(state);
    this.restartBtn.setVisible(state);
    if (state) {
      this.pauseTitle.setText(COPY[lang].paused);
      this.resumeBtn.getData('label').setText(COPY[lang].resume);
      this.restartBtn.getData('label').setText(COPY[lang].restart);
    }
  }

  updateHud({ score, speed, coins, boost }) {
    const lang = this.registry.get('lang');
    this.scoreText.setText(`${COPY[lang].coins}: ${coins}  |  ${Math.floor(score)} pts`);
    this.speedText.setText(`${COPY[lang].speed}: ${speed} km/h`);
    const boostLabel = boost > 0.95 ? COPY[lang].boostReady : `${Math.round(boost * 100)}% boost`;
    this.boostText.setText(boostLabel);
  }

  showToast(message, duration = 1000) {
    this.toast.setText(message);
    this.toast.setAlpha(1);
    this.tweens.add({
      targets: this.toast,
      alpha: 0,
      delay: duration,
      duration: 400,
      ease: 'Quad.easeIn',
    });
  }

  textStyle(size) {
    return {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: size,
      color: '#ffffff',
      stroke: '#5E3116',
      strokeThickness: 2,
    };
  }

  refreshLanguage() {
    const lang = this.registry.get('lang');
    this.pauseTitle?.setText(COPY[lang].paused);
    this.resumeBtn?.getData('label').setText(COPY[lang].resume);
    this.restartBtn?.getData('label').setText(COPY[lang].restart);
  }
}

const gameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: COLORS.sky,
  parent: 'game-container',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      enableSleeping: false,
      runner: { isFixed: false },
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  scene: [BootScene, PreloadScene, BackgroundScene, MenuScene, LevelSelectScene, GameScene, UIScene],
};

let phaserGame;

function bootGame() {
  if (phaserGame) return;
  phaserGame = new Phaser.Game(gameConfig);
  window.addEventListener('resize', () => {
    phaserGame.scale.resize(window.innerWidth, window.innerHeight);
    phaserGame.events.emit('resize');
  });
}

document.addEventListener('DOMContentLoaded', bootGame);
