import { randomRange } from './utils.js';
import { WORLD_REGIONS, sampleGround, spawnSpectators } from './world.js';

export const DOG_CONSTANTS = {
  BASE_SCORE: 100,
  HIT_MIN_SPEED: 6.5,
  SPAWN_STEP_MIN: 180,
  SPAWN_STEP_MAX: 260,
};

export const createEntities = rng => {
  const dogs = [];
  let x = WORLD_REGIONS.DOGS_FROM + 160;
  while (x < WORLD_REGIONS.DOGS_TO - 120) {
    x += randomRange(DOG_CONSTANTS.SPAWN_STEP_MIN, DOG_CONSTANTS.SPAWN_STEP_MAX);
    dogs.push({
      x,
      y: sampleGround(x),
      hit: false,
      missed: false,
      timer: 0,
      fade: 1,
    });
  }
  return {
    dogs,
    chair: { x: WORLD_REGIONS.CHAIR_X, touched: false, resolved: false },
    shalimar: { x: WORLD_REGIONS.SHALIMAR_X, triggered: false, resolved: false },
    helicopter: { triggered: false, timer: 0 },
    boss: { triggered: false, active: false, invertTimer: 0, window: 0 },
    spectators: spawnSpectators(rng),
  };
};

export const resetEntities = (entities, rng) => {
  entities.dogs.forEach(d => {
    d.hit = false;
    d.missed = false;
    d.timer = 0;
    d.fade = 1;
  });
  entities.chair.touched = false;
  entities.chair.resolved = false;
  entities.shalimar.triggered = false;
  entities.shalimar.resolved = false;
  entities.helicopter.triggered = false;
  entities.helicopter.timer = 0;
  entities.boss.triggered = false;
  entities.boss.active = false;
  entities.boss.invertTimer = 0;
  entities.boss.window = 0;
  entities.spectators = spawnSpectators(rng);
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
    const dx = Math.abs((player.x + 52) - dog.x);
    const dy = Math.abs(player.y - dog.y);
    if (dx < 32 && dy < 18 && player.onGround) {
      if (player.visualSpeed >= DOG_CONSTANTS.HIT_MIN_SPEED) {
        dog.hit = true;
        callbacks.onDogHit(dog);
      } else {
        dog.missed = true;
        callbacks.onDogMiss(dog);
      }
    }
  });
};

export const updateChair = (entities, player, callbacks) => {
  if (entities.chair.resolved) return;
  const chair = entities.chair;
  const carFront = player.x + 70;
  const carRear = player.x - 70;
  if (carFront > chair.x - 18 && carRear < chair.x + 18 && player.onGround) {
    chair.touched = true;
  }
  if (player.x > chair.x + 110) {
    chair.resolved = true;
    callbacks.onChairOutcome(chair.touched);
  }
};

export const updateSpectators = (entities, dt) => {
  entities.spectators.forEach(sp => {
    sp.sway += dt * 1.8;
  });
};
