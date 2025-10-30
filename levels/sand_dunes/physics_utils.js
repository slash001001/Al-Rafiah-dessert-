export const PX_PER_METER = 60;

export const DEFAULT_SAND_PHYSICS = Object.freeze({
  tractionLoss: 0.17,
  gravityY: 820,
  bounce: 0.03,
  friction: 0.28,
});

export function tractionFromSlope({ slopeDeg, speed, physics = DEFAULT_SAND_PHYSICS }) {
  const slopePenalty = slopeDeg > 35 ? physics.tractionLoss : 0;
  const speedPenalty = Math.min(speed * 0.00045, 0.28);
  const traction = 1 - Math.max(slopePenalty, speedPenalty);
  return clamp(traction, 0, 1);
}

export function accelerationWithFriction({ force, massKg, friction }) {
  const netForce = Math.max(force - friction * force, 0);
  return netForce / Math.max(massKg, 1);
}

export function gravityVectorY(gravityY) {
  return clamp(gravityY, 0, 1200);
}

export function bounceWithinRange(bounce) {
  return clamp(bounce, 0, 0.35);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
