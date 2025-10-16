import { describe, it, expect } from 'vitest';
import { playbackRateFromAcceleration, volumeFromAcceleration } from '../../levels/sand_dunes/stabilization_utils.js';

describe('audio mapping helpers', () => {
  it('raises playback rate as acceleration grows', () => {
    const idle = playbackRateFromAcceleration({ baseRate: 1, acceleration: 0, traction: 1 });
    const boosted = playbackRateFromAcceleration({ baseRate: 1, acceleration: 1, traction: 0.7 });
    expect(boosted).toBeGreaterThan(idle);
    expect(boosted).toBeLessThanOrEqual(1.4);
  });

  it('keeps volume within safe bounds', () => {
    const base = volumeFromAcceleration({ baseVolume: 0.4, acceleration: 0 });
    const high = volumeFromAcceleration({ baseVolume: 0.4, acceleration: 3 });
    expect(base).toBeGreaterThanOrEqual(0.2);
    expect(high).toBeLessThanOrEqual(0.9);
  });
});
