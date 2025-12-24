import Phaser from 'phaser';
import { ArtKeys } from './ArtKeys';

const destroyG = (g: Phaser.GameObjects.Graphics) => {
  g.clear();
  g.destroy();
};

const palette = {
  skyTop: 0x0b1b3a,
  skyHorizon: 0xf59e0b,
  duneFar: 0xf5d18a,
  duneMid: 0xe9b96c,
  duneNear: 0xd99b52,
  road: 0x1f2937
};

export function ensureProceduralArt(scene: Phaser.Scene) {
  makeSky(scene);
  makeDunes(scene);
  makeRoad(scene);
  makePOI(scene);
  makeIcons(scene);
  makeCars(scene);
  makeWorldBits(scene);
}

function makeSky(scene: Phaser.Scene) {
  if (scene.textures.exists(ArtKeys.SKY_GRAD)) return;
  const g = scene.add.graphics();
  const w = 32;
  const h = 256;
  const top = Phaser.Display.Color.ValueToColor(palette.skyTop);
  const bot = Phaser.Display.Color.ValueToColor(palette.skyHorizon);
  for (let i = 0; i < h; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, h, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, i, w, 1);
  }
  g.generateTexture(ArtKeys.SKY_GRAD, w, h);
  destroyG(g);
}

function makeDunes(scene: Phaser.Scene) {
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
      const y = h - 50 - Math.sin(i * 1.1) * amp - Math.cos(i * 1.7) * amp * 0.5;
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, w, h);
    destroyG(g);
  };
  dune(ArtKeys.DUNE_L3, palette.duneFar, 12);
  dune(ArtKeys.DUNE_L2, palette.duneMid, 22);
  dune(ArtKeys.DUNE_L1, palette.duneNear, 32);
}

function makeRoad(scene: Phaser.Scene) {
  if (scene.textures.exists(ArtKeys.ROAD_TILE)) return;
  const g = scene.add.graphics();
  const w = 256;
  const h = 120;
  g.fillStyle(palette.road, 1);
  g.fillRect(0, h - 100, w, 100);
  g.fillStyle(0x111827, 1);
  g.fillRect(0, h - 118, w, 18);
  g.fillStyle(0xfefefe, 0.9);
  for (let x = 10; x < w; x += 40) g.fillRect(x, h - 60, 20, 6);
  g.generateTexture(ArtKeys.ROAD_TILE, w, h);
  destroyG(g);
}

function makePOI(scene: Phaser.Scene) {
  const card = (key: string, base: number, accent: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(base, 1);
    g.fillRoundedRect(0, 0, 80, 80, 10);
    g.lineStyle(3, accent, 1);
    g.strokeRoundedRect(0, 0, 80, 80, 10);
    draw(g);
    g.generateTexture(key, 80, 80);
    destroyG(g);
  };
  card(ArtKeys.POI_STATION, 0x12395b, 0x4ade80, (g) => {
    g.fillStyle(0x4ade80);
    g.fillRect(20, 22, 16, 36);
    g.fillRect(38, 22, 12, 18);
    g.fillRect(50, 22, 8, 10);
    g.fillRect(58, 26, 10, 24);
  });
  card(ArtKeys.POI_SHOP, 0x1f2937, 0x60a5fa, (g) => {
    g.fillStyle(0x60a5fa);
    g.fillRect(18, 26, 44, 32);
    g.fillStyle(0x93c5fd);
    g.fillRect(22, 34, 16, 14);
    g.fillRect(42, 34, 16, 14);
  });
  card(ArtKeys.POI_RESTAURANT, 0x6b2c2c, 0xfcd34d, (g) => {
    g.fillStyle(0xfcd34d);
    g.fillRect(24, 20, 8, 40);
    g.fillRect(38, 20, 8, 40);
    g.fillCircle(58, 44, 14);
  });
}

function makeIcons(scene: Phaser.Scene) {
  const icon = (key: string, color: number, shape: 'circle' | 'square') => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    if (shape === 'circle') g.fillCircle(12, 12, 12);
    else g.fillRoundedRect(0, 0, 24, 24, 6);
    g.generateTexture(key, 24, 24);
    destroyG(g);
  };
  icon(ArtKeys.ICON_SALT, 0xf8fafc, 'square');
  icon(ArtKeys.ICON_WATER, 0x60a5fa, 'circle');
  icon(ArtKeys.ICON_CHARCOAL, 0x111827, 'square');
  icon(ArtKeys.ICON_LIGHTER, 0xf97316, 'circle');
  icon(ArtKeys.ICON_HUMMUS, 0xfcd34d, 'circle');
}

function makeCars(scene: Phaser.Scene) {
  if (!scene.textures.exists(ArtKeys.VEH_SHADOW)) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(36, 12, 72, 24);
    g.generateTexture(ArtKeys.VEH_SHADOW, 72, 24);
    destroyG(g);
  }
  const makeCar = (key: string, body: number, accent: number) => {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(body, 1);
    g.fillRoundedRect(2, 0, 68, 40, 10);
    g.fillStyle(accent, 0.9);
    g.fillRoundedRect(12, 6, 48, 18, 8);
    g.fillStyle(0x0f172a, 1);
    g.fillRect(10, 30, 12, 6);
    g.fillRect(50, 30, 12, 6);
    g.fillStyle(0xf8fafc);
    g.fillRect(20, 10, 12, 10);
    g.fillRect(40, 10, 12, 10);
    g.generateTexture(key, 72, 40);
    destroyG(g);
  };
  makeCar(ArtKeys.VEH_GMC, 0x0f172a, 0x1f2937);
  makeCar(ArtKeys.VEH_PRADO, 0x8b5e34, 0xa86f3e);
}

function makeWorldBits(scene: Phaser.Scene) {
  if (!scene.textures.exists(ArtKeys.PUFF)) {
    const g = scene.add.graphics();
    g.fillStyle(0xf4c27a, 0.8);
    g.fillCircle(10, 10, 10);
    g.generateTexture(ArtKeys.PUFF, 20, 20);
    destroyG(g);
  }
  if (!scene.textures.exists(ArtKeys.FINISH_FLAG)) {
    const g = scene.add.graphics();
    g.fillStyle(0xfcd34d);
    g.fillRoundedRect(0, 0, 80, 80, 10);
    g.lineStyle(3, 0xffffff);
    g.strokeRoundedRect(0, 0, 80, 80, 10);
    g.generateTexture(ArtKeys.FINISH_FLAG, 80, 80);
    destroyG(g);
  }
  if (!scene.textures.exists(ArtKeys.HELICOPTER)) {
    const g = scene.add.graphics();
    g.fillStyle(0x38bdf8);
    g.fillRoundedRect(8, 14, 80, 22, 6);
    g.fillStyle(0x0ea5e9);
    g.fillRect(36, 8, 12, 12);
    g.fillStyle(0x0f172a);
    g.fillRect(0, 22, 96, 2);
    g.generateTexture(ArtKeys.HELICOPTER, 96, 48);
    destroyG(g);
  }
  if (!scene.textures.exists(ArtKeys.CAMEL)) {
    const g = scene.add.graphics();
    g.fillStyle(0xd4a373);
    g.fillRoundedRect(0, 12, 80, 30, 10);
    g.fillStyle(0x8b5e34);
    g.fillCircle(16, 24, 10);
    g.generateTexture(ArtKeys.CAMEL, 80, 50);
    destroyG(g);
  }
  if (!scene.textures.exists(ArtKeys.DOG)) {
    const g = scene.add.graphics();
    g.fillStyle(0xcbd5e1);
    g.fillRoundedRect(0, 2, 28, 16, 8);
    g.fillStyle(0x94a3b8);
    g.fillCircle(24, 12, 6);
    g.generateTexture(ArtKeys.DOG, 28, 20);
    destroyG(g);
  }
}
