import Phaser from 'phaser';

const STORAGE_KEYS = {
  best: 'rafiah-best-time',
  muted: 'rafiah-muted'
};

const WORLD = {
  width: 3600,
  height: 1080
};

const PHYS = {
  accel: 160,
  brake: 220,
  drag: 0.9,
  maxSpeed: 420,
  boostPower: 240,
  boostDuration: 0.8,
  boostCooldown: 3,
  baseTurn: 2.2,
  turnBySpeed: 2.6
};

const COLORS = {
  sand: 0xf2d7a6,
  dune: 0xe4c48e,
  sky: 0x0f1720,
  accent: 0x2e86ab,
  text: '#0f1720'
};

function readMute() {
  try {
    return localStorage.getItem(STORAGE_KEYS.muted) === '1';
  } catch {
    return false;
  }
}

function writeMute(value) {
  try {
    localStorage.setItem(STORAGE_KEYS.muted, value ? '1' : '0');
  } catch (e) {
    console.warn('mute persist failed', e);
  }
}

function readBest() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.best);
    return v ? parseFloat(v) : null;
  } catch {
    return null;
  }
}

function writeBest(timeSec) {
  try {
    localStorage.setItem(STORAGE_KEYS.best, timeSec.toFixed(2));
  } catch (e) {
    console.warn('best persist failed', e);
  }
}

function playBeep(freq = 440, duration = 0.12, muted = false) {
  if (muted) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = playBeep.ctx || new AC();
    playBeep.ctx = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Ignore audio init errors
    console.warn('beep failed', err);
  }
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.addGradientBG();
    this.add.text(width / 2, height / 2 - 140, 'Rafiah Sand Dunes', {
      fontSize: 52,
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 70, 'Pro Mode — smooth driving & dunes', {
      fontSize: 20,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    const startText = this.makeButton(width / 2, height / 2 + 30, '▶ Start', () => {
      playBeep(520, 0.08, readMute());
      this.scene.start('PlayScene');
    });

    this.input.keyboard.once('keydown-SPACE', () => startText.emit('pointerdown'));
    this.input.keyboard.once('keydown-ENTER', () => startText.emit('pointerdown'));
  }

  addGradientBG() {
    const g = this.add.graphics();
    const { width, height } = this.scale;
    g.fillStyle(COLORS.sky, 1);
    g.fillRect(0, 0, width, height);
    g.fillGradientStyle(COLORS.sand, COLORS.sand, COLORS.dune, COLORS.dune, 0.18, 0.18, 0.8, 0.8);
    g.fillRect(0, height * 0.55, width, height * 0.45);
  }

  makeButton(x, y, label, handler) {
    const btn = this.add.text(x, y, label, {
      fontSize: 32,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', handler);
    return btn;
  }
}

class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
    this.player = null;
    this.speed = 0;
    this.angle = 0;
    this.cursors = null;
    this.keys = null;
    this.finishX = WORLD.width - 180;
    this.obstacles = [];
    this.hud = {};
    this.timer = { start: 0, elapsed: 0, best: readBest() };
    this.boost = { active: false, timer: 0, cooldown: 0 };
    this.muted = readMute();
    this.paused = false;
    this.finished = false;
    this.trail = null;
  }

  preload() {
    this.generateTextures();
  }

  generateTextures() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(COLORS.accent, 1);
    g.fillRoundedRect(0, 0, 48, 28, 6);
    g.generateTexture('player-body', 48, 28);
    g.clear();
    g.fillStyle(0x996633, 1);
    g.fillCircle(0, 0, 10);
    g.generateTexture('rock', 20, 20);
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('sand-dust', 8, 8);
    g.clear();
    g.fillStyle(0xf4c27a, 1);
    g.fillRect(0, 0, 120, 12);
    g.generateTexture('finish', 120, 12);
    g.clear();
    g.fillStyle(0x152033, 1);
    g.fillRect(0, 0, 512, 128);
    g.fillStyle(0x20314a, 1);
    for (let i = 0; i < 16; i += 1) {
      const x = i * 32;
      g.fillTriangle(x, 128, x + 24, 64, x + 48, 128);
    }
    g.generateTexture('para-far', 512, 128);
    g.clear();
    g.fillStyle(0x2a3d5c, 1);
    g.fillRect(0, 0, 512, 180);
    g.fillStyle(0x334b6e, 1);
    for (let i = 0; i < 10; i += 1) {
      const x = i * 52;
      g.fillTriangle(x, 180, x + 40, 100, x + 80, 180);
    }
    g.generateTexture('para-mid', 512, 180);
    g.destroy();
  }

  create() {
    const { width, height } = this.scale;
    this.timer.start = this.time.now;
    this.speed = 0;
    this.angle = 0;
    this.paused = false;
    this.finished = false;
    this.boost = { active: false, timer: 0, cooldown: 0 };

    this.createBackground();
    this.player = this.physics.add.sprite(140, height / 2, 'player-body');
    this.player.body.setSize(48, 28);
    this.player.setOrigin(0.5);
    this.player.body.collideWorldBounds = true;

    this.createObstacles();
    this.createFinish();
    this.createParticles();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,ESC');

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(width * 0.2, height * 0.2);
    this.cameras.main.setFollowOffset(0, -40);

    this.createHUD();
    this.createPauseOverlay();

    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.physics.add.overlap(this.player, this.finishZone, () => this.handleFinish(), undefined, this);
    this.obstaclesGroup.children.iterate((rock) => {
      this.physics.add.overlap(this.player, rock, () => this.onHitObstacle(rock), undefined, this);
    });

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  createBackground() {
    const { width, height } = this.scale;
    const sky = this.add.rectangle(0, 0, WORLD.width, WORLD.height, COLORS.sky).setOrigin(0, 0);
    sky.setScrollFactor(0);
    this.back1 = this.add.tileSprite(0, height * 0.25, WORLD.width, 180, 'para-far').setOrigin(0, 0.5);
    this.back1.setScrollFactor(0.2);
    this.back2 = this.add.tileSprite(0, height * 0.55, WORLD.width, 200, 'para-mid').setOrigin(0, 0.5);
    this.back2.setScrollFactor(0.4);
  }

  createObstacles() {
    this.obstaclesGroup = this.physics.add.staticGroup();
    const count = 10;
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.Between(400, WORLD.width - 400);
      const y = Phaser.Math.Between(260, WORLD.height - 260);
      const rock = this.physics.add.staticSprite(x, y, 'rock');
      rock.body.setCircle(10);
      this.obstaclesGroup.add(rock);
    }
  }

  createFinish() {
    const { height } = this.scale;
    this.finishZone = this.physics.add.staticSprite(this.finishX, height / 2, 'finish');
    this.finishZone.setSize(120, WORLD.height);
    this.finishGate = this.add.rectangle(this.finishX, height / 2, 40, WORLD.height, 0xffffff, 0.12);
    this.finishGate.setStrokeStyle(3, COLORS.accent, 0.8);
  }

  createParticles() {
    this.trail = this.add.particles(this.player.x, this.player.y, 'sand-dust', {
      speed: { min: 10, max: 40 },
      lifespan: { min: 180, max: 320 },
      alpha: { start: 0.6, end: 0 },
      scale: { start: 1, end: 0 },
      quantity: 2,
      follow: this.player,
      followOffset: { x: -20, y: 8 }
    });
  }

  createHUD() {
    this.hud.speed = this.add.text(18, 16, 'Speed: 0', this.hudStyle()).setScrollFactor(0);
    this.hud.dist = this.add.text(18, 46, 'Distance: 0', this.hudStyle()).setScrollFactor(0);
    this.hud.timer = this.add.text(18, 76, 'Time: 0.00', this.hudStyle()).setScrollFactor(0);
    this.hud.best = this.add.text(18, 106, `Best: ${this.timer.best ?? '--'}`, this.hudStyle()).setScrollFactor(0);
    this.hud.mute = this.add.text(this.scale.width - 18, 16, this.muted ? 'Muted' : 'Sound On', this.hudStyle())
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleMute());
  }

  createPauseOverlay() {
    const { width, height } = this.scale;
    this.pauseOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(1000).setVisible(false);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    const panel = this.add.rectangle(width / 2, height / 2, 360, 240, 0xffffff, 0.92)
      .setStrokeStyle(3, COLORS.accent, 0.9);
    const resumeBtn = this.makeButton(width / 2, height / 2 - 50, 'Resume', () => this.setPaused(false));
    const restartBtn = this.makeButton(width / 2, height / 2 + 10, 'Restart', () => this.restartRun());
    const muteBtn = this.makeButton(width / 2, height / 2 + 70, this.muted ? 'Unmute' : 'Mute', () => {
      this.toggleMute();
      muteBtn.setText(this.muted ? 'Unmute' : 'Mute');
    });
    this.pauseOverlay.add([bg, panel, resumeBtn, restartBtn, muteBtn]);
  }

  makeButton(x, y, label, handler) {
    const btn = this.add.text(x, y, label, {
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 14, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', handler);
    return btn;
  }

  hudStyle() {
    return {
      fontSize: 18,
      fontFamily: 'system-ui, sans-serif',
      color: '#0f1720',
      backgroundColor: 'rgba(255,255,255,0.7)',
      padding: { x: 8, y: 4 }
    };
  }

  toggleMute() {
    this.muted = !this.muted;
    this.hud.mute.setText(this.muted ? 'Muted' : 'Sound On');
    writeMute(this.muted);
  }

  setPaused(state) {
    this.paused = state;
    this.physics.world.isPaused = state;
    this.pauseOverlay.setVisible(state);
  }

  restartRun() {
    this.scene.restart();
  }

  onHitObstacle(rock) {
    this.speed *= 0.5;
    this.cameras.main.shake(120, 0.003);
    this.trail.explode(12, rock.x, rock.y);
    playBeep(260, 0.08, this.muted);
  }

  handleFinish() {
    if (this.finished) return;
    this.finished = true;
    const elapsedSec = (this.time.now - this.timer.start) / 1000;
    if (!this.timer.best || elapsedSec < this.timer.best) {
      writeBest(elapsedSec);
      this.timer.best = elapsedSec;
    }
    this.cameras.main.shake(150, 0.004);
    this.cameras.main.fadeOut(220, 0, 0, 0, () => {
      this.scene.start('WinScene', { time: elapsedSec, best: this.timer.best });
    });
    playBeep(720, 0.12, this.muted);
  }

  update(time, delta) {
    if (!this.player) return;
    const dt = delta / 1000;
    if (this.keys.ESC.isDown) this.setPaused(true);
    if (this.paused) return;

    const throttle = this.cursors.up.isDown || this.keys.W.isDown;
    const brake = this.cursors.down.isDown || this.keys.S.isDown;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const boostRequest = this.keys.SPACE.isDown || this.cursors.space?.isDown;

    this.updateBoost(dt, boostRequest);
    this.applyDriving(throttle, brake, left, right, dt);
    this.updateCameraParallax();
    this.updateHUD();
    if (this.player.x >= this.finishX - 40) {
      this.handleFinish();
    }
  }

  updateBoost(dt, request) {
    if (this.boost.cooldown > 0) this.boost.cooldown = Math.max(0, this.boost.cooldown - dt);
    if (this.boost.active) {
      this.boost.timer -= dt;
      if (this.boost.timer <= 0) {
        this.boost.active = false;
        this.boost.cooldown = PHYS.boostCooldown;
      }
    } else if (request && this.boost.cooldown <= 0) {
      this.boost.active = true;
      this.boost.timer = PHYS.boostDuration;
      playBeep(600, 0.08, this.muted);
    }
  }

  applyDriving(throttle, brake, left, right, dt) {
    // Dune factor
    const wave = Math.sin((this.player.x + this.time.now * 0.05) * 0.002) * 0.6
      + Math.sin((this.player.y + this.time.now * 0.07) * 0.0015) * 0.4;
    const duneScalar = Phaser.Math.Linear(0.85, 1.05, (wave + 1) / 2);

    const accel = (throttle ? PHYS.accel : 0) + (this.boost.active ? PHYS.boostPower : 0);
    const brakeForce = brake ? PHYS.brake : 0;

    this.speed += (accel - brakeForce - PHYS.drag * this.speed) * dt;
    this.speed = Phaser.Math.Clamp(this.speed, 0, PHYS.maxSpeed * duneScalar);

    const speedNorm = this.speed / PHYS.maxSpeed;
    const steerInput = (left ? -1 : 0) + (right ? 1 : 0);
    const turnRate = (PHYS.baseTurn + PHYS.turnBySpeed * speedNorm) * dt;
    if (steerInput !== 0 && this.speed > 10) {
      this.angle += steerInput * turnRate;
    }

    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.player.body.velocity.x = vx;
    this.player.body.velocity.y = vy;
    this.player.rotation = this.angle;

    this.trail.setQuantity(Phaser.Math.Clamp(speedNorm * 12, 2, 14));
    this.cameras.main.setFollowOffset(0, -40 + wave * 20);
  }

  updateCameraParallax() {
    const cam = this.cameras.main;
    this.back1.tilePositionX = cam.scrollX * 0.3;
    this.back2.tilePositionX = cam.scrollX * 0.6;
  }

  updateHUD() {
    this.timer.elapsed = (this.time.now - this.timer.start) / 1000;
    const distLeft = Math.max(0, this.finishX - this.player.x);
    this.hud.speed.setText(`Speed: ${Math.round(this.speed)}`);
    this.hud.dist.setText(`Distance: ${Math.round(distLeft)}m`);
    this.hud.timer.setText(`Time: ${this.timer.elapsed.toFixed(2)}s`);
    this.hud.best.setText(`Best: ${this.timer.best ? this.timer.best.toFixed(2) : '--'}`);
  }
}

class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  init(data) {
    this.timeSec = data?.time ?? 0;
    this.bestSec = data?.best ?? null;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.add.text(width / 2, height / 2 - 100, 'You Conquered the Dunes!', {
      fontSize: 42,
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 30, `Time: ${this.timeSec.toFixed(2)}s`, {
      fontSize: 28,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, `Best: ${this.bestSec ? this.bestSec.toFixed(2) : '--'}s`, {
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    const restart = this.makeButton(width / 2, height / 2 + 90, '↻ Restart', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown-SPACE', () => restart.emit('pointerdown'));
    this.input.keyboard.once('keydown-ENTER', () => restart.emit('pointerdown'));
  }

  makeButton(x, y, label, handler) {
    const btn = this.add.text(x, y, label, {
      fontSize: 28,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 16, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', handler);
    return btn;
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 576,
  backgroundColor: COLORS.sky,
  parent: document.body,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MenuScene, PlayScene, WinScene]
};

new Phaser.Game(config);
