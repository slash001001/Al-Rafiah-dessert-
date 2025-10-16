import { describe, it, expect } from 'vitest';
import { applyDeadZone, smoothValue } from '../../levels/sand_dunes/stabilization_utils.js';

describe('input helpers', () => {
  it('applies deadzone to analog values', () => {
    expect(applyDeadZone(0.05, 0.15)).toBe(0);
    expect(applyDeadZone(0.4, 0.15)).toBeCloseTo(0.4, 5);
  });

  it('smoothes transitions to avoid rapid oscillation', () => {
    const previous = 0;
    const smoothed = smoothValue(previous, 1, 0.35);
    expect(smoothed).toBeGreaterThan(0);
    const second = smoothValue(smoothed, 1, 0.35);
    expect(second).toBeGreaterThan(smoothed);
  });
});
