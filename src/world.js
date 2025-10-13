import { clamp, randomRange } from './utils.js';

export const WORLD_REGIONS = {
  CHAIR_X: 1600,
  SAND_FROM: 2600,
  SAND_TO: 6400,
  DOGS_FROM: 4200,
  DOGS_TO: 7800,
  SHALIMAR_X: 7950,
  BOSS_X: 8600,
  FINISH_X: 9400,
  WORLD_END: 10400,
};

const terrainCache = new Map();

export const sampleGround = x => {
  const cacheKey = Math.floor(x);
  if (terrainCache.has(cacheKey)) return terrainCache.get(cacheKey);
  const slope = Math.min(300, x * 0.038);
  const undulation = Math.sin(x * 0.0024) * 30 + Math.sin((x + 600) * 0.0011) * 24;
  const dunes = Math.sin((x + 1200) * 0.00032) * 46;
  const crest = x > WORLD_REGIONS.FINISH_X ? (x - WORLD_REGIONS.FINISH_X) * 0.18 : 0;
  const ground = clamp(420 - slope + undulation + dunes - crest, 160, 480);
  terrainCache.set(cacheKey, ground);
  return ground;
};

export const slopeAt = x => {
  const delta = 6;
  const h0 = sampleGround(x - delta);
  const h1 = sampleGround(x + delta);
  return (h1 - h0) / (2 * delta);
};

export const createParallax = () => ([
  { speed: 0.12, amplitude: 16, color: 'rgba(193,139,82,0.45)', width: 520 },
  { speed: 0.24, amplitude: 22, color: 'rgba(212,158,94,0.55)', width: 580 },
]);

export const resetTerrainCache = () => terrainCache.clear();

export const getPhaseEmoji = x => {
  if (x < WORLD_REGIONS.CHAIR_X) return '🌵 إحماء';
  if (x < WORLD_REGIONS.SAND_FROM) return '🪑 كرسي';
  if (x < WORLD_REGIONS.DOGS_FROM) return '☁️ رمل';
  if (x < WORLD_REGIONS.SHALIMAR_X) return '🐕 كلاب';
  if (x < WORLD_REGIONS.BOSS_X) return '🍽️ شاليمار';
  if (x < WORLD_REGIONS.FINISH_X) return '🤪 Boss Dumb & Dumber';
  return '🏁 القمة';
};

export const spawnSpectators = seedFn => {
  const spectators = [];
  for (let i = 0; i < 16; i += 1) {
    const x = 800 + i * 520 + randomRange(-100, 100);
    spectators.push({
      x,
      offset: randomRange(60, 120),
      sway: seedFn() * Math.PI * 2,
      color: `hsl(${seedFn() * 360},62%,60%)`,
    });
  }
  return spectators;
};

export const worldLength = () => WORLD_REGIONS.WORLD_END;
