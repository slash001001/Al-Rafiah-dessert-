import { PX_PER_METER, DEFAULT_SAND_PHYSICS, tractionFromSlope } from './physics_utils.js';
import { clamp, smoothValue, cameraOffsetStep, playbackRateFromAcceleration, volumeFromAcceleration, applyDeadZone } from './stabilization_utils.js';
import { storeCheckpoint, loadCheckpoint, clearCheckpoint, completedCheckpointIds } from './checkpoint_store.js';

const PhaserLib = window.Phaser;

if (!PhaserLib) {
  throw new Error('Phaser library is required before loading SandDunesScene.');
}

const MatterLib = PhaserLib.Physics.Matter.Matter;
const { Bodies, Body, Constraint } = MatterLib;

const SAND_PHYSICS = {
  ...DEFAULT_SAND_PHYSICS,
  wheelSinkLimit: 0.4,
};

const ENGINE_FORCE = 0.00046;
const BRAKE_FORCE = 0.00038;
const DRAG_COEFFICIENT = 0.00022;
const GAMEPAD_DEADZONE = 0.15;

export class SandDunesScene extends PhaserLib.Scene {
  constructor() {
    super({ key: 'SandDunesScene' });
    this.terrainProfile = [];
    this.terrainSegments = [];
    this.segmentLookup = [];
    this.checkpoints = [];
    this.checkpointHits = new Set();
    this.currentTraction = 1;
    this.tractionTarget = 1;
    this.progress = 0;
    this.elapsed = 0;
    this.cameraRig = {
      offsetY: -140,
      targetOffsetY: -140,
      zoom: 1.05,
      targetZoom: 1.05,
    };
    this.audio = null;
    this.lastVelocity = { x: 0, y: 0 };
    this.flags = {
      enableSandTuning: true,
      enableCameraLerp: true,
      enableCheckpointLite: true,
      enableAudioTorqueSync: true,
      enablePerfOverlay: true,
    };
    this.perfSamples = [];
    this.activeCheckpoint = null;
    this.inputAnalog = {
      accelerate: 0,
      reverse: 0,
      brake: 0,
    };
  }

  preload() {
    this.load.json('sand-dunes-terrain', new URL('./terrain_config.json', import.meta.url).href);
    this.load.json('sand-dunes-vehicle', new URL('./vehicle_config.json', import.meta.url).href);
  }

  create() {
    this.terrainSpec = this.cache.json.get('sand-dunes-terrain') ?? { dunes: [], checkpoints: [] };
    this.vehicleSpec = this.cache.json.get('sand-dunes-vehicle') ?? {};
    this.scale.lockOrientation?.('landscape');

    const registryFlags = this.registry?.get?.('rafiyah-flags');
    if (registryFlags) {
      this.flags = { ...this.flags, ...registryFlags };
    }

    this.setupWorld();
    this.buildBackground();
    this.generateTerrainProfile();
    this.createTerrain();
    this.createCheckpoints();
    this.createVehicle();
    this.restoreCheckpointProgress();
    this.createHUD();
    this.initPerfOverlay();
    this.initAudio();
    this.registerInput();
    this.registerCollisions();
  }

  setupWorld() {
    this.matter.world.setGravity(0, SAND_PHYSICS.gravityY / 1000);
    this.cameras.main.setBackgroundColor('#d6effb');
  }

  buildBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xeaf7ff, 0xeaf7ff, 0xbfe6fa, 0xbfe6fa, 1, 1, 1, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);

    const sun = this.add.circle(width * 0.8, height * 0.18, Math.min(width, height) * 0.12, 0xfff4d4, 0.9);
    sun.setDepth(-9);

    this.ambientGlow = this.add.rectangle(width / 2, height, width * 1.7, height * 0.8, 0xfad9a0, 0.12)
      .setOrigin(0.5, 1)
      .setDepth(-8);
  }

  generateTerrainProfile() {
    const baseY = this.scale.height * 0.78;
    const dunes = Array.isArray(this.terrainSpec.dunes) ? this.terrainSpec.dunes : [];
    const points = [];
    const segmentMeta = [];

    let cursorX = 0;
    points.push({ x: cursorX, y: baseY });

    dunes.forEach((dune, index) => {
      const heightMeters = PhaserLib.Math.Clamp(
        (dune?.heightMeters ?? PhaserLib.Math.FloatBetween(1.4, 3.6)) +
          PhaserLib.Math.FloatBetween(-0.35, 0.35),
        1,
        4.5
      );
      const heightPx = heightMeters * PX_PER_METER;
      const lengthMeters = dune?.lengthMeters ?? PhaserLib.Math.FloatBetween(32, 52);
      const lengthPx = lengthMeters * PX_PER_METER;

      const riseEndX = cursorX + lengthPx * 0.4;
      const crestX = cursorX + lengthPx * 0.55;
      const fallEndX = cursorX + lengthPx;

      const risePeakY = baseY - heightPx;
      const crestY = baseY - heightPx * 0.85;
      const fallBaseY = baseY - heightPx * 0.25;

      points.push({ x: riseEndX, y: risePeakY });
      points.push({ x: crestX, y: crestY });
      points.push({ x: fallEndX, y: fallBaseY });

      segmentMeta.push({
        id: `dune-${index + 1}`,
        crestX,
      });

      cursorX = fallEndX;
    });

    this.trackEndX = cursorX + 500;
    points.push({ x: this.trackEndX, y: baseY });
    points.push({ x: this.trackEndX + 200, y: baseY + 160 });

    this.terrainProfile = points;
    this.segmentLookup = segmentMeta;
    this.baseY = baseY;
  }

  createTerrain() {
    const terrainGfx = this.add.graphics();
    terrainGfx.fillStyle(0xf7e2b5, 1);
    terrainGfx.beginPath();
    terrainGfx.moveTo(this.terrainProfile[0].x, this.baseY + 320);
    this.terrainProfile.forEach(p => terrainGfx.lineTo(p.x, p.y));
    terrainGfx.lineTo(this.terrainProfile[this.terrainProfile.length - 1].x, this.baseY + 320);
    terrainGfx.closePath();
    terrainGfx.fillPath();

    terrainGfx.lineStyle(10, 0xe8a15e, 0.6);
    terrainGfx.beginPath();
    this.terrainProfile.forEach((p, idx) => {
      if (idx === 0) {
        terrainGfx.moveTo(p.x, p.y);
      } else {
        terrainGfx.lineTo(p.x, p.y);
      }
    });
    terrainGfx.strokePath();
    terrainGfx.setDepth(-5);

    const shade = this.add.graphics();
    shade.fillGradientStyle(0xd48c53, 0xf7e2b5, 0xf3d29a, 0xe8a15e, 0.16, 0.05, 0.05, 0.18);
    shade.beginPath();
    shade.moveTo(this.terrainProfile[0].x, this.baseY + 280);
    this.terrainProfile.forEach(p => shade.lineTo(p.x, p.y - 12));
    shade.lineTo(this.terrainProfile[this.terrainProfile.length - 1].x, this.baseY + 280);
    shade.closePath();
    shade.fillPath();
    shade.setDepth(-4);

    const segments = [];
    for (let i = 0; i < this.terrainProfile.length - 1; i++) {
      const start = this.terrainProfile[i];
      const end = this.terrainProfile[i + 1];
      if (start.x === end.x) continue;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const height = 600;
      const centerX = start.x + dx / 2;
      const centerY = (start.y + end.y) / 2 + height / 2;

      const body = Bodies.rectangle(centerX, centerY, length, height, {
        isStatic: true,
        friction: SAND_PHYSICS.friction,
        frictionStatic: SAND_PHYSICS.friction,
        restitution: SAND_PHYSICS.bounce,
        label: 'terrain',
      });
      Body.rotate(body, angle);
      this.matter.world.add(body);

      segments.push({
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        angle,
        slopeDeg: PhaserLib.Math.RadToDeg(angle),
        length,
      });
    }

    this.terrainSegments = segments;
    this.matter.world.setBounds(0, 0, this.trackEndX + 600, this.scale.height * 2);
  }

  createCheckpoints() {
    const checkpoints = Array.isArray(this.terrainSpec.checkpoints) ? this.terrainSpec.checkpoints : [];
    const width = 30;
    const height = 280;

    const anchors = [
      this.segmentLookup[0]?.crestX ?? 600,
      this.segmentLookup[Math.floor(this.segmentLookup.length / 2)]?.crestX ?? this.trackEndX * 0.5,
      this.segmentLookup[this.segmentLookup.length - 1]?.crestX ?? this.trackEndX - 400,
    ];

    const labels = checkpoints.length >= 3 ? checkpoints : [
      { id: 'cp-1', labelAr: 'بعد الطعس الأول', labelEn: 'After first dune' },
      { id: 'cp-2', labelAr: 'منتصف المرحلة', labelEn: 'Mid-section' },
      { id: 'cp-3', labelAr: 'القمة الأخيرة', labelEn: 'Final crest' },
    ];

    this.checkpointOrder = [];

    anchors.slice(0, 3).forEach((anchorX, idx) => {
      const groundY = this.sampleGround(anchorX);
      const sensor = this.matter.add.rectangle(anchorX, groundY - height / 2, width, height, {
        isStatic: true,
        isSensor: true,
        label: 'checkpoint',
      });
      sensor.checkpointData = {
        id: labels[idx]?.id ?? `cp-${idx + 1}`,
        labelAr: labels[idx]?.labelAr ?? `نقطة ${idx + 1}`,
        labelEn: labels[idx]?.labelEn ?? `Checkpoint ${idx + 1}`,
        anchorX,
        index: idx,
      };
      this.checkpoints.push(sensor);
      this.checkpointOrder.push(sensor.checkpointData.id);
    });
  }

  restoreCheckpointProgress() {
    if (!this.isFlagEnabled('enableCheckpointLite')) return;
    if (typeof window === 'undefined' || !window.localStorage) return;

    const data = loadCheckpoint(window.localStorage);
    if (!data) return;

    const fallbackIndex = typeof data.index === 'number' ? data.index : 0;
    const checkpoint = this.checkpoints.find(cp => cp.checkpointData.id === data.id) ?? this.checkpoints[fallbackIndex];
    if (!checkpoint) return;

    const anchorX = typeof data.anchorX === 'number' ? data.anchorX : checkpoint.checkpointData.anchorX;
    if (typeof anchorX !== 'number') return;

    this.moveVehicleTo(anchorX);
    this.activeCheckpoint = checkpoint.checkpointData.id;
    this.checkpointHits.clear();
    completedCheckpointIds(this.checkpoints, checkpoint.checkpointData.index).forEach(id => this.checkpointHits.add(id));

    const lang = this.registry.get('lang') ?? 'ar';
    const message = lang === 'ar' ? `${checkpoint.checkpointData.labelAr} ✔` : `${checkpoint.checkpointData.labelEn} ✔`;
    this.toastText.setText(message);
    this.toastText.setAlpha(1);
  }

  persistCheckpoint(data) {
    if (!this.isFlagEnabled('enableCheckpointLite')) return;
    if (typeof window === 'undefined' || !window.localStorage) return;
    storeCheckpoint(window.localStorage, data);
    this.activeCheckpoint = data.id;
  }

  createVehicle() {
    const spec = this.vehicleSpec;
    const wheelRadius = (spec.wheelRadiusMeters ?? 0.42) * PX_PER_METER;
    const wheelBaseMeters = spec.wheelBaseMeters ?? 3.1;
    this.wheelOffset = (wheelBaseMeters * PX_PER_METER) / 2;
    this.wheelRadius = wheelRadius;
    const startX = 220;
    const groundY = this.sampleGround(startX);
    const startY = groundY - wheelRadius * 2 - 30;

    this.chassis = this.matter.add.rectangle(startX, startY, 220, 60, {
      chamfer: { radius: 16 },
      frictionAir: 0.035,
      label: 'chassis',
    });
    Body.setMass(this.chassis, spec.massKg ?? 1850);

    this.rearWheel = this.createWheel(startX - this.wheelOffset, groundY - wheelRadius, wheelRadius);
    this.frontWheel = this.createWheel(startX + this.wheelOffset, groundY - wheelRadius, wheelRadius);

    this.attachWheel(this.rearWheel, { x: -this.wheelOffset, y: 28 });
    this.attachWheel(this.frontWheel, { x: this.wheelOffset, y: 28 });

    this.vehicleSprites = this.createVehicleSprites(wheelRadius);
    this.shadowSprite = this.add.ellipse(startX, groundY - 6, this.wheelOffset * 2.6, wheelRadius * 1.6, 0x000000, 0.28)
      .setOrigin(0.5)
      .setScale(1, 0.25)
      .setDepth(-1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,S,A,D,SPACE,SHIFT');

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.trackEndX + 400, this.scale.height);
    cam.startFollow(this.vehicleSprites.chassis, false, 0.08, 0.12);
    cam.setFollowOffset(0, this.cameraRig.offsetY);
    cam.setZoom(this.cameraRig.zoom);
  }

  createWheel(x, y, radius) {
    const wheel = this.matter.add.circle(x, y, radius * 0.92, {
      friction: SAND_PHYSICS.friction,
      frictionAir: 0.005,
      restitution: SAND_PHYSICS.bounce,
      label: 'wheel',
    });
    Body.setMass(wheel, (this.vehicleSpec.wheelMassKg ?? 80));
    return wheel;
  }

  attachWheel(wheel, anchorOffset) {
    const spring = Constraint.create({
      bodyA: this.chassis,
      bodyB: wheel,
      length: anchorOffset.y + 40,
      stiffness: this.vehicleSpec.suspension?.stiffness ?? 0.45,
      damping: this.vehicleSpec.suspension?.damping ?? 0.32,
      pointA: { x: anchorOffset.x, y: -10 },
    });
    this.matter.world.add(spring);
  }

  createVehicleSprites(wheelRadius) {
    const container = this.add.container(this.chassis.position.x, this.chassis.position.y);
    const bodyRect = this.add.rectangle(0, 0, 220, 60, 0x2e96d6, 0.95);
    const roof = this.add.rectangle(40, -32, 110, 28, 0x3aa7e3, 0.95);
    const cabin = this.add.rectangle(-40, -28, 90, 36, 0xffffff, 0.72);
    const shade = this.add.rectangle(0, 24, 220, 16, 0x1b3b5a, 0.3);
    container.add([bodyRect, roof, cabin, shade]);

    const rearWheelSprite = this.add.circle(this.rearWheel.position.x, this.rearWheel.position.y, wheelRadius, 0x1f1f24, 0.95);
    const frontWheelSprite = this.add.circle(this.frontWheel.position.x, this.frontWheel.position.y, wheelRadius, 0x1f1f24, 0.95);

    return {
      chassis: container,
      wheels: [rearWheelSprite, frontWheelSprite],
    };
  }

  createHUD() {
    const { width } = this.scale;
    this.debugText = this.add.text(24, 24, '', {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 18,
      color: '#0d3557',
      backgroundColor: 'rgba(255,255,255,0.65)',
      padding: { x: 12, y: 8 },
    }).setScrollFactor(0);

    this.progressText = this.add.text(width - 260, 24, '', {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 18,
      color: '#0d3557',
      backgroundColor: 'rgba(255,255,255,0.65)',
      padding: { x: 12, y: 8 },
    }).setScrollFactor(0);

    this.toastText = this.add.text(width / 2, 80, '', {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 24,
      color: '#ffffff',
      backgroundColor: 'rgba(46,150,214,0.85)',
      padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    this.timeEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.15));
        if (this.toastText.alpha <= 0.05) {
          this.toastText.setAlpha(0);
        }
      },
    });
  }

  initPerfOverlay() {
    if (!this.isFlagEnabled('enablePerfOverlay')) {
      this.perfOverlay = null;
      return;
    }

    this.perfOverlayVisible = false;
    this.perfOverlay = this.add.text(24, 220, '', {
      fontFamily: 'Tajawal, sans-serif',
      fontSize: 16,
      color: '#132c44',
      backgroundColor: 'rgba(255,255,255,0.78)',
      padding: { x: 10, y: 8 },
      lineSpacing: 4,
    })
      .setScrollFactor(0)
      .setVisible(false);

    this.input.keyboard.on('keydown-F1', () => {
      this.perfOverlayVisible = !this.perfOverlayVisible;
      this.perfOverlay?.setVisible(this.perfOverlayVisible);
    });
  }

  registerInput() {
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
    this.input.keyboard.on('keydown-BACKSPACE', () => this.resetVehicle());

    const unlockAudio = () => {
      if (this.audio && !this.audio.started) {
        this.startAudioLoops();
      }
    };
    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard.once('keydown', unlockAudio);
  }

  registerCollisions() {
    this.matter.world.on('collisionstart', event => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        const checkpoint = this.resolveCheckpointBody(bodyA, bodyB);
        if (checkpoint) {
          this.handleCheckpoint(checkpoint);
        }

        if (this.audio) {
          this.handleSuspensionImpact(pair);
        }
      });
    });
  }

  resolveCheckpointBody(bodyA, bodyB) {
    if (bodyA?.label === 'checkpoint' && this.isVehicleBody(bodyB)) return bodyA;
    if (bodyB?.label === 'checkpoint' && this.isVehicleBody(bodyA)) return bodyB;
    return null;
  }

  isVehicleBody(body) {
    return body === this.chassis || body === this.rearWheel || body === this.frontWheel;
  }

  isWheelBody(body) {
    return body === this.rearWheel || body === this.frontWheel;
  }

  handleCheckpoint(body) {
    const data = body.checkpointData;
    if (!data || this.checkpointHits.has(data.id)) return;
    this.checkpointHits.add(data.id);
    const lang = this.registry.get('lang') ?? 'ar';
    const message = lang === 'ar' ? data.labelAr : data.labelEn;
    this.toastText.setText(message);
    this.toastText.setAlpha(1);

    if (this.isFlagEnabled('enableCheckpointLite')) {
      this.persistCheckpoint(data);
    }
  }

  initAudio() {
    if (!this.isFlagEnabled('enableAudioTorqueSync')) {
      this.audio = null;
      return;
    }
    if (!this.sound || !this.sound.context) return;
    const ctx = this.sound.context;
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windGain.connect(master);

    const sandGain = ctx.createGain();
    sandGain.gain.value = 0;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.4;
    engineGain.connect(master);
    sandGain.connect(engineGain);

    const suspensionGain = ctx.createGain();
    suspensionGain.gain.value = 0;
    suspensionGain.connect(master);

    const windOsc = ctx.createOscillator();
    windOsc.type = 'sawtooth';
    windOsc.frequency.value = 38;
    windOsc.connect(windGain);

    const sandBuffer = this.createNoiseBuffer(ctx);
    const sandSource = ctx.createBufferSource();
    sandSource.buffer = sandBuffer;
    sandSource.loop = true;
    const sandFilter = ctx.createBiquadFilter();
    sandFilter.type = 'bandpass';
    sandFilter.frequency.value = 720;
    sandFilter.Q.value = 0.9;
    sandSource.connect(sandFilter).connect(sandGain);

    this.audio = {
      ctx,
      master,
      windGain,
      sandGain,
      engineGain,
      suspensionGain,
      windOsc,
      sandSource,
      started: false,
    };

    this.sound.once('shutdown', () => this.stopAudio());
  }

  startAudioLoops() {
    if (!this.audio || this.audio.started) return;
    const now = this.audio.ctx.currentTime;
    try {
      this.audio.windOsc.start(now);
    } catch (_) {
      // oscillator already started
    }
    try {
      this.audio.sandSource.start(now);
    } catch (_) {
      // buffer source already started
    }
    this.audio.started = true;
  }

  stopAudio() {
    if (!this.audio) return;
    this.audio.master?.disconnect();
    this.audio = null;
  }

  createNoiseBuffer(ctx) {
    const duration = 1.8;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    return buffer;
  }

  moveVehicleTo(startX) {
    const wheelRadius = this.wheelRadius ?? (this.vehicleSpec.wheelRadiusMeters ?? 0.42) * PX_PER_METER;
    const groundY = this.sampleGround(startX);
    Body.setPosition(this.chassis, { x: startX, y: groundY - wheelRadius * 2 - 30 });
    Body.setVelocity(this.chassis, { x: 0, y: 0 });
    Body.setAngle(this.chassis, 0);
    Body.setAngularVelocity(this.chassis, 0);

    Body.setPosition(this.rearWheel, { x: startX - this.wheelOffset, y: groundY - wheelRadius });
    Body.setVelocity(this.rearWheel, { x: 0, y: 0 });
    Body.setAngle(this.rearWheel, 0);
    Body.setAngularVelocity(this.rearWheel, 0);

    Body.setPosition(this.frontWheel, { x: startX + this.wheelOffset, y: groundY - wheelRadius });
    Body.setVelocity(this.frontWheel, { x: 0, y: 0 });
    Body.setAngle(this.frontWheel, 0);
    Body.setAngularVelocity(this.frontWheel, 0);
  }

  resetVehicle(startX = 220) {
    this.moveVehicleTo(startX);

    this.checkpointHits.clear();
    this.toastText.setAlpha(0);
    this.elapsed = 0;
    this.currentTraction = 1;
    this.cameraRig.offsetY = -140;
    this.cameraRig.targetOffsetY = -140;

    if (this.audio && this.audio.started) {
      const now = this.audio.ctx.currentTime;
      this.audio.windGain.gain.setTargetAtTime(0, now, 0.15);
      this.audio.sandGain.gain.setTargetAtTime(0, now, 0.15);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      clearCheckpoint(window.localStorage);
    }
  }

  isFlagEnabled(key) {
    return Boolean(this.flags?.[key]);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 1 / 55);
    if (!this.chassis) return;

    const velocity = this.chassis.velocity;
    const speed = Math.hypot(velocity.x, velocity.y);
    const slopeAngle = this.sampleSlope(this.chassis.position.x);
    const slopeDeg = PhaserLib.Math.RadToDeg(slopeAngle);
    const fps = dt > 0 ? 1 / dt : 0;

    this.elapsed += dt;
    this.updateVehicle(dt, slopeAngle, speed);
    this.updateCamera(dt, speed, slopeAngle);
    this.updateSprites(slopeAngle);
    this.updateHUD(speed, slopeAngle);
    this.updatePerfOverlay(fps, speed, slopeDeg, this.currentTraction);
    const acceleration = dt > 0 ? Math.abs(velocity.x - this.lastVelocity.x) / dt : 0;
    this.updateAudioState(speed, slopeAngle, acceleration);

    if (this.chassis.position.x > this.trackEndX) {
      this.finishStage();
    }

    this.lastVelocity.x = velocity.x;
    this.lastVelocity.y = velocity.y;
  }

  updateVehicle(dt, slopeAngle, speed) {
    const sandEnabled = this.isFlagEnabled('enableSandTuning');
    if (sandEnabled) {
      const slopeDeg = Math.abs(PhaserLib.Math.RadToDeg(slopeAngle));
      this.tractionTarget = tractionFromSlope({ slopeDeg, speed, physics: SAND_PHYSICS });
      this.currentTraction = PhaserLib.Math.Linear(this.currentTraction, this.tractionTarget, dt * 3.2);
    } else {
      this.tractionTarget = 1;
      this.currentTraction = 1;
    }

    const input = this.readInput();
    this.applyEngineForces(input, slopeAngle, speed, sandEnabled);
    this.applySandDrag(slopeAngle, speed, sandEnabled);
    if (sandEnabled) {
      this.preventWheelSink(this.rearWheel);
      this.preventWheelSink(this.frontWheel);
    }
    this.dampenBodyRoll(dt, input, sandEnabled);
  }

  readInput() {
    const padManager = this.input.gamepad;
    const pad = padManager && padManager.total > 0 ? padManager.getPad(0) : null;
    const axisXRaw = pad?.axes?.length ? pad.axes[0].getValue() : 0;
    const axisYRaw = pad?.axes?.length > 1 ? pad.axes[1].getValue() : 0;
    const deadZone = GAMEPAD_DEADZONE;
    const axisX = applyDeadZone(axisXRaw, deadZone);
    const axisY = applyDeadZone(axisYRaw, deadZone);

    const accelerateKeyboard = this.cursors.right.isDown || this.keys.D.isDown;
    const reverseKeyboard = this.cursors.left.isDown || this.keys.A.isDown;
    const brakeKeyboard = this.cursors.space?.isDown || this.keys.SPACE.isDown || this.keys.SHIFT.isDown;

    const acceleratePad = pad ? axisX > deadZone || pad.buttons?.[7]?.pressed === true : false; // RT
    const reversePad = pad ? axisX < -deadZone || pad.buttons?.[6]?.pressed === true : false; // LT
    const brakePad = pad ? (Math.abs(axisY) > deadZone && axisY > 0.5) || pad.buttons?.[0]?.pressed === true : false;

    const raw = {
      accelerate: accelerateKeyboard || acceleratePad,
      reverse: reverseKeyboard || reversePad,
      brake: brakeKeyboard || brakePad,
    };

    return this.filterInput(raw);
  }

  filterInput(raw) {
    const smoothing = 0.35;
    const filtered = {};
    ['accelerate', 'reverse', 'brake'].forEach(key => {
      const target = raw[key] ? 1 : 0;
      const previous = this.inputAnalog[key] ?? 0;
      this.inputAnalog[key] = smoothValue(previous, target, smoothing);
      filtered[key] = this.inputAnalog[key] >= 0.55;
    });
    return filtered;
  }

  applyEngineForces({ accelerate, reverse, brake }, slopeAngle, speed, sandEnabled) {
    const rear = this.rearWheel;
    const front = this.frontWheel;
    const traction = sandEnabled ? this.currentTraction : 1;
    const wheelSpeed = Math.abs(rear.angularVelocity) + Math.abs(front.angularVelocity);
    const torqueFade = sandEnabled ? PhaserLib.Math.Clamp(1 - wheelSpeed * 0.08, 0.25, 1) : 1;
    const slopePenalty = sandEnabled ? PhaserLib.Math.Clamp(1 - Math.abs(Math.sin(slopeAngle)) * 0.55, 0.35, 1) : 1;
    const forceScalar = traction * torqueFade * slopePenalty;

    if (accelerate) {
      const force = ENGINE_FORCE * forceScalar;
      Body.applyForce(rear, rear.position, { x: force, y: 0 });
      Body.applyForce(front, front.position, { x: force * 0.9, y: 0 });
    } else if (reverse) {
      const force = ENGINE_FORCE * 0.7 * forceScalar;
      Body.applyForce(rear, rear.position, { x: -force, y: 0 });
      Body.applyForce(front, front.position, { x: -force * 0.85, y: 0 });
    }

    if (brake) {
      const extraSlope = sandEnabled ? Math.abs(Math.sin(slopeAngle)) * 0.0002 : 0;
      const brakeForce = BRAKE_FORCE + extraSlope + speed * 0.00002;
      Body.setAngularVelocity(rear, PhaserLib.Math.Linear(rear.angularVelocity, 0, 0.5));
      Body.setAngularVelocity(front, PhaserLib.Math.Linear(front.angularVelocity, 0, 0.5));
      Body.applyForce(this.chassis, this.chassis.position, { x: -Math.sign(this.chassis.velocity.x) * brakeForce, y: 0 });
    }
  }

  applySandDrag(slopeAngle, speedMagnitude, sandEnabled) {
    const speed = Math.abs(speedMagnitude);
    const slopeFactor = sandEnabled ? PhaserLib.Math.Clamp(Math.abs(Math.sin(slopeAngle)) * 1.5, 0, 1.8) : 0.5;
    const dragForce = DRAG_COEFFICIENT * (1 + slopeFactor) * speed;
    Body.applyForce(this.chassis, this.chassis.position, {
      x: -Math.sign(this.chassis.velocity.x) * dragForce,
      y: 0,
    });
  }

  preventWheelSink(wheel) {
    const groundY = this.sampleGround(wheel.position.x);
    const wheelRadius = (this.vehicleSpec.wheelRadiusMeters ?? 0.42) * PX_PER_METER;
    const sinkDepth = wheel.position.y - (groundY - wheelRadius);
    if (sinkDepth > wheelRadius * SAND_PHYSICS.wheelSinkLimit) {
      const recoveryForce = 0.00045 * sinkDepth;
      Body.applyForce(wheel, wheel.position, { x: 0, y: -recoveryForce });
    }
  }

  dampenBodyRoll(dt, input, sandEnabled) {
    if (sandEnabled) {
      const rotation = this.chassis.angle;
      const rollTarget = PhaserLib.Math.Clamp(rotation, -0.45, 0.45);
      const correction = (rollTarget - rotation) * dt * 0.9;
      Body.setAngularVelocity(this.chassis, this.chassis.angularVelocity + correction);
    }

    if (!input.accelerate && !input.reverse) {
      Body.setAngularVelocity(this.rearWheel, PhaserLib.Math.Linear(this.rearWheel.angularVelocity, 0, 0.05));
      Body.setAngularVelocity(this.frontWheel, PhaserLib.Math.Linear(this.frontWheel.angularVelocity, 0, 0.05));
    }
  }

  updateCamera(dt, speed, slopeAngle) {
    const cam = this.cameras.main;
    if (!cam) return;

    if (!this.isFlagEnabled('enableCameraLerp')) {
      cam.setZoom(1.0);
      cam.setFollowOffset(0, -140);
      return;
    }

    const speedMps = speed / PX_PER_METER;
    this.cameraRig.targetZoom = PhaserLib.Math.Clamp(1.05 - speedMps * 0.015, 0.82, 1.08);
    this.cameraRig.zoom = cameraOffsetStep(this.cameraRig.zoom, this.cameraRig.targetZoom, dt, 2.5);

    const horizonLift = PhaserLib.Math.Clamp(Math.sin(slopeAngle) * 90, -70, 90);
    this.cameraRig.targetOffsetY = PhaserLib.Math.Clamp(-140 - horizonLift, -220, -80);
    this.cameraRig.offsetY = cameraOffsetStep(this.cameraRig.offsetY, this.cameraRig.targetOffsetY, dt, 3);

    cam.setZoom(this.cameraRig.zoom);
    cam.setFollowOffset(0, this.cameraRig.offsetY);
  }

  updateSprites(slopeAngle) {
    this.vehicleSprites.chassis.setPosition(this.chassis.position.x, this.chassis.position.y);
    this.vehicleSprites.chassis.setRotation(this.chassis.angle);

    this.vehicleSprites.wheels[0].setPosition(this.rearWheel.position.x, this.rearWheel.position.y);
    this.vehicleSprites.wheels[0].setRotation(this.rearWheel.angle);

    this.vehicleSprites.wheels[1].setPosition(this.frontWheel.position.x, this.frontWheel.position.y);
    this.vehicleSprites.wheels[1].setRotation(this.frontWheel.angle);

    const groundUnderCar = this.sampleGround(this.chassis.position.x);
    if (this.shadowSprite) {
      this.shadowSprite.setPosition(this.chassis.position.x, groundUnderCar - 6);
      const compression = PhaserLib.Math.Clamp(1 - this.currentTraction, 0, 0.6);
      this.shadowSprite.setScale(1 + compression * 0.1, 0.25 - compression * 0.08);
      this.shadowSprite.setAlpha(0.18 + compression * 0.25);
    }

    if (this.ambientGlow) {
      const glowAlpha = PhaserLib.Math.Clamp(0.12 + Math.sin(slopeAngle) * 0.04, 0.05, 0.2);
      this.ambientGlow.setAlpha(glowAlpha);
    }
  }

  updateHUD(speed, slopeRad) {
    const speedMeters = speed / PX_PER_METER;
    const speedKmh = speedMeters * 3.6;
    const slopeDeg = PhaserLib.Math.RadToDeg(slopeRad);
    this.progress = PhaserLib.Math.Clamp(this.chassis.position.x / this.trackEndX, 0, 1);

    this.debugText.setText(
      `Speed: ${speedKmh.toFixed(1)} km/h\n` +
      `Slope: ${slopeDeg.toFixed(1)}°\n` +
      `Traction: ${(this.currentTraction * 100).toFixed(0)}%\n` +
      `Time: ${this.elapsed.toFixed(1)} s`
    );

    this.progressText.setText(
      `Progress: ${(this.progress * 100).toFixed(0)}%\n` +
      `Checkpoints: ${this.checkpointHits.size}/3`
    );
  }

  updateAudioState(speed, slopeAngle, acceleration) {
    if (!this.isFlagEnabled('enableAudioTorqueSync')) return;
    if (!this.audio || !this.audio.started) return;
    const ctx = this.audio.ctx;
    const now = ctx.currentTime;
    const speedMps = speed / PX_PER_METER;
    const accelNormalized = clamp(acceleration / 120, 0, 1.5);

    const windTarget = PhaserLib.Math.Clamp(speedMps * 0.06, 0, 0.55);
    this.audio.windGain.gain.setTargetAtTime(windTarget, now, 0.12);
    this.audio.windOsc.frequency.setTargetAtTime(36 + speedMps * 4.2, now, 0.2);

    const sandIntensity = PhaserLib.Math.Clamp((1 - this.currentTraction) + Math.abs(Math.sin(slopeAngle)) * 0.45, 0, 1.2);
    const sandTarget = PhaserLib.Math.Clamp(sandIntensity * 0.52, 0, 0.48);
    this.audio.sandGain.gain.setTargetAtTime(sandTarget, now, 0.08);

    if (this.audio.sandSource?.playbackRate) {
      const playbackRate = playbackRateFromAcceleration({ baseRate: 1, acceleration: accelNormalized, traction: this.currentTraction });
      this.audio.sandSource.playbackRate.setTargetAtTime(playbackRate, now, 0.12);
    }
    if (this.audio.engineGain) {
      const engineVolume = volumeFromAcceleration({ baseVolume: 0.4, acceleration: accelNormalized });
      this.audio.engineGain.gain.setTargetAtTime(engineVolume, now, 0.12);
    }
  }

  updatePerfOverlay(fps, speed, slopeDeg, traction) {
    if (!this.perfOverlay) return;
    if (!this.perfOverlayVisible) {
      if (this.perfOverlay.text !== '') {
        this.perfOverlay.setText('');
      }
      return;
    }

    const speedKmh = (speed / PX_PER_METER) * 3.6;
    this.perfOverlay.setText(
      `FPS: ${fps.toFixed(1)}\n` +
        `Speed: ${speedKmh.toFixed(1)} km/h\n` +
        `Slope: ${slopeDeg.toFixed(1)}°\n` +
        `Traction: ${(traction * 100).toFixed(0)}%`
    );

    if (this.perfSamples.length > 3600) {
      this.perfSamples.shift();
    }
    this.perfSamples.push({ fps, speed: speedKmh, slope: slopeDeg, traction });
  }

  handleSuspensionImpact(pair) {
    if (!this.isFlagEnabled('enableAudioTorqueSync')) return;
    if (!this.audio || !this.audio.started) return;
    const { bodyA, bodyB } = pair;
    const involvesWheel = this.isWheelBody(bodyA) || this.isWheelBody(bodyB);
    const involvesTerrain = bodyA?.label === 'terrain' || bodyB?.label === 'terrain';
    if (!involvesWheel || !involvesTerrain) return;

    const dynamicBody = this.isWheelBody(bodyA) ? bodyA : bodyB;
    const impactVelocity = Math.abs(dynamicBody.velocity.y - this.lastVelocity.y);
    if (impactVelocity < 6) return;

    this.triggerSuspensionSqueak(impactVelocity);
  }

  triggerSuspensionSqueak(intensity) {
    if (!this.audio) return;
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 280 + intensity * 6;

    const gain = ctx.createGain();
    const level = PhaserLib.Math.Clamp(0.08 + intensity * 0.012, 0.08, 0.28);
    gain.gain.setValueAtTime(level, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);

    osc.connect(gain).connect(this.audio.suspensionGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  finishStage() {
    if (this.stageComplete) return;
    this.stageComplete = true;
    this.toastText.setText('Stage complete – Sand Dunes prototype ready!');
    this.toastText.setAlpha(1);
    if (this.audio && this.audio.started) {
      const now = this.audio.ctx.currentTime;
      this.audio.windGain.gain.setTargetAtTime(0, now, 0.2);
      this.audio.sandGain.gain.setTargetAtTime(0, now, 0.2);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      clearCheckpoint(window.localStorage);
    }
    this.time.delayedCall(1200, () => this.scene.start('MenuScene'));
  }

  sampleGround(x) {
    const segment = this.findSegment(x);
    if (!segment) {
      return this.baseY;
    }
    const t = PhaserLib.Math.Clamp((x - segment.x1) / (segment.x2 - segment.x1), 0, 1);
    return PhaserLib.Math.Linear(segment.y1, segment.y2, t);
  }

  sampleSlope(x) {
    const segment = this.findSegment(x);
    return segment ? segment.angle : 0;
  }

  findSegment(x) {
    for (let i = 0; i < this.terrainSegments.length; i++) {
      const seg = this.terrainSegments[i];
      if (x >= seg.x1 && x <= seg.x2) return seg;
    }
    return this.terrainSegments[this.terrainSegments.length - 1] ?? null;
  }
}

export default SandDunesScene;
