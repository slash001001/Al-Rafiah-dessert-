import { clamp, kmh } from './utils.js';
import { sampleGround } from './world.js';

export const PLAYER_CONSTANTS = {
  WIDTH: 160,
  HEIGHT: 68,
  WHEEL_RADIUS: 22,
  ACCEL: 250,
  FRICTION: 14,
  DRAG: 0.62,
  GRAVITY: 900,
  JUMP: 540,
  MAX_FORWARD: 360,
  MAX_REVERSE: -140,
  HIT_SLOW: 0.6,
};

export const createPlayer = () => ({
  x: 80,
  y: sampleGround(80),
  vx: 80,
  vy: 0,
  onGround: true,
  direction: 1,
  boostSec: 0,
  nitro: 2,
  winch: 1,
  kmh: 0,
  visualSpeed: 0,
  hitSlow: 0,
  landedHard: false,
});

export const resetPlayer = player => {
  player.x = 80;
  player.y = sampleGround(80);
  player.vx = 80;
  player.vy = 0;
  player.onGround = true;
  player.direction = 1;
  player.boostSec = 0;
  player.nitro = 2;
  player.winch = 1;
  player.kmh = 0;
  player.visualSpeed = 0;
  player.hitSlow = 0;
};

export const updatePlayer = (player, input, dt, world, trackers) => {
  const accel = PLAYER_CONSTANTS.ACCEL;
  let targetAccel = 0;
  if (input.left) targetAccel -= accel;
  if (input.right) targetAccel += accel;
  if (!input.left && !input.right) {
    player.vx = player.vx * (1 - PLAYER_CONSTANTS.FRICTION * dt);
  } else {
    player.vx += targetAccel * dt;
  }
  if (player.boostSec > 0) {
    player.boostSec -= dt;
    player.vx += 420 * dt;
  }
  if (player.hitSlow > 0) {
    player.hitSlow -= dt;
    player.vx *= 0.98;
  }
  const drag = PLAYER_CONSTANTS.DRAG;
  player.vx *= 1 - drag * dt;
  player.vx = clamp(
    player.vx,
    PLAYER_CONSTANTS.MAX_REVERSE,
    PLAYER_CONSTANTS.MAX_FORWARD + (player.boostSec > 0 ? 120 : 0),
  );
  player.x += player.vx * dt;
  player.vy += PLAYER_CONSTANTS.GRAVITY * dt;
  player.y += player.vy * dt;
  const ground = sampleGround(player.x);
  player.landedHard = false;
  if (player.y >= ground) {
    if (!player.onGround && Math.abs(player.vy) > 220) {
      player.landedHard = true;
      trackers.spawnSand(player.x, ground - 12, Math.sign(player.vx) || 1);
    }
    player.y = ground;
    player.vy = 0;
    if (!player.onGround) trackers.spawnTrack(player.x, ground - 8);
    player.onGround = true;
  } else {
    player.onGround = false;
  }
  player.kmh = kmh(player.vx);
  player.visualSpeed = player.kmh / 10;
  player.direction = player.vx >= 0 ? 1 : -1;
};

export const tryJump = player => {
  if (!player.onGround) return false;
  player.vy = -PLAYER_CONSTANTS.JUMP;
  player.onGround = false;
  return true;
};

export const applyNitro = player => {
  if (player.nitro <= 0) return false;
  player.nitro -= 1;
  player.boostSec = Math.max(player.boostSec, 2.4);
  return true;
};

export const applyWinch = player => {
  if (player.winch <= 0) return false;
  player.winch -= 1;
  player.vx += 200;
  return true;
};

export const awardNitro = player => {
  player.nitro += 1;
};

export const awardWinch = player => {
  player.winch += 1;
};

export const hitSlowdown = player => {
  player.hitSlow = PLAYER_CONSTANTS.HIT_SLOW;
};
