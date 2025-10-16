import { describe, it, expect } from 'vitest';
import { cameraOffsetStep } from '../../levels/sand_dunes/stabilization_utils.js';

describe('cameraOffsetStep', () => {
  it('reduces jitter across successive frames', () => {
    let offset = 0;
    const target = 120;
    const dt = 1 / 60;

    const firstStep = cameraOffsetStep(offset, target, dt, 3);
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThan(target);

    for (let i = 0; i < 20; i += 1) {
      offset = cameraOffsetStep(offset, target, dt, 3);
    }

    const remainingDelta = target - offset;
    expect(remainingDelta).toBeLessThan(target * 0.4);
  });
});
