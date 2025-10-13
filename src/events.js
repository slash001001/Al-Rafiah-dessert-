import { WORLD } from './world.js';
import { playEffect, haptics } from './audio.js';

const QTE_DURATION_MS = 3000;
const QTE_STEP = 0.18;
const QTE_DECAY = 0.12;

export const createEventManager = deps => {
  const state = {
    qte: null,
    choice: null,
    massageCooldown: 0,
    ooobaaaCooldown: 8,
    helicopterTriggered: false,
    bossActive: false,
    bossSequence: [],
    bossTimer: 0,
  };

  const showChoice = (text, options, defaultValue = 2, timeout = 1000) => {
    state.choice = { defaultValue, timer: timeout };
    deps.ui.showChoiceBanner(text, options);
  };

  const resolveChoice = choice => {
    if (!state.choice) return;
    deps.ui.hideBanner();
    const pending = state.choice;
    state.choice = null;
    if (deps.entities.shalimar.triggered && !deps.entities.shalimar.resolved) {
      deps.entities.shalimar.resolved = true;
      resolveShalimar(choice);
      return;
    }
    resolveMassage(choice);
  };

  const resolveMassage = choice => {
    if (choice === 1) {
      deps.score.addScore(deps.scoreboard, 100);
      deps.ui.showToast('💆‍♂️ بعد الخط! +100');
    } else if (choice === 3) {
      deps.player.x += 40;
      deps.ui.showToast('😂 تعال ندف! اندفعنا');
    } else {
      deps.ui.showToast('🙅‍♂️ لا يا الحبيب');
    }
  };

  const resolveShalimar = choice => {
    if (choice === 1) {
      deps.score.addScore(deps.scoreboard, deps.rules.shalimarBoost);
      deps.player.boostSec = Math.max(deps.player.boostSec, 2.5);
      deps.ui.showToast('🍗 كبسة! +' + deps.rules.shalimarBoost);
      playEffect('boost');
    } else if (choice === 2) {
      deps.player.vx *= 0.9;
      deps.ui.showToast('🍛 برياني… ثقلنا شوي');
      playEffect('miss');
    } else {
      if (Math.random() < 0.5) {
        deps.player.nitro += 1;
        deps.ui.showToast('🎁 نيترو إضافي!');
      } else {
        deps.particles.spawnWind(deps.player.x, deps.player.y - 20, -deps.player.direction || 1);
        deps.ui.showToast('💨 غبرة مفاجئة!');
      }
      playEffect('boost', { detune: 40 });
    }
  };

  const triggerMassage = () => {
    state.massageCooldown = 12;
    showChoice('🙋‍♂️ مساج؟', [
      { label: '1) بعد الخط', value: 1 },
      { label: '2) لا يا الحبيب', value: 2 },
      { label: '3) تعال ندف', value: 3 },
    ]);
    playEffect('boss', { detune: -80 });
  };

  const triggerOoobaaa = () => {
    state.ooobaaaCooldown = 10;
    deps.score.addScore(deps.scoreboard, deps.rules.ooobaaaBonus);
    deps.player.boostSec = Math.max(deps.player.boostSec, 1.4);
    deps.ui.showBanner('🗣️ اوووباااا! +' + deps.rules.ooobaaaBonus, 1.4);
    playEffect('ooobaaa');
    haptics([40, 30, 40]);
  };

  const triggerShalimar = () => {
    deps.entities.shalimar.triggered = true;
    showChoice('🍽️ شاليمار! وش تختار؟', [
      { label: '1) كبسة', value: 1 },
      { label: '2) برياني', value: 2 },
      { label: '3) مفاجأة', value: 3 },
    ], 2, 1500);
  };

  const triggerHelicopter = () => {
    if (deps.entities.helicopter.triggered) return;
    deps.entities.helicopter.triggered = true;
    if (Math.random() < 0.5) {
      deps.player.vx += 180;
      deps.player.boostSec = Math.max(deps.player.boostSec, 1.6);
      deps.ui.showBanner('🚁 هليكوبتر — سحب! امسك الحبل', 1.6);
      deps.particles.spawnWind(deps.player.x - 60, deps.player.y - 12, -1);
      playEffect('wind');
    } else {
      deps.player.vx *= 0.78;
      deps.ui.showBanner('🚁 هليكوبتر — غبرة!', 1.6);
      deps.particles.spawnWind(deps.player.x + 60, deps.player.y - 12, 1);
      playEffect('wind', { detune: -40 });
    }
    haptics([30, 30, 30]);
  };

  const triggerBoss = () => {
    if (deps.entities.boss.triggered) return;
    deps.entities.boss.triggered = true;
    deps.entities.boss.active = true;
    state.bossSequence = ['ArrowUp', 'ArrowLeft', 'ArrowUp'];
    state.bossTimer = 1500;
    deps.input.scheduleInvert(2);
    deps.ui.setHudInvert(true);
    deps.ui.showBanner('🤪 Dumb & Dumber قلبوا الأزرار! نفّذ ↑ ← ↑ بسرعة', 2.8);
    playEffect('boss');
    haptics([90, 60, 90]);
  };

  const handleBossKey = key => {
    if (!deps.entities.boss.active || !state.bossSequence.length) return;
    if (key === state.bossSequence[0]) {
      state.bossSequence.shift();
      playEffect('qteSuccess', { detune: 80 });
     if (!state.bossSequence.length) {
        deps.entities.boss.active = false;
        state.bossTimer = 0;
        deps.score.addScore(deps.scoreboard, deps.rules.bossReward);
        deps.player.nitro = Math.max(deps.player.nitro, 1);
        deps.player.winch = Math.max(deps.player.winch, 1);
        deps.scoreboard.achievements.bossSlayer = true;
        deps.ui.showToast(`🤜🤛 هزمت Dumb & Dumber! +${deps.rules.bossReward}`);
        playEffect('boost');
        deps.ui.setHudInvert(false);
      }
    } else {
      deps.entities.boss.active = false;
      state.bossTimer = 0;
      deps.score.addScore(deps.scoreboard, -deps.rules.bossPenalty);
      deps.ui.showToast(`🙃 فشل البوس! -${deps.rules.bossPenalty}`);
      playEffect('miss');
      deps.ui.setHudInvert(false);
    }
  };

  const startQTE = () => {
    if (state.qte) return;
    state.qte = { progress: 0, timer: QTE_DURATION_MS, expect: 'KeyK' };
    deps.ui.setQTE(true);
    deps.ui.showBanner('☁️ تغريز! بدّل K / L بسرعة', 3);
    playEffect('qteStart');
  };

  const handleQTEKey = key => {
    if (!state.qte) return;
    if (key === state.qte.expect) {
      state.qte.progress = Math.min(1, state.qte.progress + QTE_STEP);
      state.qte.expect = key === 'KeyK' ? 'KeyL' : 'KeyK';
      deps.ui.updateQTE(state.qte.progress, state.qte.expect);
      playEffect('qteSuccess', { detune: 40 });
      if (state.qte.progress >= 1) endQTE(true);
    } else {
      state.qte.progress = Math.max(0, state.qte.progress - QTE_STEP * 0.6);
      deps.ui.updateQTE(state.qte.progress, state.qte.expect);
      playEffect('qteFail', { detune: -40 });
    }
  };

  const endQTE = success => {
    if (!state.qte) return;
    deps.ui.setQTE(false);
    deps.ui.hideBanner();
    if (success) {
      deps.score.addScore(deps.scoreboard, deps.rules.qteReward);
      deps.player.boostSec = Math.max(deps.player.boostSec, 1.1);
      deps.ui.showToast(`✅ ${deps.ui.strings().qteSuccess} +${deps.rules.qteReward}`);
    } else {
      deps.ui.showToast('❌ التغريز خلانا!');
      playEffect('miss');
    }
    state.qte = null;
  };

  const update = dt => {
    if (state.ooobaaaCooldown > 0) state.ooobaaaCooldown -= dt;
    if (state.massageCooldown > 0) state.massageCooldown -= dt;
    if (state.choice) {
      state.choice.timer -= dt * 1000;
      if (state.choice.timer <= 0) resolveChoice(state.choice.defaultValue);
    }
    if (state.qte) {
      state.qte.timer -= dt * 1000;
      state.qte.progress = Math.max(0, state.qte.progress - QTE_DECAY * dt);
      deps.ui.updateQTE(state.qte.progress, state.qte.expect);
      if (state.qte.timer <= 0) endQTE(false);
    }
    if (deps.entities.boss.active) {
      state.bossTimer -= dt * 1000;
      if (state.bossTimer <= 0) {
        deps.entities.boss.active = false;
        deps.score.addScore(deps.scoreboard, -deps.rules.bossPenalty);
        deps.ui.showToast(`⏱️ فاتك البوس! -${deps.rules.bossPenalty}`);
        playEffect('miss');
        deps.ui.setHudInvert(false);
      }
    }
  };

  const tryTriggers = (playerX, time) => {
    if (playerX > WORLD.SAND_FROM && playerX < WORLD.SAND_TO && !state.qte && Math.random() < 0.015) startQTE();
    if (playerX > 3200 && state.ooobaaaCooldown <= 0) triggerOoobaaa();
    if (!deps.entities.shalimar.triggered && playerX > WORLD.SHALIMAR_X - 120) triggerShalimar();
    if (state.massageCooldown <= 0 && playerX > 5200 && playerX < 5600) triggerMassage();
    if (!state.helicopterTriggered && time > 30 && time < 45) triggerHelicopter();
    if (!deps.entities.boss.triggered && playerX > WORLD.BOSS_X - 120) triggerBoss();
  };

  const finish = () => {
    deps.ui.showBanner('😂 طبخنا… بس نسينا الملح 🧂', 3);
  };

  return {
    state,
    update,
    tryTriggers,
    handleBossKey,
    handleChoice: resolveChoice,
    handleQTEKey,
    endQTE,
    finish,
  };
};
