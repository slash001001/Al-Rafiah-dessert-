import { sampleGround, resetTerrainCache } from './world.js';

export const runSelfTest = canvas => {
  resetTerrainCache();
  const width = canvas.width || 1024;
  let last = sampleGround(0);
  for (let x = 60; x < width; x += 60) {
    const y = sampleGround(x);
    if (!Number.isFinite(y)) {
      return false;
    }
    if (Math.abs(y - last) > 220) {
      return false;
    }
    last = y;
  }
  return true;
};

export const fallbackTerrain = () => ({
  sample: () => 420,
});
