import { randomRange } from './utils.js';
import { WORLD, sampleGround } from './world.js';
import { PLAYER_CONSTANTS } from './player.js';

export const createEntities = rng => {
  const dogs = [];
  let x = WORLD.DOGS_FROM + 160;
  while (x < WORLD.DOGS_TO - 160) {
    x += randomRange(180, 260);
    dogs.push({
      x,
      y: sampleGround(x),
      hit: false,
      missed: false,
      fade: 1,
      timer: 0,
    });
  }
  return {
    dogs,
    chair: { touched: false, resolved: false },
    shalimar: { triggered: false, resolved: false },
    helicopter: { triggered: false, timer: 0 },
    boss: { triggered: false, active: false },
    spectators: [],
  };
};

export const resetEntities = (entities, rng, createSpectators) => {
  entities.dogs.forEach(dog => {
    dog.hit = false;
    dog.missed = false;
    dog.fade = 1;
    dog.timer = 0;
  });
  entities.chair.touched = false;
  entities.chair.resolved = false;
  entities.shalimar.triggered = false;
  entities.shalimar.resolved = false;
  entities.helicopter.triggered = false;
  entities.helicopter.timer = 0;
  entities.boss.triggered = false;
  entities.boss.active = false;
  entities.spectators = createSpectators(rng);
};

export const updateDogs = (entities, player, dt, callbacks) => {
  entities.dogs.forEach(dog => {
    dog.y = sampleGround(dog.x);
    if (dog.hit) {
      dog.timer += dt;
      dog.fade = Math.max(0, 1 - dog.timer * 1.6);
      return;
    }
    if (dog.missed) return;
    const dx = Math.abs((player.x + PLAYER_CONSTANTS.WIDTH * 0.3) - dog.x);
    const dy = Math.abs(player.y - dog.y);
    if (dx < 18 && dy < 16 && player.onGround) {
      if (player.visualSpeed >= PLAYER_CONSTANTS.V_HIT_MIN) callbacks.onDogHit(dog);
      else callbacks.onDogMiss(dog);
    }
  });
};

export const updateChair = (entities, player, callbacks) => {
  if (entities.chair.resolved) return;
  if (player.x > WORLD.CHAIR_X - 40 && player.x < WORLD.CHAIR_X + 40 && player.onGround) {
    entities.chair.touched = true;
  }
  if (player.x > WORLD.CHAIR_X + 120) {
    entities.chair.resolved = true;
    callbacks.onChairOutcome(entities.chair.touched);
  }
};

export const updateSpectators = (entities, dt) => {
  entities.spectators.forEach(sp => {
    sp.sway += dt * 1.8;
  });
};
