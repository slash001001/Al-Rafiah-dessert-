import Phaser from 'phaser';

const destroyG = (g: Phaser.GameObjects.Graphics) => {
  g.clear();
  g.destroy();
};

export const makeWorldTextures = (scene: Phaser.Scene) => {
  if (!scene.textures.exists('sky_grad')) {
    const g = scene.add.graphics();
    const w = 32;
    const h = 256;
    const top = Phaser.Display.Color.ValueToColor(0x0b1f3f);
    const bot = Phaser.Display.Color.ValueToColor(0xf5a25c);
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, h, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, i, w, 1);
    }
    g.generateTexture('sky_grad', w, h);
    destroyG(g);
  }

  const dune = (key: string, color: number, amp: number) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics({ fillStyle: { color } });
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
    g.closePath();
    g.fillPath();
    g.generateTexture(key, w, h);
    destroyG(g);
  };
  dune('dune_layer3', 0xc68f5f, 12);
  dune('dune_layer2', 0xd8a46f, 22);
  dune('dune_layer1', 0xe7b879, 32);

  if (!scene.textures.exists('road_tile')) {
    const g = scene.add.graphics();
    const w = 256;
    const h = 120;
    g.fillStyle(0x1f2937, 1);
    g.fillRect(0, h - 100, w, 100);
    g.fillStyle(0x111827, 1);
    g.fillRect(0, h - 118, w, 18);
    g.fillStyle(0xfefefe, 0.9);
    for (let x = 10; x < w; x += 40) g.fillRect(x, h - 60, 20, 6);
    g.generateTexture('road_tile', w, h);
    destroyG(g);
  }

  if (!scene.textures.exists('finish_flag')) {
    const g = scene.add.graphics();
    g.fillStyle(0xfcd34d);
    g.fillRoundedRect(0, 0, 180, 60, 10);
    g.lineStyle(3, 0xffffff);
    g.strokeRoundedRect(0, 0, 180, 60, 10);
    g.generateTexture('finish_flag', 180, 60);
    destroyG(g);
  }

  if (!scene.textures.exists('puff')) {
    const g = scene.add.graphics();
    g.fillStyle(0xf4c27a, 0.8);
    g.fillCircle(10, 10, 10);
    g.generateTexture('puff', 20, 20);
    destroyG(g);
  }
};

export const makeCarTextures = (scene: Phaser.Scene) => {
  if (!scene.textures.exists('car_shadow')) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(60, 32, 90, 20);
    g.generateTexture('car_shadow', 120, 64);
    destroyG(g);
  }
  const makeCar = (key: string, body: number, accent: number) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(body, 1);
    g.fillRoundedRect(10, 8, 100, 48, 12);
    g.fillStyle(accent, 0.9);
    g.fillRoundedRect(20, 14, 80, 20, 8);
    g.fillStyle(0x0f172a, 1);
    g.fillRect(18, 48, 18, 10);
    g.fillRect(86, 48, 18, 10);
    g.fillStyle(0xf8fafc);
    g.fillRect(32, 18, 18, 12);
    g.fillRect(66, 18, 18, 12);
    g.generateTexture(key, 120, 70);
    destroyG(g);
  };
  makeCar('car_gmc', 0x0f172a, 0x1f2937);
  makeCar('car_prado', 0x8b5e34, 0xa86f3e);
};

export const makeItemTextures = (scene: Phaser.Scene) => {
  const icon = (key: string, color: number) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, 26, 26, 6);
    g.generateTexture(key, 26, 26);
    destroyG(g);
  };
  icon('item_salt', 0xf8fafc);
  icon('item_water', 0x60a5fa);
  icon('item_charcoal', 0x111827);
  icon('item_lighter', 0xf97316);
  icon('item_hummus', 0xfcd34d);
};

export const makePOITextures = (scene: Phaser.Scene) => {
  const card = (key: string, base: number, accent: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(base, 1);
    g.fillRoundedRect(0, 0, 140, 100, 12);
    g.lineStyle(3, accent, 1);
    g.strokeRoundedRect(0, 0, 140, 100, 12);
    draw(g);
    g.generateTexture(key, 140, 100);
    destroyG(g);
  };
  card('poi_station', 0x12395b, 0x4ade80, (g) => {
    g.fillStyle(0x4ade80);
    g.fillRect(30, 30, 26, 44);
    g.fillRect(60, 30, 14, 20);
    g.fillRect(74, 30, 10, 12);
    g.fillRect(84, 34, 10, 24);
    g.fillRect(94, 58, 8, 14);
  });
  card('poi_shop', 0x1f2937, 0x60a5fa, (g) => {
    g.fillStyle(0x60a5fa);
    g.fillRect(28, 32, 84, 42);
    g.fillStyle(0x93c5fd);
    g.fillRect(40, 44, 22, 18);
    g.fillRect(78, 44, 22, 18);
  });
  card('poi_restaurant', 0x6b2c2c, 0xfcd34d, (g) => {
    g.fillStyle(0xfcd34d);
    g.fillRect(40, 28, 12, 48);
    g.fillRect(60, 28, 12, 48);
    g.fillCircle(94, 52, 18);
  });
};
