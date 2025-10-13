import { clamp, randomRange } from './utils.js';

export const WORLD = {
  CHAIR_X: 1600,
  SAND_FROM: 2600,
  SAND_TO: 6400,
  DOGS_FROM: 4200,
  DOGS_TO: 7600,
  SHALIMAR_X: 7800,
  BOSS_X: 8400,
  FINISH_X: 9200,
  LENGTH: 10500,
  BASELINE: 420,
};

const terrainCache = new Map();

export const sampleGround = x => {
  const key = Math.floor(x);
  if (terrainCache.has(key)) return terrainCache.get(key);
  const slope = Math.min(320, x * 0.038);
  const undulation = Math.sin(x * 0.0026) * 32 + Math.sin((x + 600) * 0.0013) * 24;
  const dunes = Math.sin((x + 1200) * 0.00035) * 46;
  const crest = x > WORLD.FINISH_X ? (x - WORLD.FINISH_X) * 0.2 : 0;
  const y = clamp(WORLD.BASELINE - slope + undulation + dunes - crest, 160, 520);
  terrainCache.set(key, y);
  return y;
};

export const slopeAt = x => {
  const delta = 6;
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

export const createStars = (count = 140) => {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * WORLD.LENGTH,
      y: Math.random() * 0.4 + 0.05,
      a: Math.random() * 0.6 + 0.2,
    });
  }
  return stars;
};

export const createSpectators = rng => {
  const spectators = [];
  for (let i = 0; i < 16; i += 1) {
    const x = 900 + i * 520 + randomRange(-90, 90);
    spectators.push({
      x,
      offset: randomRange(60, 110),
      sway: rng() * Math.PI * 2,
      color: `hsl(${rng() * 360},62%,62%)`,
    });
  }
  return spectators;
};
