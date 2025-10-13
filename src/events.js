import { WORLD_REGIONS } from './world.js';
import { playSfx } from './audio.js';

export const createEventManager = deps => {
  const state = {
    qte: null,
    massageCooldown: 0,
    ooobaaaCooldown: 8,
    bossSequence: null,
    bossTimer: 0,
    invertTimer: 0,
    choicePending: null,
  };

  const startQTE = () => {
    if (state.qte) return;
    state.qte = { progress: 0, timer: 3, expect: 'KeyK' };
    deps.ui.showBanner('☁️ الرمل ناعم! بدّل K / L بسرعة', 3);
    deps.ui.setQTE(true);
    deps.haptics(60);
    playSfx('qteStart');
  };

  const endQTE = success => {
    if (!state.qte) return;
    deps.ui.setQTE(false);
    deps.ui.hideBanner();
    if (success) {
      deps.score.addScore(deps.scoreboard, deps.rules.qteReward);
      deps.ui.showToast(`✅ ${deps.strings().qteSuccess} +${deps.rules.qteReward}`);
      playSfx('qteSuccess');
      deps.player.boostSec = Math.max(deps.player.boostSec, 1.1);
    } else {
      deps.ui.showToast('❌ التغريز خلانا!');
      playSfx('qteFail');
    }
    state.qte = null;
  };

  const triggerMassage = () => {
    state.massageCooldown = 12;
    deps.ui.showChoiceBanner('🙋‍♂️ مساج؟', [
      { label: '1) بعد الخط', value: 1 },
      { label: '2) لا يا الحبيب', value: 2 },
      { label: '3) تعال ندف', value: 3 },
    ]);
    state.choicePending = { type: 'massage', timer: 1.2, default: 2 };
    playSfx('boss', -80);
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

  const triggerOoobaaa = () => {
    state.ooobaaaCooldown = 10;
    deps.score.addScore(deps.scoreboard, deps.rules.ooobaaaBonus);
    deps.player.boostSec = Math.max(deps.player.boostSec, 1.4);
    deps.ui.showBanner('🗣️ اوووباااا! +' + deps.rules.ooobaaaBonus, 1.4);
    playSfx('ooobaaa');
    deps.haptics([40, 30, 40]);
  };

  const triggerShalimar = () => {
    if (deps.entities.shalimar.triggered) return;
    deps.entities.shalimar.triggered = true;
    deps.ui.showChoiceBanner('🍽️ شاليمار! وش تختار؟', [
      { label: '1) كبسة', value: 1 },
      { label: '2) برياني', value: 2 },
      { label: '3) مفاجأة', value: 3 },
    ]);
    state.choicePending = { type: 'shalimar', timer: 1.5, default: 2 };
  };

  const resolveShalimar = choice => {
    if (choice === 1) {
      deps.score.addScore(deps.scoreboard, deps.rules.shalimarBoost);
      deps.player.boostSec = Math.max(deps.player.boostSec, 2.5);
      deps.ui.showToast('🍗 كبسة! +' + deps.rules.shalimarBoost);
      playSfx('boost');
    } else if (choice === 2) {
      deps.player.vx *= 0.9;
      deps.ui.showToast('🍛 برياني… ثقلنا شوي');
      playSfx('miss');
    } else {
      if (Math.random() < 0.5) {
        deps.player.nitro += 1;
        deps.ui.showToast('🎁 نيترو إضافي!');
      } else {
        deps.player.boostSec = Math.max(deps.player.boostSec, 1.2);
        deps.ui.showToast('💨 غبرة مجنونة!');
      }
      playSfx('boost', 40);
    }
  };

  const triggerHelicopter = () => {
    if (deps.entities.helicopter.triggered) return;
    deps.entities.helicopter.triggered = true;
    if (Math.random() < 0.5) {
      deps.player.vx += 180;
      deps.player.boostSec = Math.max(deps.player.boostSec, 1.6);
      deps.ui.showBanner('🚁 هليكوبتر — سحب! امسك الحبل', 1.6);
      deps.spawnSand(deps.player.x - 60, deps.player.y - 16, -1);
      playSfx('boost', 40);
    } else {
      deps.player.vx *= 0.8;
      deps.ui.showBanner('🚁 هليكوبتر — غبرة!', 1.6);
      deps.spawnSand(deps.player.x + 60, deps.player.y - 16, 1);
      playSfx('miss', -40);
    }
    deps.haptics([30, 30, 30]);
  };

  const triggerBoss = () => {
    if (deps.entities.boss.triggered) return;
    deps.entities.boss.triggered = true;
    deps.entities.boss.active = true;
    state.bossSequence = ['ArrowUp', 'ArrowLeft', 'ArrowUp'];
    state.bossTimer = 1.5;
    state.invertTimer = 2.2;
    deps.ui.showBanner('🤪 Dumb & Dumber قلبوا الأزرار! نفّذ ↑ ← ↑ بسرعة', 3);
    deps.ui.setHudInvert(true);
    deps.haptics([90, 60, 90]);
    playSfx('boss');
  };

  const handleBossInput = key => {
    if (!deps.entities.boss.active || !state.bossSequence) return;
    const expected = state.bossSequence[0];
    if (key === expected) {
      state.bossSequence.shift();
      playSfx('qteSuccess', 80);
      if (state.bossSequence.length === 0) {
        deps.entities.boss.active = false;
        state.bossSequence = null;
        deps.score.addScore(deps.scoreboard, deps.rules.bossReward);
        deps.player.nitro = Math.max(deps.player.nitro, 1);
        deps.player.winch = Math.max(deps.player.winch, 1);
        deps.scoreboard.achievements.bossSlayer = true;
        deps.ui.showToast(`🤜🤛 هزمتهم! +${deps.rules.bossReward}`);
        playSfx('boost');
      }
    } else {
      deps.entities.boss.active = false;
      state.bossSequence = null;
      deps.score.addScore(deps.scoreboard, -deps.rules.bossPenalty);
      deps.ui.showToast(`🙃 فشل البوس! -${deps.rules.bossPenalty}`);
      playSfx('miss');
    }
  };

  const update = dt => {
    if (state.ooobaaaCooldown > 0) state.ooobaaaCooldown -= dt;
    if (state.massageCooldown > 0) state.massageCooldown -= dt;
    if (state.bossTimer > 0) {
      state.bossTimer -= dt;
      if (state.bossTimer <= 0 && deps.entities.boss.active) {
        deps.entities.boss.active = false;
        state.bossSequence = null;
        deps.score.addScore(deps.scoreboard, -deps.rules.bossPenalty);
        deps.ui.showToast(`⏱️ فاتك البوس! -${deps.rules.bossPenalty}`);
        playSfx('miss');
      }
    }
    if (state.invertTimer > 0) {
      state.invertTimer -= dt;
      if (state.invertTimer <= 0) {
        deps.ui.setHudInvert(false);
      }
    }
    if (state.choicePending) {
      state.choicePending.timer -= dt;
      if (state.choicePending.timer <= 0) {
        const pending = state.choicePending;
        state.choicePending = null;
        handleChoice(pending.default);
      }
    }
    if (state.qte) {
      state.qte.timer -= dt;
      state.qte.progress = Math.max(0, state.qte.progress - dt * 0.12);
      deps.ui.updateQTE(state.qte.progress, state.qte.expect);
      if (state.qte.timer <= 0) {
        endQTE(false);
      }
    }
  };

  const tryStartEvents = (playerX, time) => {
    if (playerX > WORLD_REGIONS.SAND_FROM && playerX < WORLD_REGIONS.SAND_TO && !state.qte && Math.random() < 0.05) {
      startQTE();
    }
    if (playerX > 3200 && state.ooobaaaCooldown <= 0) {
      triggerOoobaaa();
    }
    if (!deps.entities.shalimar.triggered && playerX > WORLD_REGIONS.SHALIMAR_X - 140) {
      triggerShalimar();
    }
    if (state.massageCooldown <= 0 && playerX > 5200 && playerX < 5600) {
      triggerMassage();
    }
    if (time > 30 && time < 45 && !deps.entities.helicopter.triggered) {
      triggerHelicopter();
    }
    if (!deps.entities.boss.triggered && playerX > WORLD_REGIONS.BOSS_X - 120) {
      triggerBoss();
    }
  };

  const handleChoice = choice => {
    deps.ui.hideBanner();
    state.choicePending = null;
    if (deps.entities.shalimar.triggered && !deps.entities.shalimar.resolved) {
      deps.entities.shalimar.resolved = true;
      resolveShalimar(choice);
      return;
    }
    resolveMassage(choice);
  };

  const handleQTEKey = key => {
    if (!state.qte) return;
    if (key === state.qte.expect) {
      state.qte.progress = Math.min(1, state.qte.progress + 0.2);
      state.qte.expect = key === 'KeyK' ? 'KeyL' : 'KeyK';
      deps.ui.updateQTE(state.qte.progress, state.qte.expect);
      playSfx('qteSuccess', 40);
      if (state.qte.progress >= 1) {
        endQTE(true);
      }
    } else {
      state.qte.progress = Math.max(0, state.qte.progress - 0.1);
      playSfx('miss');
      deps.ui.updateQTE(state.qte.progress, state.qte.expect);
    }
  };

  const forceEndQTE = () => endQTE(false);

  const finish = () => {
    deps.ui.showBanner('😂 طبخنا… بس نسينا الملح 🧂', 3.2);
  };

  return {
    update,
    tryStartEvents,
    handleChoice,
    handleQTEKey,
    forceEndQTE,
    finish,
    handleBossInput,
    state,
  };
};
