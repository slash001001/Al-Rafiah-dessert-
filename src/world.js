import { clamp, randomRange } from './utils.js';

export const WORLD = {
  CHAIR_X: 1600,
  SAND_FROM: 2600,
  SAND_TO: 6400,
  DOGS_FROM: 4200,
  DOGS_TO: 7600,
  SHALIMAR_X: 7800,
  BOSS_X: 8400,
  FINISH_X: 9300,
  LENGTH: 11000,
  BASELINE: 420,
};

const terrainCache = new Map();

export const sampleGround = x => {
  const key = Math.floor(x);
  if (terrainCache.has(key)) return terrainCache.get(key);
  const slope = Math.min(360, x * 0.04);
  const undulation = Math.sin(x * 0.0024) * 32 + Math.sin((x + 580) * 0.0013) * 26;
  const dunes = Math.sin((x + 1100) * 0.00035) * 48;
  const crest = x > WORLD.FINISH_X ? (x - WORLD.FINISH_X) * 0.22 : 0;
  const y = clamp(WORLD.BASELINE - slope + undulation + dunes - crest, 150, 520);
  terrainCache.set(key, y);
  return y;
};

export const slopeAt = x => {
  const delta = 8;
  const h0 = sampleGround(x - delta);
  const h1 = sampleGround(x + delta);
  return (h1 - h0) / (2 * delta);
};

export const getPhaseEmoji = x => {
  if (x < WORLD.CHAIR_X) return '🌵 إحماء';
  if (x < WORLD.SAND_FROM) return '🪑 كرسي';
  if (x < WORLD.DOGS_FROM) return '☁️ رمل';
  if (x < WORLD.SHALIMAR_X) return '🐕 كلاب';
  if (x < WORLD.BOSS_X) return '🍽️ شاليمار';
  if (x < WORLD.FINISH_X) return '🤪 Boss Dumb & Dumber';
  return '🏁 القمة';
};

export const createStars = (count = 180) => {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * WORLD.LENGTH,
      y: Math.random() * 0.45 + 0.02,
      a: Math.random() * 0.65 + 0.2,
      size: Math.random() * 1.6 + 0.8,
    });
  }
  return stars;
};

export const createSpectators = rng => {
  const spectators = [];
  for (let i = 0; i < 18; i += 1) {
    const x = 900 + i * 520 + randomRange(-120, 90);
    spectators.push({
      x,
      offset: randomRange(60, 110),
      sway: rng() * Math.PI * 2,
      color: `hsl(${rng() * 360},62%,62%)`,
    });
  }
  return spectators;
};

export const initCamera = () => ({ x: 0, y: 0, roll: 0, lookAhead: 0.35, shake: 0 });

export const updateCamera = (cam, player, settings, viewport, dt) => {
  const look = settings.lookAhead ?? 0.35;
  const targetX = clamp(player.x - viewport.width * (0.35 - look * 0.2) + player.vx * look * 0.25, 0, WORLD.LENGTH);
  cam.x += (targetX - cam.x) * clamp(0.06 + look * 0.04, 0.04, 0.12);

  const targetY = sampleGround(player.x + 120) - viewport.height * 0.55;
  cam.y += (targetY - cam.y) * 0.08;

  const slope = slopeAt(player.x);
  const maxRoll = (settings.roll ?? 0.5) * 0.3;
  cam.roll += (clamp(-slope * 0.8, -maxRoll, maxRoll) - cam.roll) * 0.12;

  const shakeAmount = (settings.shake ?? 1) * (player.kmh / 220) + (player.boostSec > 0 ? 0.6 : 0);
  cam.shake = cam.shake * Math.pow(0.92, dt * 60) + shakeAmount * 0.02;
};
