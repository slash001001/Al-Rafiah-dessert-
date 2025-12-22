import Phaser from 'phaser';
import { VehicleController, CAR_CONSTANTS, sampleSlope } from '../systems/physics.js';
import { createDustSystem, createBoostBurst, createConfettiSystem, createSandstormOverlay } from '../systems/particles.js';
import { AudioManager } from '../systems/audio.js';

const DEG_TO_RAD = Math.PI / 180;

const EVENT_UI_READY = 'level-ready';
const EVENT_UI_HUD = 'level-hud';
const EVENT_UI_TOAST = 'level-toast';
const EVENT_UI_STATUS = 'level-status';
const EVENT_UI_FINISH = 'level-finish';
const EVENT_UI_STORM = 'level-sandstorm';

const EVENT_START = 'ui-start-request';
const EVENT_PAUSE = 'ui-pause-request';
const EVENT_RESTART = 'ui-restart-request';
const EVENT_LANGUAGE = 'ui-language-request';
const EVENT_MODE = 'ui-mode-toggle';
const EVENT_AUDIO = 'ui-audio-toggle';
const EVENT_MOBILE_INPUT = 'ui-mobile-input';
const EVENT_REDUCED_MOTION = 'ui-reduced-motion';

export class LevelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelScene' });
    this.shared = null;
    this.autoStart = false;
  }

  init(data) {
    this.shared = window.RAFIAH_SHARED || this.game.registry.get('shared') || {};
    this.config = this.game.registry.get('config') || this.shared.config || {};
    this.levelData = this.game.registry.get('level-data') || {};
    this.language = this.game.registry.get('language') || this.shared.language || 'ar';
    this.eventsBus = this.shared.events || this.game.events;
    this.autoStart = !!data?.autoStart;
    this.mobileInput = {
      left: false,
      right: false,
      throttle: false,
      brake: false,
      nitro: false,
      reverse: false
    };
    this.isRunning = false;
    this.isPaused = true;
    this.gameFinished = false;
    this.flipTimer = 0;
    this.lastCheckpointIndex = -1;
    this.score = 0;
    this.combo = 0;
    this.lastComboTime = 0;
    this.kettleMeter = 0;
    this.kettleThreshold = 100;
    this.sandstormActive = false;
    this.sandstormRewardPending = false;
    this.survivedSandstorm = false;
    this.crashedDuringStorm = false;
    this.softSandTimer = 0;
  }

  create() {
    const fallbackBg = this.add.rectangle(640, 360, 1280, 720, 0x13212f, 0.65).setDepth(-1000);
    fallbackBg.setData('rafiah-fallback', true);
    const fallbackLabel = this.add.text(24, 24, 'Rafiah Level', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: 20,
      color: '#ffffff'
    }).setDepth(1000);
    console.log('✅ LevelScene create invoked');

    this.setupWorld();
    this.buildParallax();
    this.buildTerrain();
    this.createDecor();
    this.createVehicle();
    this.createCollectibles();
    this.createHazards();
    this.createCheckpoints();
    this.createFinishGate();
    this.createSystems();
    this.registerControls();
    this.registerEvents();
    this.emitUI(EVENT_UI_READY, { paused: true, score: 0 });
    this.pauseSimulation(true);
    this.scheduleSandstorm();
    if (this.autoStart) {
      this.time.delayedCall(200, () => this.handleStart());
    }
    this.time.delayedCall(2500, () => {
      if (fallbackBg.active) {
        fallbackBg.destroy();
      }
      if (fallbackLabel.active) {
        fallbackLabel.destroy();
      }
    });
    console.log('✅ LevelScene systems initialized');
    window.dispatchEvent(new CustomEvent('rafiah-level-ready'));
  }

  setupWorld() {
    this.matter.world.setBounds(0, 0, 3200, 2000);
    this.matter.world.update60Hz();
    this.cameras.main.setBounds(0, 0, 3200, 720);
    this.cameras.main.setBackgroundColor('#F8E9D2');
  }

  buildParallax() {
    const { width, height } = this.scale;
    this.layers = {
      sky: this.add.tileSprite(0, 0, width * 1.2, height * 1.2, 'sky-gradient').setOrigin(0, 0).setScrollFactor(0.2).setDepth(-30),
      mountains: this.add.tileSprite(0, height * 0.25, width * 1.2, 256, 'mountains-back').setOrigin(0, 0.5).setScrollFactor(0.35).setDepth(-20),
      dunes: this.add.tileSprite(0, height * 0.55, width * 1.2, 256, 'dunes-mid').setOrigin(0, 0.5).setScrollFactor(0.6).setDepth(-15),
      foreground: this.add.tileSprite(0, height * 0.75, width * 1.2, 256, 'foreground-details').setOrigin(0, 0.5).setScrollFactor(0.85).setDepth(-5)
    };
  }

  buildTerrain() {
    const points = this.levelData.terrain || [];
    const path = points.reduce((acc, pt) => acc.concat([pt.x, pt.y]), []);
    this.spline = new Phaser.Curves.Spline(path);

    const samples = [];
    const sampleCount = 260;
    for (let i = 0; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      samples.push(this.spline.getPoint(t));
    }
    this.terrainSamples = samples;

    this.drawTerrainSurface(samples);
    this.createTerrainBodies(samples);
  }

  drawTerrainSurface(samples) {
    const g = this.add.graphics();
    g.setDepth(0);
    g.fillStyle(0xE7C590, 1);
    g.beginPath();
    g.moveTo(samples[0].x, samples[0].y);
    samples.forEach(p => g.lineTo(p.x, p.y));
    g.lineTo(samples[samples.length - 1].x, 780);
    g.lineTo(samples[0].x, 780);
    g.closePath();
    g.fillPath();

    g.fillGradientStyle(0xF4C27A, 0xF4C27A, 0xA86B38, 0xA86B38, 0.35, 0.35, 0.6, 0.6);
    g.beginPath();
    g.moveTo(samples[0].x, samples[0].y);
    samples.forEach((p, idx) => {
      const offset = idx % 2 === 0 ? 12 : 24;
      g.lineTo(p.x, p.y + offset);
    });
    g.closePath();
    g.fillPath();
    this.terrainGraphics = g;
  }

  createTerrainBodies(samples) {
    this.terrainSegments = [];
    const softSandRanges = this.levelData.softSand || [];
    for (let i = 0; i < samples.length - 1; i += 1) {
      const p1 = samples[i];
      const p2 = samples[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const centerX = (p1.x + p2.x) / 2;
      const centerY = (p1.y + p2.y) / 2;
      const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(centerX, centerY + 14, length, 60, {
        isStatic: true,
        friction: 0.85,
        frictionStatic: 0.9,
        label: 'terrain'
      });
      Phaser.Physics.Matter.Matter.Body.setAngle(body, angle);

      const segmentIsSoft = softSandRanges.some(range => centerX >= range.from && centerX <= range.to);
      if (segmentIsSoft) {
        body.friction = 1.25;
        body.frictionStatic = 1.35;
        body.softSand = true;
      }

      this.matter.world.add(body);
      this.terrainSegments.push({
        body,
        x1: Math.min(p1.x, p2.x),
        x2: Math.max(p1.x, p2.x),
        slope: dy / dx,
        normal: { x: -dy / length, y: dx / length },
        midY: centerY,
        softSand: segmentIsSoft
      });
    }
  }

  createDecor() {
    this.signs = [];
    const signs = this.levelData.signs || [];
    signs.forEach(sign => {
      const y = this.sampleTerrainY(sign.x) - 90;
      const sprite = this.add.image(sign.x, y, 'sign-panel').setDepth(6);
      sprite.setData('textKey', sign.text_key);
      const text = this.add.text(sign.x, y - 10, this.translate(sign.text_key), {
        fontSize: 18,
        fontFamily: 'system-ui, sans-serif',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(7);
      this.signs.push({ sprite, text });
    });

    this.camels = [];
    (this.levelData.camels || []).forEach((camel, idx) => {
      const sprite = this.add.image(camel.x, camel.y, 'camel-silhouette').setDepth(5);
      sprite.setScrollFactor(camel.parallax ?? 0.85);
      sprite.setAlpha(0.85);
      sprite.play && sprite.play('camel-walk');
      const sensor = Phaser.Physics.Matter.Matter.Bodies.circle(camel.x, this.sampleTerrainY(camel.x) - 40, 70, {
        isSensor: true,
        isStatic: true,
        label: 'camel'
      });
      sensor.camelIndex = idx;
      this.matter.world.add(sensor);
      this.camels.push({ sprite, sensor, hit: false });
    });
  }

  createVehicle() {
    const spawn = this.levelData.spawn || { x: 60, y: 340, vehicle: 'gmc' };
    const textureKey = spawn.vehicle === 'prado' ? 'car-prado' : 'car-gmc';
    this.vehicle = new VehicleController(this, spawn, {
      textureKey,
      nitroConfig: this.config.nitro || {
        durationSec: 1.25,
        cooldownSec: 4,
        boostTorque: 1.65,
        maxSpeedMul: 1.1
      },
      modeConfig: this.config.mode || { familySafe: true }
    });
    this.vehicleSpawn = spawn;
    this.cameras.main.startFollow(this.vehicle.sprite, false, 0.08, 0.12, 0, -120);
  }

  createCollectibles() {
    const coins = this.levelData.coins || [];
    this.coinObjects = [];
    coins.forEach(value => {
      const x = value;
      const ground = this.sampleTerrainY(x);
      const y = ground - 80;
      const body = Phaser.Physics.Matter.Matter.Bodies.circle(x, y, 20, {
        isStatic: true,
        isSensor: true,
        label: 'coin'
      });
      this.matter.world.add(body);
      const sprite = this.add.image(x, y, 'coin-token').setDepth(25);
      this.coinObjects.push({ body, sprite, collected: false });
    });

    this.foodSpots = (this.levelData.food_spots || []).map(spot => {
      const y = this.sampleTerrainY(spot.x) - 50;
      const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(spot.x, y, 80, 60, {
        isStatic: true,
        isSensor: true,
        label: 'food'
      });
      body.foodBrand = spot.brand;
      this.matter.world.add(body);
      const hint = this.add.text(spot.x, y - 40, this.translate(`sign.${spot.brand === 'zad' ? 'zad' : spot.brand}`) || '', {
        fontSize: 16,
        color: '#2E3116',
        backgroundColor: 'rgba(255,255,255,0.25)',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5).setDepth(8);
      return { body, brand: spot.brand, visited: false, hint };
    });
  }

  createHazards() {
    this.dogs = (this.levelData.dogs || []).map((dog, idx) => {
      const sprite = this.add.image(dog.path[0][0], dog.path[0][1], 'dog-runner').setDepth(12);
      sprite.setScale(0.8);
      const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(sprite.x, sprite.y, 120, 60, {
        isStatic: true,
        isSensor: true,
        label: 'dog'
      });
      body.dogIndex = idx;
      this.matter.world.add(body);
      return {
        data: dog,
        sprite,
        body,
        progress: 0,
        direction: 1,
        active: true,
        poofed: false
      };
    });
  }

  createCheckpoints() {
    this.checkpoints = (this.levelData.checkpoints || []).map((x, idx) => {
      const y = this.sampleTerrainY(x) - 100;
      const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(x, y, 40, 180, {
        isStatic: true,
        isSensor: true,
        label: 'checkpoint'
      });
      body.checkpointIndex = idx;
      this.matter.world.add(body);
      const flag = this.add.image(x, y - 30, 'checkpoint-flag').setDepth(12);
      return { x, body, flag, triggered: false };
    });
  }

  createFinishGate() {
    const finish = this.levelData.finish || { x: 2550, y: 320 };
    const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(finish.x, finish.y, 120, 240, {
      isStatic: true,
      isSensor: true,
      label: 'finish'
    });
    this.matter.world.add(body);
    const arch = this.add.graphics();
    arch.setDepth(14);
    arch.lineStyle(12, 0x5E3116, 1);
    arch.strokeRoundedRect(finish.x - 90, finish.y - 180, 180, 200, 28);
    arch.fillStyle(0xF4C27A, 0.3);
    arch.fillRoundedRect(finish.x - 90, finish.y - 180, 180, 200, 28);
    this.finish = { body, arch, x: finish.x, y: finish.y, reached: false };
  }

  createSystems() {
    this.dustSystem = createDustSystem(this);
    this.boostSystem = createBoostBurst(this);
    this.confettiSystem = createConfettiSystem(this);
    this.sandstormOverlay = createSandstormOverlay(this);
    this.audioManager = new AudioManager(this, this.config);
    this.audioManager.init();

    this.hudTimer = 0;

    this.matter.world.on('collisionstart', evt => this.handleCollisions(evt));
  }

  registerControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,S,A,D,SHIFT,SPACE,P');
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  registerEvents() {
    this.eventsBus.on(EVENT_START, this.handleStart, this);
    this.eventsBus.on(EVENT_PAUSE, this.togglePause, this);
    this.eventsBus.on(EVENT_RESTART, this.restartLevel, this);
    this.eventsBus.on(EVENT_LANGUAGE, this.onLanguageChange, this);
    this.eventsBus.on(EVENT_MODE, this.onModeToggle, this);
    this.eventsBus.on(EVENT_AUDIO, this.onAudioToggle, this);
    this.eventsBus.on(EVENT_MOBILE_INPUT, this.onMobileInput, this);
    this.eventsBus.on(EVENT_REDUCED_MOTION, this.onReducedMotion, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupEvents());
  }

  cleanupEvents() {
    this.eventsBus.off(EVENT_START, this.handleStart, this);
    this.eventsBus.off(EVENT_PAUSE, this.togglePause, this);
    this.eventsBus.off(EVENT_RESTART, this.restartLevel, this);
    this.eventsBus.off(EVENT_LANGUAGE, this.onLanguageChange, this);
    this.eventsBus.off(EVENT_MODE, this.onModeToggle, this);
    this.eventsBus.off(EVENT_AUDIO, this.onAudioToggle, this);
    this.eventsBus.off(EVENT_MOBILE_INPUT, this.onMobileInput, this);
    this.eventsBus.off(EVENT_REDUCED_MOTION, this.onReducedMotion, this);
  }

  handleStart = () => {
    if (this.gameFinished) {
      this.restartLevel();
      return;
    }
    this.resumeSimulation();
  };

  onLanguageChange = lang => {
    this.language = lang;
    this.signs.forEach(sign => sign.text.setText(this.translate(sign.text.getData('textKey'))));
  };

  onModeToggle = mode => {
    this.config.mode = { ...this.config.mode, ...mode };
  };

  onAudioToggle = payload => {
    if (!payload) return;
    if (payload.type === 'music') {
      this.audioManager.setMusicEnabled(payload.enabled);
    } else if (payload.type === 'sfx') {
      this.audioManager.setSfxEnabled(payload.enabled);
    }
  };

  onMobileInput = payload => {
    Object.assign(this.mobileInput, payload);
  };

  onReducedMotion = enabled => {
    this.shared.reducedMotion = !!enabled;
  };

  togglePause = () => {
    if (!this.isRunning || this.gameFinished) return;
    if (this.isPaused) {
      this.resumeSimulation();
    } else {
      this.pauseSimulation(false);
    }
  };

  pauseSimulation(initial) {
    this.matter.world.pause();
    this.isPaused = true;
    this.isRunning = !initial;
    this.emitUI(EVENT_UI_STATUS, { paused: true });
  }

  resumeSimulation() {
    this.matter.world.resume();
    this.isPaused = false;
    this.isRunning = true;
    this.gameFinished = false;
    this.emitUI(EVENT_UI_STATUS, { paused: false });
  }

  restartLevel = () => {
    this.scene.restart();
    this.emitUI(EVENT_UI_STATUS, { paused: true });
  };

  update(time, delta) {
    if (!this.vehicle || this.isPaused) {
      return;
    }

    this.updateDogs(delta);
    this.updateSandstorm(delta);

    const input = this.collectInput();
    const terrain = this.sampleTerrainInfo();
    const state = this.vehicle.update(delta, input, terrain);
    this.applySoftSandEffects(terrain, delta);

    this.updateAudio(state, input);
    this.updateParticles(state, input);
    this.checkFlip(delta);
    this.updateCombo(state, delta);
    this.updateKettle(state, delta);
    this.updateHUD(delta, state);
    this.checkFailConditions();

    if (this.finish && !this.finish.reached && this.vehicle.getPosition().x >= this.finish.x) {
      this.handleFinish();
    }
  }

  collectInput() {
    const throttle = this.cursors.up.isDown || this.keys.W.isDown || this.mobileInput.throttle;
    const reverse = this.cursors.down.isDown || this.keys.S.isDown || this.mobileInput.reverse;
    const brake = this.mobileInput.brake || this.keys.SPACE.isDown || this.cursors.down.isDown;
    const left = this.cursors.left.isDown || this.keys.A.isDown || this.mobileInput.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || this.mobileInput.right;
    const nitro = this.keys.SHIFT.isDown || this.mobileInput.nitro;
    return { throttle, reverse, brake, left, right, nitro, handbrake: brake };
  }

  sampleTerrainY(x) {
    if (!this.spline) return 360;
    const last = this.terrainSegments[this.terrainSegments.length - 1];
    if (x >= last.x2) return last.midY;
    const segment = this.terrainSegments.find(seg => x >= seg.x1 && x <= seg.x2) || this.terrainSegments[0];
    const t = (x - segment.x1) / (segment.x2 - segment.x1 || 1);
    const y = segment.body.position.y - Math.tan(Math.atan(segment.slope)) * (segment.body.position.x - x) - 14;
    return y;
  }

  sampleTerrainInfo() {
    const rearX = this.vehicle.rearWheel.position.x;
    const frontX = this.vehicle.frontWheel.position.x;
    const rearGround = this.sampleTerrainY(rearX);
    const frontGround = this.sampleTerrainY(frontX);
    const rearOffset = this.vehicle.rearWheel.position.y - rearGround;
    const frontOffset = this.vehicle.frontWheel.position.y - frontGround;
    const isOnGround = rearOffset < CAR_CONSTANTS.wheelRadius + 8 || frontOffset < CAR_CONSTANTS.wheelRadius + 8;
    const segment = sampleSlope(this.terrainSegments, (rearX + frontX) / 2) || { slope: 0, normal: { x: 0, y: -1 }, softSand: false };
    return {
      slope: Math.atan(segment.slope),
      normal: segment.normal,
      isOnGround,
      softSand: segment.softSand
    };
  }

  applySoftSandEffects(terrain, delta) {
    if (!terrain.softSand) {
      this.softSandTimer = Math.max(0, this.softSandTimer - delta / 1000);
      return;
    }

    this.softSandTimer += delta / 1000;
    const dragForce = 0.002 * Math.sign(this.vehicle.chassis.velocity.x);
    Phaser.Physics.Matter.Matter.Body.applyForce(this.vehicle.chassis, this.vehicle.chassis.position, {
      x: -dragForce,
      y: 0
    });
  }

  updateAudio(state, input) {
    const skidIntensity = this.vehicle.handbrakeTimer > 0 ? 1 : Math.min(1, Math.abs(this.vehicle.chassis.angularVelocity) * 0.3);
    this.audioManager.updateEngine({
      speed: state.speed,
      throttle: input.throttle ? 1 : 0,
      nitroActive: this.vehicle.nitro.active,
      skidIntensity
    });
  }

  updateParticles(state, input) {
    if (input.throttle && state.airborne === false) {
      const wheel = this.vehicle.rearWheel.position;
      this.dustSystem.emit(wheel.x, wheel.y + CAR_CONSTANTS.wheelRadius, Math.min(1.5, state.speed / 6));
    }
    if (this.vehicle.nitro.active) {
      const pos = this.vehicle.chassis.position;
      this.boostSystem.fire(pos.x - 80, pos.y + 30);
    }
  }

  updateDogs(delta) {
    this.dogs.forEach(dog => {
      if (!dog.active) return;
      const [a, b] = dog.data.path;
      const segmentLength = Phaser.Math.Distance.Between(a[0], a[1], b[0], b[1]);
      const step = (dog.data.speed * delta / 1000) / segmentLength;
      dog.progress += step * dog.direction;
      if (dog.progress >= 1) {
        dog.progress = 1;
        dog.direction = -1;
      } else if (dog.progress <= 0) {
        dog.progress = 0;
        dog.direction = 1;
      }
      const x = Phaser.Math.Linear(a[0], b[0], dog.progress);
      const y = Phaser.Math.Linear(a[1], b[1], dog.progress);
      dog.sprite.setPosition(x, y);
      Phaser.Physics.Matter.Matter.Body.setPosition(dog.body, { x, y });
      if (!dog.poofed && Phaser.Math.FloatBetween(0, 1) < 0.005) {
        this.audioManager.playDogBark();
      }
    });
  }

  updateSandstorm(delta) {
    if (!this.sandstormActive) return;
    const windForce = this.sandstormWind;
    Phaser.Physics.Matter.Matter.Body.applyForce(this.vehicle.chassis, this.vehicle.chassis.position, {
      x: windForce,
      y: 0
    });
    Phaser.Physics.Matter.Matter.Body.applyForce(this.vehicle.frontWheel, this.vehicle.frontWheel.position, {
      x: windForce * 0.8,
      y: 0
    });
    Phaser.Physics.Matter.Matter.Body.applyForce(this.vehicle.rearWheel, this.vehicle.rearWheel.position, {
      x: windForce * 1.1,
      y: 0
    });
  }

  scheduleSandstorm() {
    const config = this.config.sandstorm || { enabled: true, minSec: 25, maxSec: 45, durationSec: 4 };
    if (!config.enabled) return;
    const min = Math.max(5, config.minSec);
    const max = Math.max(min + 5, config.maxSec);
    const delay = Phaser.Math.Between(min * 1000, max * 1000);
    this.time.delayedCall(delay, () => this.startSandstorm(config.durationSec), null, this);
  }

  startSandstorm(duration) {
    if (this.sandstormActive) return;
    this.sandstormActive = true;
    this.sandstormElapsed = 0;
    this.sandstormDuration = duration;
    this.sandstormWind = Phaser.Math.Between(0, 1) === 0 ? -0.0015 : 0.0015;
    this.sandstormRewardPending = true;
    this.survivedSandstorm = false;
    this.crashedDuringStorm = false;
    this.sandstormOverlay.activate();
    this.audioManager.sandstormState(true);
    this.emitUI(EVENT_UI_TOAST, { key: 'toast.sandstorm' });
    this.emitUI(EVENT_UI_STORM, { active: true });
    this.time.delayedCall(duration * 1000, () => this.endSandstorm(), null, this);
  }

  endSandstorm() {
    this.sandstormActive = false;
    this.sandstormOverlay.deactivate();
    this.audioManager.sandstormState(false);
    this.emitUI(EVENT_UI_TOAST, { key: 'toast.stormClear' });
    this.emitUI(EVENT_UI_STORM, { active: false });
    if (this.sandstormRewardPending && !this.crashedDuringStorm) {
      this.score += 30;
      this.survivedSandstorm = true;
      this.emitUI(EVENT_UI_TOAST, { text: '+30' });
    }
    this.sandstormRewardPending = false;
  }

  updateCombo(state, delta) {
    if (state.comboEligible) {
      this.combo += 1;
      const bonus = 15 + Math.max(0, this.combo - 1) * 10;
      this.score += bonus;
      this.emitUI(EVENT_UI_TOAST, { text: `+${bonus}` });
      this.lastComboTime = 0;
    } else {
      this.lastComboTime += delta / 1000;
      if (this.lastComboTime > 6) {
        this.combo = 0;
      }
    }
  }

  updateKettle(state, delta) {
    if (state.hardLanding) {
      this.kettleMeter += 35;
      if (this.kettleMeter >= this.kettleThreshold) {
        this.kettleMeter = 20;
        this.score = Math.max(0, this.score - 10);
        this.audioManager.playSfx('kettle');
        this.emitUI(EVENT_UI_TOAST, { key: 'toast.kettle' });
        this.emitUI(EVENT_UI_HUD, this.composeHud(state));
      }
    } else {
      this.kettleMeter = Math.max(0, this.kettleMeter - delta * 0.01);
    }
  }

  updateHUD(delta, state) {
    this.hudTimer += delta;
    if (this.hudTimer < 200) return;
    this.emitUI(EVENT_UI_HUD, this.composeHud(state));
    this.hudTimer = 0;
  }

  composeHud(state) {
    return {
      speed: state.kmh,
      nitro: {
        active: this.vehicle.nitro.active,
        timer: this.vehicle.nitro.timer,
        cooldown: this.vehicle.nitro.cooldown,
        duration: this.vehicle.nitroConfig?.durationSec ?? (this.config.nitro?.durationSec || 1.25)
      },
      score: this.score,
      combo: this.combo,
      kettle: this.kettleMeter / this.kettleThreshold
    };
  }

  checkFlip(delta) {
    const angle = Math.abs(Phaser.Math.RadToDeg(this.vehicle.chassis.angle));
    if (angle > 95) {
      this.flipTimer += delta / 1000;
      if (this.flipTimer > 1.2) {
        this.triggerRespawn();
      }
    } else {
      this.flipTimer = 0;
    }
  }

  checkFailConditions() {
    const pos = this.vehicle.getPosition();
    if (pos.y > 900) {
      this.triggerRespawn();
    }
  }

  triggerRespawn() {
    const checkpoint = this.checkpoints[this.lastCheckpointIndex];
    const spawn = checkpoint ? { x: checkpoint.x, y: this.sampleTerrainY(checkpoint.x) - 40 } : this.vehicleSpawn;
    this.resetVehicleTo(spawn);
    this.combo = 0;
    if (this.sandstormActive) {
      this.crashedDuringStorm = true;
    }
  }

  resetVehicleTo(spawn) {
    const offsetY = -20;
    const { chassis, frontWheel, rearWheel } = this.vehicle;
    Phaser.Physics.Matter.Matter.Body.setPosition(chassis, { x: spawn.x, y: spawn.y + offsetY });
    Phaser.Physics.Matter.Matter.Body.setVelocity(chassis, { x: 0, y: 0 });
    Phaser.Physics.Matter.Matter.Body.setAngle(chassis, 0);
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(chassis, 0);

    Phaser.Physics.Matter.Matter.Body.setPosition(frontWheel, { x: spawn.x + CAR_CONSTANTS.wheelbase / 2, y: spawn.y + 20 });
    Phaser.Physics.Matter.Matter.Body.setVelocity(frontWheel, { x: 0, y: 0 });
    Phaser.Physics.Matter.Matter.Body.setAngle(frontWheel, 0);
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(frontWheel, 0);

    Phaser.Physics.Matter.Matter.Body.setPosition(rearWheel, { x: spawn.x - CAR_CONSTANTS.wheelbase / 2, y: spawn.y + 20 });
    Phaser.Physics.Matter.Matter.Body.setVelocity(rearWheel, { x: 0, y: 0 });
    Phaser.Physics.Matter.Matter.Body.setAngle(rearWheel, 0);
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(rearWheel, 0);
  }

  handleCollisions(event) {
    event.pairs.forEach(pair => {
      const bodies = [pair.bodyA, pair.bodyB];
      const labels = bodies.map(body => body.label);
      if (labels.includes('coin')) {
        this.resolveCoin(bodies.find(b => b.label === 'coin'));
      } else if (labels.includes('checkpoint')) {
        this.resolveCheckpoint(bodies.find(b => b.label === 'checkpoint'));
      } else if (labels.includes('finish')) {
        this.handleFinish();
      } else if (labels.includes('food')) {
        this.resolveFoodSpot(bodies.find(b => b.label === 'food'));
      } else if (labels.includes('dog')) {
        this.resolveDogHit(bodies.find(b => b.label === 'dog'));
      } else if (labels.includes('camel')) {
        this.resolveCamelHit();
      }
    });
  }

  resolveCoin(body) {
    const coin = this.coinObjects.find(c => c.body === body && !c.collected);
    if (!coin) return;
    coin.collected = true;
    this.score += 10;
    this.audioManager.playCoin();
    coin.sprite.destroy();
    this.matter.world.remove(coin.body);
    this.emitUI(EVENT_UI_HUD, this.composeHud({ kmh: 0 }));
  }

  resolveCheckpoint(body) {
    const idx = body.checkpointIndex;
    if (typeof idx !== 'number') return;
    if (this.lastCheckpointIndex === idx) return;
    this.lastCheckpointIndex = idx;
    this.score += 15;
    this.emitUI(EVENT_UI_TOAST, { key: 'toast.checkpoint' });
    this.audioManager.playCheckpoint();
    const checkpoint = this.checkpoints[idx];
    checkpoint.flag.setTint(0x2E86AB);
  }

  resolveFoodSpot(body) {
    const spot = this.foodSpots.find(s => s.body === body);
    if (!spot || spot.visited) return;
    spot.visited = true;
    let bonus = 10;
    if (spot.brand === 'shalimar' || spot.brand === 'albaik') bonus = 20;
    this.score += bonus;
    this.audioManager.playFood(spot.brand);
    this.emitUI(EVENT_UI_TOAST, { key: `toast.food.${spot.brand}` });
  }

  resolveDogHit(body) {
    const dog = this.dogs.find(d => d.body === body);
    if (!dog || dog.poofed) return;
    const speed = Math.hypot(this.vehicle.chassis.velocity.x, this.vehicle.chassis.velocity.y);
    if (this.config.mode?.familySafe !== false) {
      dog.poofed = true;
      dog.sprite.setVisible(false);
      this.matter.world.remove(dog.body);
      this.score += 10;
      this.audioManager.playDogBark();
      this.dustSystem.emit(dog.sprite.x, dog.sprite.y, 1.2);
    } else {
      if (speed > 7) {
        this.confettiSystem.celebrate(dog.sprite.x, dog.sprite.y - 20);
        this.score += 5;
      } else {
        Phaser.Physics.Matter.Matter.Body.applyForce(this.vehicle.chassis, this.vehicle.chassis.position, {
          x: -Math.sign(this.vehicle.chassis.velocity.x) * 0.002,
          y: -0.0005
        });
      }
      this.audioManager.playDogBark();
    }
  }

  resolveCamelHit() {
    this.triggerRespawn();
  }

  handleFinish() {
    if (this.gameFinished) return;
    this.gameFinished = true;
    this.pauseSimulation(false);
    this.finish.reached = true;
    this.score += 100;
    const rank = this.calculateRank(this.score);
    this.confettiSystem.celebrate(this.finish.x, this.finish.y - 100);
    this.audioManager.playSfx('cheer');
    this.emitUI(EVENT_UI_TOAST, { key: 'finish.text' });
    this.emitUI(EVENT_UI_FINISH, { score: this.score, rank });
    if (this.score >= 180) {
      this.shared.unlockedVehicles?.add?.('prado');
      this.emitUI(EVENT_UI_TOAST, { key: 'toast.unlock.prado' });
    }
    this.time.delayedCall(450, () => {
      this.scene.stop('UIScene');
      this.scene.start('WinScene', { score: this.score, rank });
    });
  }

  calculateRank(score) {
    if (score >= 220) return 'S';
    if (score >= 180) return 'A';
    if (score >= 140) return 'B';
    return 'C';
  }

  emitUI(event, payload) {
    if (!this.eventsBus || !event) return;
    this.eventsBus.emit(event, payload);
  }

  translate(key) {
    const map = this.cache.json.get(`i18n-${this.language}`) || {};
    if (!key) return '';
    const value = map[key];
    return typeof value === 'string' ? value : key;
  }

  destroy() {
    this.cleanupEvents();
    this.dustSystem?.destroy();
    this.boostSystem?.destroy();
    this.confettiSystem?.destroy();
    this.sandstormOverlay?.destroy();
    this.audioManager?.destroy();
  }
}

export default LevelScene;
