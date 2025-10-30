const AUDIO_KEYS = [
  'engine_idle',
  'engine_rev',
  'nitro',
  'skid',
  'coin',
  'checkpoint',
  'kettle_spill',
  'dog_bark',
  'sandstorm',
  'sizzling',
  'cheer',
  'sheela_loop'
];

const LEVEL_JSON_SOURCES = [
  { key: 'level-rafiah-primary', path: './levels/level_rafiah.json' },
  { key: 'level-rafiah-fallback', path: './game/levels/level_rafiah.json' }
];

const createPathHelpers = (graphics) => {
  const pen = { x: 0, y: 0 };

  return {
    moveTo(x, y) {
      pen.x = x;
      pen.y = y;
      graphics.moveTo(x, y);
    },
    lineTo(x, y) {
      pen.x = x;
      pen.y = y;
      graphics.lineTo(x, y);
    },
    quadraticTo(controlX, controlY, x, y, segments = 24) {
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(pen.x, pen.y),
        new Phaser.Math.Vector2(controlX, controlY),
        new Phaser.Math.Vector2(x, y)
      );
      const points = curve.getPoints(Math.max(8, segments));
      for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
      }
      pen.x = x;
      pen.y = y;
    }
  };
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
    this.shared = window.RAFIAH_SHARED || null;
  }

  init() {
    this.shared = window.RAFIAH_SHARED || this.game.registry.get('shared') || {};
    console.log('▶️ PreloadScene init');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#F8E9D2');
    this.addProgressBar();
    console.log('▶️ PreloadScene preload started');
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, file => {
      console.warn('⚠️ Asset load error', file?.key, file?.src);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      console.log('✅ PreloadScene assets loaded');
    });

    LEVEL_JSON_SOURCES.forEach(({ key, path }) => {
      this.load.json(key, path);
    });

    AUDIO_KEYS.forEach(key => {
      this.load.audio(key, [`./assets/sfx/${key}.mp3`]);
    });

    this.load.spritesheet('car-gmc', './assets/sprites/chibi_gmc_8f.png', {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.spritesheet('car-prado', './assets/sprites/prado_chibi_8f.png', {
      frameWidth: 256,
      frameHeight: 256
    });

    this.generateProceduralTextures();

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      const { json } = this.cache;
      let promoted = false;
      for (const { key, path } of LEVEL_JSON_SOURCES) {
        if (json.exists(key)) {
          const data = json.get(key);
          json.add('level-rafiah', data);
          promoted = true;
          json.remove(key);
          console.log(`✅ Loaded level data from ${path}`);
          break;
        }
      }
      if (!promoted) {
        console.warn('⚠️ level_rafiah.json missing from ./levels/ and ./game/levels/. Scene will start with empty layout.');
        json.add('level-rafiah', { terrain: [], collectibles: [], hazards: [], checkpoints: [] });
      }

      this.cache.json.add('i18n-ar', this.shared?.i18n?.ar ?? {});
      this.cache.json.add('i18n-en', this.shared?.i18n?.en ?? {});
    });
  }

  create() {
    const levelData = this.cache.json.get('level-rafiah');
    this.game.registry.set('level-data', levelData);
    this.game.registry.set('config', this.shared?.config ?? {});
    this.game.registry.set('language', this.shared?.language ?? 'ar');

    this.createAnimations();
    console.log('✅ Preload complete → starting Level');
    window.dispatchEvent(new CustomEvent('rafiah-preload-complete'));

    this.scene.launch('LevelScene');
    this.scene.launch('UIScene');
    this.scene.stop();
  }

  addProgressBar() {
    const { width, height } = this.cameras.main;
    const bar = this.add.graphics();
    const box = this.add.graphics();
    const label = this.add.text(width / 2, height / 2 - 90, 'التحميل...', {
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      color: '#5E3116'
    }).setOrigin(0.5);

    box.fillStyle(0xffffff, 0.35);
    box.fillRoundedRect(width / 2 - 180, height / 2 - 20, 360, 40, 18);

    this.load.on(Phaser.Loader.Events.PROGRESS, value => {
      bar.clear();
      bar.fillStyle(0x2E86AB, 0.9);
      bar.fillRoundedRect(width / 2 - 170, height / 2 - 12, 340 * value, 24, 12);
    });

    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      label.destroy();
      bar.destroy();
      box.destroy();
    });
  }

  generateProceduralTextures() {
    this.createSkyTexture();
    this.createMountainTexture();
    this.createDuneTexture();
    this.createForegroundTexture();
    this.createPropTextures();
    this.createTokenTextures();
  }

  createSkyTexture() {
    const key = 'sky-gradient';
    if (this.textures.exists(key)) return;
    const rt = this.make.renderTexture({ width: 512, height: 512, add: false });
    const g = this.add.graphics();
    g.fillGradientStyle(0xF8E9D2, 0xF8E9D2, 0xFAD97C, 0xFAD97C, 1, 1, 1, 1);
    g.fillRect(0, 0, 512, 512);
    g.generateTexture(key, 512, 512);
    g.destroy();
    rt.destroy();
  }

  createMountainTexture() {
    const key = 'mountains-back';
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0xD27A42, 0.85);
    g.beginPath();
    g.moveTo(0, 256);
    g.lineTo(90, 200);
    g.lineTo(210, 236);
    g.lineTo(320, 180);
    g.lineTo(440, 230);
    g.lineTo(512, 210);
    g.lineTo(512, 256);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, 512, 256);
    g.destroy();
  }

  createDuneTexture() {
    const key = 'dunes-mid';
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0xE7C590, 1);
    const path = createPathHelpers(g);
    g.beginPath();
    path.moveTo(0, 256);
    path.lineTo(0, 180);
    path.quadraticTo(130, 140, 260, 200);
    path.quadraticTo(360, 240, 512, 180);
    path.lineTo(512, 256);
    g.closePath();
    g.fillPath();
    g.fillGradientStyle(0xA86B38, 0xA86B38, 0xF4C27A, 0xF4C27A, 0.45, 0.1, 0.25, 0.1);
    g.beginPath();
    path.moveTo(0, 220);
    path.lineTo(512, 180);
    path.lineTo(512, 256);
    path.lineTo(0, 256);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, 512, 256);
    g.destroy();
  }

  createForegroundTexture() {
    const key = 'foreground-details';
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0xA86B38, 0.9);
    for (let i = 0; i < 14; i += 1) {
      const x = 20 + i * 36;
      const h = 30 + ((i * 17) % 30);
      g.fillEllipse(x, 220 + ((i % 2) * 6), 40, h);
    }
    g.fillStyle(0x5E3116, 1);
    for (let i = 0; i < 8; i += 1) {
      const x = 50 + i * 60;
      g.fillRect(x, 210, 6, 46);
      g.fillEllipse(x + 3, 200, 40, 26);
    }
    g.generateTexture(key, 512, 256);
    g.destroy();
  }

  createPropTextures() {
    if (!this.textures.exists('sign-panel')) {
      const g = this.add.graphics();
      g.fillStyle(0x5E3116, 1);
      g.fillRect(46, 16, 12, 140);
      g.fillStyle(0x2E86AB, 1);
      g.lineStyle(6, 0x000000, 0.8);
      g.fillRoundedRect(0, 0, 110, 60, 12);
      g.strokeRoundedRect(0, 0, 110, 60, 12);
      g.generateTexture('sign-panel', 120, 160);
      g.destroy();
    }

    if (!this.textures.exists('checkpoint-flag')) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillRect(58, 10, 10, 140);
      g.fillStyle(0x006c35, 1);
      g.fillRect(68, 10, 70, 36);
      g.fillRect(68, 46, 70, 36);
      g.generateTexture('checkpoint-flag', 160, 160);
      g.destroy();
    }

    if (!this.textures.exists('camel-silhouette')) {
      const g = this.add.graphics();
      g.fillStyle(0x9a6a3c, 0.95);
      const path = createPathHelpers(g);
      g.beginPath();
      path.moveTo(20, 120);
      path.quadraticTo(60, 20, 120, 70);
      path.quadraticTo(160, 20, 200, 70);
      path.lineTo(240, 120);
      path.lineTo(220, 120);
      path.lineTo(210, 160);
      path.lineTo(190, 160);
      path.lineTo(180, 120);
      path.lineTo(120, 120);
      path.lineTo(112, 160);
      path.lineTo(88, 160);
      path.lineTo(82, 120);
      path.lineTo(20, 120);
      g.closePath();
      g.fillPath();
      g.generateTexture('camel-silhouette', 260, 200);
      g.destroy();
    }

    if (!this.textures.exists('dog-runner')) {
      const g = this.add.graphics();
      g.fillStyle(0x4f3a2b, 1);
      const path = createPathHelpers(g);
      g.beginPath();
      path.moveTo(10, 90);
      path.lineTo(150, 50);
      path.lineTo(158, 62);
      path.lineTo(136, 74);
      path.quadraticTo(50, 30, 120, 60);
      path.lineTo(100, 120);
      path.lineTo(90, 160);
      path.lineTo(70, 160);
      path.lineTo(68, 130);
      path.lineTo(40, 150);
      path.lineTo(30, 140);
      path.lineTo(44, 110);
      path.lineTo(10, 90);
      g.closePath();
      g.fillPath();
      g.generateTexture('dog-runner', 200, 200);
      g.destroy();
    }
  }

  createTokenTextures() {
    if (!this.textures.exists('coin-token')) {
      const g = this.add.graphics();
      g.fillStyle(0xF4C27A, 1);
      g.fillCircle(40, 40, 38);
      g.lineStyle(6, 0xA86B38, 1);
      g.strokeCircle(40, 40, 33);
      g.fillStyle(0xFAD97C, 1);
      g.fillCircle(40, 40, 22);
      g.generateTexture('coin-token', 80, 80);
      g.destroy();
    }

    if (!this.textures.exists('kettle-icon')) {
      const g = this.add.graphics();
      g.fillStyle(0x5E3116, 1);
      const path = createPathHelpers(g);
      g.beginPath();
      path.moveTo(20, 60);
      path.quadraticTo(40, 10, 70, 10, 20);
      path.quadraticTo(100, 10, 120, 60, 20);
      path.lineTo(120, 110);
      path.quadraticTo(70, 150, 20, 110, 20);
      g.closePath();
      g.fillPath();
      g.lineStyle(6, 0x000000, 0.7);
      g.strokePath();
      g.generateTexture('kettle-icon', 140, 160);
      g.destroy();
    }
  }

  createAnimations() {
    const anims = [
      { key: 'car_idle', start: 0, end: 0, frameRate: 6, repeat: -1 },
      { key: 'car_accel', start: 1, end: 1, frameRate: 12, repeat: -1 },
      { key: 'car_jump', start: 2, end: 2, frameRate: 6, repeat: -1 },
      { key: 'car_land', start: 3, end: 3, frameRate: 6, repeat: 0 },
      { key: 'car_drift', start: 4, end: 4, frameRate: 12, repeat: -1 },
      { key: 'car_brake', start: 5, end: 5, frameRate: 12, repeat: -1 },
      { key: 'car_bounce', start: 6, end: 6, frameRate: 12, repeat: -1 },
      { key: 'car_boost', start: 7, end: 7, frameRate: 12, repeat: -1 }
    ];

    ['car-gmc', 'car-prado'].forEach(texture => {
      anims.forEach(cfg => {
        const key = `${texture}-${cfg.key}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(texture, { start: cfg.start, end: cfg.end }),
            frameRate: cfg.frameRate,
            repeat: cfg.repeat
          });
        }
      });
    });
  }
}

export default PreloadScene;
