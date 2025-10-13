import { fitCanvas, dtClamp, timestamp, kmhFromVelocity, seededRandom } from './utils.js';
import { unlockAudio, playEffect, tickEngine, suspendEngine, setMasterVolume, setAudioEnabled, getAudioSettings, haptics } from './audio.js';
import { setupInput, getInputSnapshot, consumeAction, resetTransient, setInvertControls, scheduleInvert, registerTouchControl, registerQTEButton } from './input.js';
import { WORLD, createSpectators, sampleGround, getPhaseEmoji } from './world.js';
import { createPlayer, resetPlayer, updatePlayer, tryJump, useNitro, useWinch, applyHitSlow } from './player.js';
import { createEntities, resetEntities, updateDogs, updateChair, updateSpectators } from './entities.js';
import { createParticleSystem, spawnTrack, spawnBlood, spawnSand, spawnWind, updateParticles } from './particles.js';
import { createScoreboard, addScore, registerCombo, dropCombo, tickCombo, loadProgress, updatePersonalBest } from './score.js';
import { createEventManager } from './events.js';
import { initUI } from './ui.js';
import { ensureStars, spawnSpeedLines, updateSpeedLines, renderScene } from './render.js';
import { selfTestFitAndGround, updateDebugOverlay } from './selftest.js';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const rng = seededRandom(0x1337);
const ui = initUI();
const settings = ui.settings;
const player = createPlayer();
const particles = createParticleSystem();
const scoreboard = createScoreboard();
loadProgress(scoreboard);
const entities = createEntities(rng);
entities.spectators = createSpectators(rng);

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
  particles: { spawnWind },
  input: { scheduleInvert },
});

const game = {
  running: true,
  finished: false,
  time: 0,
  viewport: fitCanvas(canvas, ctx),
  lastTime: timestamp(),
  cam: { x: 0, shake: 0 },
  fps: 60,
  frameCount: 0,
  fpsTimer: 0,
  lastInput: { left: false, right: false, rawLeft: false, rawRight: false },
  debug: false,
};

const debugOverlay = document.getElementById('debugOverlay');

const controls = document.querySelectorAll('#controls button');
controls.forEach(btn => {
  const action = btn.dataset.control;
  if (action) registerTouchControl(btn, action);
});
document.querySelectorAll('#qteKeys button').forEach(btn => registerQTEButton(btn));

setupInput();
ensureStars();

canvas.addEventListener('pointerdown', unlockAudio, { once: true });

window.addEventListener('resize', () => {
  game.viewport = fitCanvas(canvas, ctx);
});

window.addEventListener('keydown', e => {
  if (e.key === 'F1') {
    game.debug = !game.debug;
    debugOverlay.hidden = !game.debug;
  }
  events.handleBossKey(e.key);
});

setMasterVolume(settings.volume);
setAudioEnabled(settings.sfx);
setInvertControls(settings.invert);

const resetGame = () => {
  game.running = true;
  game.finished = false;
  game.time = 0;
  scoreboard.score = 0;
  scoreboard.comboCount = 0;
  scoreboard.comboTimer = 0;
  scoreboard.comboMax = 1;
  scoreboard.achievements.chairDodge = false;
  resetPlayer(player);
  resetEntities(entities, rng, createSpectators);
  particles.tracks.length = 0;
  particles.blood.length = 0;
  particles.sand.length = 0;
  particles.wind.length = 0;
  ui.hideBanner();
  ui.hideEndCard();
  ui.setHudInvert(false);
  game.cam.x = 0;
  game.cam.shake = 0;
};

ui.restartBtn.addEventListener('click', () => {
  resetGame();
  playEffect('boost', { detune: -40, dur: 0.25 });
});

document.getElementById('settingsToggle').addEventListener('click', unlockAudio);

const handleInput = dt => {
  const snap = getInputSnapshot();
  game.lastInput = snap;

  if (consumeAction('jump') && tryJump(player)) {
    playEffect('jump');
    if (settings.vibration) haptics(35);
  }
  if (consumeAction('nitro') && useNitro(player)) {
    playEffect('boost');
    if (settings.vibration) haptics([50, 30, 50]);
  }
  if (consumeAction('winch') && useWinch(player)) {
    playEffect('winch');
    if (settings.vibration) haptics([60, 40, 60]);
  }

  const choice = consumeAction('choice');
  if (choice) events.handleChoice(choice);

  const qteKey = consumeAction('qteKey');
  if (qteKey) events.handleQTEKey(qteKey);

  return snap;
};

const onDogHit = dog => {
  const combo = registerCombo(scoreboard, 4000, 4);
  const gained = 100 * combo;
  addScore(scoreboard, gained);
  applyHitSlow(player);
  if (!scoreboard.achievements.firstDog) scoreboard.achievements.firstDog = true;
  spawnBlood(particles, dog.x + 12, dog.y - 12, rng);
  ui.showToast(`🐕‍🦺 دعسته! +${Math.round(gained)} • x${combo.toFixed(2)}`);
  playEffect('hit');
  if (settings.vibration) haptics([40, 50, 40]);
  dog.hit = true;
};

const onDogMiss = dog => {
  dropCombo(scoreboard);
  ui.showToast('😬 السرعة قليلة، لا نقاط');
  playEffect('miss');
  dog.missed = true;
};

const onChairOutcome = touched => {
  if (touched) {
    addScore(scoreboard, -50);
    game.time += 5;
    ui.showToast('💺 صدمنا العناد! -50 (+5s)');
    playEffect('miss', { detune: -80 });
  } else {
    addScore(scoreboard, 100);
    scoreboard.achievements.chairDodge = true;
    ui.showToast('💺 نجونا من الكرسي! +100');
    playEffect('boost', { detune: 60 });
  }
};

const updateGame = dt => {
  game.time += dt;
  const input = handleInput(dt);
  updatePlayer(player, input, dt);

  const audioState = getAudioSettings();
  if (audioState.enabled !== settings.sfx) setAudioEnabled(settings.sfx);
  if (audioState.volume !== settings.volume) setMasterVolume(settings.volume);

  if (player.onGround) spawnTrack(particles, player.x, player.y - 6);

  updateDogs(entities, player, dt, { onDogHit, onDogMiss });
  updateChair(entities, player, { onChairOutcome });
  updateSpectators(entities, dt);
  updateParticles(particles, dt);
  tickCombo(scoreboard, dt);
  events.update(dt);
  events.tryTriggers(player.x, game.time);

  const kmh = kmhFromVelocity(player.vx);
  tickEngine(kmh);
  spawnSpeedLines(kmh, game.viewport.width, game.viewport.height);
  updateSpeedLines(dt);
  game.cam.shake = Math.max(game.cam.shake * 0.9, kmh > 110 ? (kmh - 110) * 0.02 : 0);

  if (player.x >= WORLD.FINISH_X && !game.finished) {
    game.finished = true;
    game.running = false;
    events.finish();
    suspendEngine();
    const isPB = updatePersonalBest(scoreboard, game.time);
    ui.showEndCard({
      score: scoreboard.score,
      time: game.time,
      maxCombo: scoreboard.comboMax,
      pb: scoreboard.pb,
      newRecord: isPB,
    });
  }

  const hud = {
    speed: kmh,
    score: scoreboard.score,
    combo: 1 + scoreboard.comboCount * 0.5,
    comboTime: scoreboard.comboTimer / 1000,
    nitro: player.nitro,
    winch: player.winch,
    time: Math.max(0, 70 - game.time),
    progress: Math.min(1, player.x / WORLD.LENGTH),
    phase: getPhaseEmoji(player.x),
  };
  ui.updateHUD(hud);
};

const render = dt => {
  renderScene(ctx, {
    viewport: game.viewport,
    player,
    particles,
    entities,
    dt,
    input: game.lastInput,
    settings,
    camera: game.cam,
  });
  if (game.debug) {
    updateDebugOverlay(debugOverlay, {
      fps: game.fps,
      speed: kmhFromVelocity(player.vx),
      score: scoreboard.score,
      combo: 1 + scoreboard.comboCount * 0.5,
      phase: getPhaseEmoji(player.x),
      camX: game.cam.x,
      bossActive: entities.boss.active,
    });
  }
};

const loop = now => {
  const dtMs = dtClamp(now - game.lastTime);
  game.lastTime = now;
  const dt = dtMs / 1000;
  game.frameCount += 1;
  game.fpsTimer += dt;
  if (game.fpsTimer >= 0.5) {
    game.fps = game.frameCount / game.fpsTimer;
    game.frameCount = 0;
    game.fpsTimer = 0;
  }
  if (game.running) updateGame(dt);
  render(dt);
  ui.update(dt);
  resetTransient();
  requestAnimationFrame(loop);
};

if (!selfTestFitAndGround(canvas, game.cam)) {
  console.warn('Terrain self-test failed, applying fallback baseline.');
  player.y = canvas.height * 0.6;
}

requestAnimationFrame(loop);
