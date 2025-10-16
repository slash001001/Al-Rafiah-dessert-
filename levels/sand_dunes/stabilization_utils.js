export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function smoothValue(previous, target, smoothing = 0.35) {
  const amount = clamp(smoothing, 0, 1);
  return previous + (target - previous) * amount;
}

export function cameraOffsetStep(current, target, dt, rate = 3) {
  const factor = clamp(dt * rate, 0, 1);
  return current + (target - current) * factor;
}

export function playbackRateFromAcceleration({ baseRate = 1, acceleration = 0, traction = 1 }) {
  const tractionLoss = clamp(1 - traction, 0, 1);
  const rate = baseRate + acceleration * 0.4 + tractionLoss * 0.2;
  return clamp(rate, 0.8, 1.4);
}

export function volumeFromAcceleration({ baseVolume = 0.4, acceleration = 0 }) {
  const volume = baseVolume + acceleration * 0.5;
  return clamp(volume, 0.2, 0.9);
}

export function applyDeadZone(value, deadzone = 0.15) {
  return Math.abs(value) < deadzone ? 0 : value;
}
