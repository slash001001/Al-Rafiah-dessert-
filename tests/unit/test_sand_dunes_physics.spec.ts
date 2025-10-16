import { describe, it, expect } from 'vitest';
import {
  tractionFromSlope,
  accelerationWithFriction,
  gravityVectorY,
  bounceWithinRange,
  DEFAULT_SAND_PHYSICS,
} from '../../levels/sand_dunes/physics_utils.js';

describe('Sand Dunes physics tuning', () => {
  it('applies traction loss under steep slopes', () => {
    const steepTraction = tractionFromSlope({ slopeDeg: 40, speed: 10, physics: DEFAULT_SAND_PHYSICS });
    const flatTraction = tractionFromSlope({ slopeDeg: 12, speed: 4, physics: DEFAULT_SAND_PHYSICS });
    expect(flatTraction).toBeCloseTo(1);
    expect(steepTraction).toBeLessThan(flatTraction);
    expect(steepTraction).toBeGreaterThan(0.6);
  });

  it('maintains acceleration curves for different friction presets', () => {
    const baseAccel = accelerationWithFriction({ force: 400, massKg: 1850, friction: 0.28 });
    const lowFrictionAccel = accelerationWithFriction({ force: 400, massKg: 1850, friction: 0.12 });
    expect(lowFrictionAccel).toBeGreaterThan(baseAccel);
    expect(baseAccel).toBeGreaterThan(0);
  });

  it('keeps gravity and bounce within safe bounds', () => {
    expect(gravityVectorY(820)).toBeGreaterThan(0);
    expect(gravityVectorY(1600)).toBeLessThanOrEqual(1200);
    expect(bounceWithinRange(0.2)).toBe(0.2);
    expect(bounceWithinRange(0.8)).toBeLessThanOrEqual(0.35);
  });
});
