import { fitCanvas, dtClamp, timestamp, seededRng } from './utils.js';
import { unlockAudio, playSfx, tickEngine, suspendEngine } from './audio.js';
import { setupInput, getInputSnapshot, consumeAction, pollGamepad, resetTransient } from './input.js';
import { WORLD_REGIONS, worldLength, getPhaseEmoji, sampleGround } from './world.js';
import { createPlayer, updatePlayer, tryJump, applyNitro, applyWinch, hitSlowdown } from './player.js';
import { createEntities, resetEntities, updateDogs, updateChair, updateSpectators } from './entities.js';
import { createParticleSystem, spawnTrack, spawnBlood, spawnSand, updateParticles } from './particles.js';
import { createScoreboard, addScore, registerComboHit, dropCombo, tickCombo, loadProgress, evaluatePB } from './score.js';
import { createEventManager } from './events.js';
import { initUI } from './ui.js';
import { createRenderer, cameraShakeTick, spawnSpeedLines, updateSpeedLines } from './render.js';
import { runSelfTest } from './selftest.js';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const rng = seededRng(0x1337);
const ui = initUI();
const renderer = createRenderer(ctx, canvas);

const player = createPlayer();
const particles = createParticleSystem();
const scoreboard = createScoreboard();
loadProgress(scoreboard);
const entities = createEntities(rng);

const events = createEventManager({
  ui,
  score: { addScore },
  scoreboard,
  rules: {
    qteReward: 50,
    ooobaaaBonus: 50,
    shalimarBoost: 300,
    bossReward: 500,
    bossPenalty: 200,
  },
  player,
  entities,
  spawnSand: (x, y, dir) => spawnSand(particles, x, y, dir),
  strings: ui.strings,
  haptics: pattern => navigator.vibrate?.(pattern),
});

const gameState = {
  running: true,
  time: 0,
  finished: false,
  viewport: fitCanvas(canvas, ctx),
  lastInput: {
    left: false,
    right: false,
    rawLeft: false,
    rawRight: false,
  },
};

let lastTime = timestamp();

const resetGame = () => {
  gameState.running = true;
  gameState.finished = false;
  gameState.time = 0;
  resetEntities(entities, rng);
  scoreboard.score = 0;
  scoreboard.comboLevel = 0;
  scoreboard.comboTimer = 0;
  scoreboard.maxCombo = 1;
  scoreboard.achievements.firstBlood = false;
  player.nitro = 2;
  player.winch = 1;
  player.boostSec = 0;
  player.hitSlow = 0;
  player.vx = 80;
  player.vy = 0;
  player.x = 80;
  player.y = sampleGround(player.x);
  particles.tracks.length = 0;
  particles.blood.length = 0;
  particles.sand.length = 0;
  ui.hideBanner();
  ui.hideEndCard();
};

ui.restartBtn.addEventListener('click', () => {
  resetGame();
});

window.addEventListener('resize', () => {
  gameState.viewport = fitCanvas(canvas, ctx);
});

canvas.addEventListener('pointerdown', () => {
  unlockAudio();
}, { once: true });

setupInput();
runSelfTest(canvas);

window.addEventListener('keydown', e => {
  events.handleBossInput(e.key);
});

const handleInput = dt => {
  const snap = getInputSnapshot();
  pollGamepad();

  if (consumeAction('jump') && tryJump(player)) {
    playSfx('jump');
  }
  if (consumeAction('nitro') && applyNitro(player)) {
    playSfx('boost');
    navigator.vibrate?.(80);
  }
  if (consumeAction('winch') && applyWinch(player)) {
    playSfx('winch');
    navigator.vibrate?.([60, 40, 60]);
  }

  const choice = consumeAction('choice');
  if (choice) events.handleChoice(choice);

  const qteKey = consumeAction('qteKey');
  if (qteKey) events.handleQTEKey(qteKey);

  return snap;
};

const onDogHit = dog => {
  const combo = registerComboHit(scoreboard, 4, 0.5, 4);
  const gained = 100 * combo;
  addScore(scoreboard, gained);
  hitSlowdown(player);
  spawnBlood(particles, dog.x + 12, dog.y - 12, rng);
  scoreboard.achievements.firstBlood = true;
  ui.showToast(`🐕‍🦺 دعسته! +${Math.round(gained)} • x${combo.toFixed(2)}`);
  playSfx('hit');
  navigator.vibrate?.([50, 60, 50]);
};

const onDogMiss = () => {
  dropCombo(scoreboard);
  ui.showToast('😬 السرعة قليلة، لا نقاط');
  playSfx('miss');
};

const onChairOutcome = touched => {
  if (touched) {
    addScore(scoreboard, -50);
    gameState.time += 5;
    ui.showToast('💺 صدمنا العناد! -50 (+5s)');
    playSfx('miss', -80);
  } else {
    addScore(scoreboard, 100);
    ui.showToast('💺 نجونا من الكرسي! +100');
    playSfx('boost', 60);
  }
};

const updateGame = dt => {
  gameState.time += dt;
  const input = handleInput(dt);
  gameState.lastInput = input;
  const trackers = {
    spawnTrack: (x, y) => spawnTrack(particles, x, y),
    spawnSand: (x, y, dir) => spawnSand(particles, x, y, dir),
  };
  updatePlayer(player, input, dt, WORLD_REGIONS, trackers);

  updateDogs(entities, player, dt, { onDogHit, onDogMiss });
  updateChair(entities, player, { onChairOutcome });
  updateSpectators(entities, dt);
  updateParticles(particles, dt);
  tickCombo(scoreboard, dt);
  events.update(dt);
  events.tryStartEvents(player.x, gameState.time);

  tickEngine(player.kmh);
  cameraShakeTick(player.kmh, player.boostSec > 0, dt);
  if (player.kmh > 120) spawnSpeedLines(player.kmh);
  updateSpeedLines(dt);

  if (player.x >= WORLD_REGIONS.FINISH_X && !gameState.finished) {
    gameState.finished = true;
    gameState.running = false;
    events.finish();
    suspendEngine();
    const isPB = evaluatePB(scoreboard, gameState.time);
    ui.showEndCard({
      score: scoreboard.score,
      time: gameState.time,
      maxCombo: scoreboard.maxCombo,
      pb: scoreboard.pb,
      newRecord: isPB,
    });
  }

  const hudData = {
    speed: player.kmh,
    score: scoreboard.score,
    combo: 1 + scoreboard.comboLevel * 0.5,
    comboTime: scoreboard.comboTimer,
    nitro: player.nitro,
    winch: player.winch,
    time: Math.max(0, 70 - gameState.time),
    progress: Math.min(1, player.x / worldLength()),
    phase: getPhaseEmoji(player.x),
  };
  ui.updateHUD(hudData);
};

const renderGame = dt => {
  renderer.renderScene({
    viewport: gameState.viewport,
    player,
    particles,
    entities,
    dt,
    regions: WORLD_REGIONS,
    settings: ui.settings,
    worldEnd: worldLength(),
    input: gameState.lastInput,
  });
};

const loop = now => {
  const dtMs = dtClamp(now - lastTime);
  lastTime = now;
  const dt = dtMs / 1000;
  if (gameState.running) {
    updateGame(dt);
  }
  renderGame(dt);
  ui.update(dt);
  resetTransient();
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
