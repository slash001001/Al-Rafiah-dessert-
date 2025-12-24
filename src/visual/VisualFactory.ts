import Phaser from 'phaser';

const lerpColor = (c1: Phaser.Display.Color, c2: Phaser.Display.Color, t: number) =>
  Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 100, t * 100);

const colorObj = (c: { r: number; g: number; b: number }) =>
  Phaser.Display.Color.GetColor(c.r, c.g, c.b);

const destroyG = (g: Phaser.GameObjects.Graphics) => {
  g.clear();
  g.destroy();
};

export const VisualFactory = {
  ensureAll(scene: Phaser.Scene) {
    this.createSky(scene);
    this.createDunes(scene);
    this.createRoad(scene);
    this.createPOIs(scene);
    this.createCars(scene);
    this.createHUD(scene);
    this.createBits(scene);
  },

  createSky(scene: Phaser.Scene) {
    if (scene.textures.exists('sky')) return;
    const g = scene.add.graphics();
    const top = Phaser.Display.Color.ValueToColor(0x0b1f3f);
    const mid = Phaser.Display.Color.ValueToColor(0x274872);
    const bot = Phaser.Display.Color.ValueToColor(0xf2a65a);
    const h = 256;
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const midBlend = lerpColor(top, mid, t);
      const botBlend = lerpColor(mid, bot, t);
      const c = i < h * 0.55 ? midBlend : botBlend;
      g.fillStyle(colorObj({ r: c.r, g: c.g, b: c.b }), 1);
      g.fillRect(0, i, 32, 1);
    }
    g.generateTexture('sky', 32, h);
    destroyG(g);
  },

  createDunes(scene: Phaser.Scene) {
    const makeDune = (key: string, color: number, amp: number) => {
      if (scene.textures.exists(key)) return;
      const g = scene.add.graphics({ fillStyle: { color, alpha: 1 } });
      const w = 512;
      const h = 220;
      g.beginPath();
      g.moveTo(0, h);
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const y = h - 40 - Math.sin(i * 0.9) * amp - Math.cos(i * 1.6) * amp * 0.5;
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.closePath();
      g.fillPath();
      g.generateTexture(key, w, h);
      destroyG(g);
    };
    makeDune('dune-3', 0xc68f5f, 12);
    makeDune('dune-2', 0xd8a46f, 22);
    makeDune('dune-1', 0xe7b879, 32);
  },

  createRoad(scene: Phaser.Scene) {
    if (scene.textures.exists('road')) return;
    const g = scene.add.graphics();
    const w = 512;
    const h = 160;
    g.fillStyle(0x1f2937, 1);
    g.fillRect(0, h - 110, w, 110);
    g.fillStyle(0x111827, 1);
    g.fillRect(0, h - 130, w, 20);
    g.fillStyle(0xfefefe, 0.9);
    for (let x = 12; x < w; x += 44) {
      g.fillRect(x, h - 75, 24, 6);
    }
    g.generateTexture('road', w, h);
    destroyG(g);
  },

  createPOIs(scene: Phaser.Scene) {
    const makeCard = (key: string, body: number, accent: number, icon: (g: Phaser.GameObjects.Graphics) => void) => {
      if (scene.textures.exists(key)) return;
      const g = scene.add.graphics();
      g.fillStyle(body, 1);
      g.fillRoundedRect(0, 0, 140, 90, 12);
      g.lineStyle(3, accent, 1);
      g.strokeRoundedRect(0, 0, 140, 90, 12);
      icon(g);
      g.generateTexture(key, 140, 90);
      destroyG(g);
    };
    makeCard('poi-gas', 0x12395b, 0x4ade80, (g) => {
      g.fillStyle(0x4ade80);
      g.fillRect(32, 26, 24, 40);
      g.fillRect(56, 26, 16, 18);
      g.fillRect(70, 26, 8, 10);
      g.fillRect(78, 30, 10, 26);
      g.fillRect(88, 52, 8, 14);
    });
    makeCard('poi-food', 0x6b2c2c, 0xfcd34d, (g) => {
      g.fillStyle(0xfcd34d);
      g.fillRect(36, 24, 12, 44);
      g.fillRect(54, 24, 12, 44);
      g.fillCircle(88, 48, 16);
    });
    makeCard('poi-shop', 0x1f2937, 0x60a5fa, (g) => {
      g.fillStyle(0x60a5fa);
      g.fillRect(30, 30, 80, 36);
      g.fillStyle(0x93c5fd);
      g.fillRect(46, 40, 22, 18);
      g.fillRect(78, 40, 22, 18);
    });
  },

  createCars(scene: Phaser.Scene) {
    const makeCar = (key: string, body: number, accent: number) => {
      if (scene.textures.exists(key)) return;
      const g = scene.add.graphics();
      const w = 110;
      const h = 58;
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(w / 2, h - 6, 84, 16);
      g.fillStyle(body, 1);
      g.fillRoundedRect(8, 8, 94, 42, 10);
      g.fillStyle(accent, 0.9);
      g.fillRoundedRect(18, 14, 74, 18, 8);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(16, h - 14, 18, 8);
      g.fillRect(w - 34, h - 14, 18, 8);
      g.fillStyle(0xf8fafc);
      g.fillRect(30, 18, 20, 12);
      g.fillRect(60, 18, 20, 12);
      g.generateTexture(key, w, h);
      destroyG(g);
    };
    makeCar('car-gmc', 0x0f172a, 0x1f2937);
    makeCar('car-prado', 0x8b5e34, 0xa86f3e);
  },

  createHUD(scene: Phaser.Scene) {
    if (!scene.textures.exists('hud-panel')) {
      const g = scene.add.graphics();
      g.fillStyle(0x0f172a, 0.72);
      g.fillRoundedRect(0, 0, 260, 120, 12);
      g.lineStyle(2, 0xfcd34d, 0.9);
      g.strokeRoundedRect(0, 0, 260, 120, 12);
      g.generateTexture('hud-panel', 260, 120);
      destroyG(g);
    }
    const icon = (key: string, color: number, shape: 'circle' | 'square') => {
      if (scene.textures.exists(key)) return;
      const g = scene.add.graphics();
      g.fillStyle(color, 1);
      if (shape === 'circle') g.fillCircle(10, 10, 8);
      else g.fillRoundedRect(2, 2, 16, 16, 4);
      g.generateTexture(key, 20, 20);
      destroyG(g);
    };
    icon('icon-salt', 0xf8fafc, 'square');
    icon('icon-water', 0x60a5fa, 'circle');
    icon('icon-charcoal', 0x111827, 'square');
    icon('icon-lighter', 0xf97316, 'circle');
    icon('icon-hummus', 0xfcd34d, 'circle');
    if (!scene.textures.exists('minimap')) {
      const g = scene.add.graphics();
      g.fillStyle(0x0f172a, 0.75);
      g.fillRoundedRect(0, 0, 220, 120, 10);
      g.lineStyle(2, 0x38bdf8, 0.8);
      g.strokeRoundedRect(0, 0, 220, 120, 10);
      g.generateTexture('minimap', 220, 120);
      destroyG(g);
    }
  },

  createBits(scene: Phaser.Scene) {
    if (!scene.textures.exists('rock')) {
      const g = scene.add.graphics();
      g.fillStyle(0x8c6239);
      g.fillCircle(14, 14, 14);
      g.fillStyle(0x5c3b21);
      g.fillCircle(12, 10, 10);
      g.generateTexture('rock', 28, 28);
      destroyG(g);
    }
    if (!scene.textures.exists('puff')) {
      const g = scene.add.graphics();
      g.fillStyle(0xfcdba5, 0.8);
      g.fillCircle(10, 10, 10);
      g.generateTexture('puff', 20, 20);
      destroyG(g);
    }
    if (!scene.textures.exists('finish')) {
      const g = scene.add.graphics();
      g.fillStyle(0x4ade80);
      g.fillRoundedRect(0, 0, 160, 48, 10);
      g.lineStyle(3, 0xffffff);
      g.strokeRoundedRect(0, 0, 160, 48, 10);
      g.generateTexture('finish', 160, 48);
      destroyG(g);
    }
  }
};
