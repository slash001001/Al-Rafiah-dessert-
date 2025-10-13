import { clamp, kmhFromVelocity } from './utils.js';
import { sampleGround } from './world.js';

export const PLAYER_CONSTANTS = {
  WIDTH: 80,
  HEIGHT: 36,
  ACCEL: 250,
  DRAG: 0.62,
  FRICTION: 14,
  GRAVITY: 900,
  JUMP: 540,
  MAX_V: 360,
  MIN_V: -140,
  V_HIT_MIN: 6.5,
  HIT_SLOW: 0.9,
  HIT_SLOW_TIME: 0.6,
};

export const createPlayer = () => ({
  x: 80,
  y: sampleGround(80),
  vx: 80,
  vy: 0,
  onGround: true,
  direction: 1,
  nitro: 2,
  winch: 1,
  boostSec: 0,
  hitSlowTimer: 0,
  kmh: 0,
  visualSpeed: 0,
});

export const resetPlayer = player => {
  player.x = 80;
  player.y = sampleGround(player.x);
  player.vx = 80;
  player.vy = 0;
  player.onGround = true;
  player.direction = 1;
  player.nitro = 2;
  player.winch = 1;
  player.boostSec = 0;
  player.hitSlowTimer = 0;
  player.kmh = 0;
  player.visualSpeed = 0;
};

export const updatePlayer = (player, input, dt) => {
  const btnLeft = input.left;
  const btnRight = input.right;

  if (btnLeft && !btnRight) player.vx -= PLAYER_CONSTANTS.ACCEL * dt;
  if (btnRight && !btnLeft) player.vx += PLAYER_CONSTANTS.ACCEL * dt;
  if (!btnLeft && !btnRight) player.vx = player.vx * (1 - PLAYER_CONSTANTS.FRICTION * dt);

  if (player.boostSec > 0) {
    player.boostSec -= dt;
    player.vx += 420 * dt;
  }

  if (player.hitSlowTimer > 0) {
    player.hitSlowTimer -= dt;
    player.vx *= PLAYER_CONSTANTS.HIT_SLOW;
  }

  player.vx *= 1 - PLAYER_CONSTANTS.DRAG * dt;
  player.vx = clamp(player.vx, PLAYER_CONSTANTS.MIN_V, PLAYER_CONSTANTS.MAX_V + (player.boostSec > 0 ? 120 : 0));

  player.x += player.vx * dt;
  player.vy += PLAYER_CONSTANTS.GRAVITY * dt;
  player.y += player.vy * dt;

  const ground = sampleGround(player.x);
  if (player.y >= ground) {
    player.y = ground;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  player.direction = player.vx >= 0 ? 1 : -1;
  player.kmh = kmhFromVelocity(player.vx);
  player.visualSpeed = player.kmh / 10;
};

export const tryJump = player => {
  if (!player.onGround) return false;
  player.vy = -PLAYER_CONSTANTS.JUMP;
  player.onGround = false;
  return true;
};

export const useNitro = player => {
  if (player.nitro <= 0) return false;
  player.nitro -= 1;
  player.boostSec = Math.max(player.boostSec, 2.4);
  return true;
};

export const useWinch = player => {
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

export const applyHitSlow = player => {
  player.hitSlowTimer = PLAYER_CONSTANTS.HIT_SLOW_TIME;
};
