var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// scenes/PreloadScene.js
var AUDIO_KEYS = [
  "engine_idle",
  "engine_rev",
  "nitro",
  "skid",
  "coin",
  "checkpoint",
  "kettle_spill",
  "dog_bark",
  "sandstorm",
  "sizzling",
  "cheer",
  "sheela_loop"
];
var LEVEL_JSON_SOURCES = [
  { key: "level-rafiah-primary", path: "./levels/level_rafiah.json" },
  { key: "level-rafiah-fallback", path: "./game/levels/level_rafiah.json" }
];
var createPathHelpers = (graphics) => {
  const pen = { x: 0, y: 0 };
  return {
    moveTo(x, y) {
      pen.x = x;
      pen.y = y;
      graphics.moveTo(x, y);
    },
    lineTo(x, y) {
      pen.x = x;
      pen.y = y;
      graphics.lineTo(x, y);
    },
    quadraticTo(controlX, controlY, x, y, segments = 24) {
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(pen.x, pen.y),
        new Phaser.Math.Vector2(controlX, controlY),
        new Phaser.Math.Vector2(x, y)
      );
      const points = curve.getPoints(Math.max(8, segments));
      for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
      }
      pen.x = x;
      pen.y = y;
    }
  };
};
var PreloadScene = class extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
    this.shared = window.RAFIAH_SHARED || null;
  }
  init() {
    this.shared = window.RAFIAH_SHARED || this.game.registry.get("shared") || {};
    console.log("\u25B6\uFE0F PreloadScene init");
  }
  preload() {
    this.cameras.main.setBackgroundColor("#F8E9D2");
    this.addProgressBar();
    console.log("\u25B6\uFE0F PreloadScene preload started");
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file) => {
      console.warn("\u26A0\uFE0F Asset load error", file == null ? void 0 : file.key, file == null ? void 0 : file.src);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      console.log("\u2705 PreloadScene assets loaded");
    });
    LEVEL_JSON_SOURCES.forEach(({ key, path }) => {
      this.load.json(key, path);
    });
    AUDIO_KEYS.forEach((key) => {
      this.load.audio(key, [`./assets/sfx/${key}.mp3`]);
    });
    this.load.spritesheet("car-gmc", "./assets/sprites/chibi_gmc_8f.png", {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.spritesheet("car-prado", "./assets/sprites/prado_chibi_8f.png", {
      frameWidth: 256,
      frameHeight: 256
    });
    this.generateProceduralTextures();
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      var _a2, _b, _c, _d, _e, _f;
      const { json } = this.cache;
      let promoted = false;
      for (const { key, path } of LEVEL_JSON_SOURCES) {
        if (json.exists(key)) {
          const data = json.get(key);
          json.add("level-rafiah", data);
          promoted = true;
          json.remove(key);
          console.log(`\u2705 Loaded level data from ${path}`);
          break;
        }
      }
      if (!promoted) {
        console.warn("\u26A0\uFE0F level_rafiah.json missing from ./levels/ and ./game/levels/. Scene will start with empty layout.");
        json.add("level-rafiah", { terrain: [], collectibles: [], hazards: [], checkpoints: [] });
      }
      this.cache.json.add("i18n-ar", (_c = (_b = (_a2 = this.shared) == null ? void 0 : _a2.i18n) == null ? void 0 : _b.ar) != null ? _c : {});
      this.cache.json.add("i18n-en", (_f = (_e = (_d = this.shared) == null ? void 0 : _d.i18n) == null ? void 0 : _e.en) != null ? _f : {});
    });
  }
  create() {
    var _a2, _b, _c, _d;
    const levelData = this.cache.json.get("level-rafiah");
    this.game.registry.set("level-data", levelData);
    this.game.registry.set("config", (_b = (_a2 = this.shared) == null ? void 0 : _a2.config) != null ? _b : {});
    this.game.registry.set("language", (_d = (_c = this.shared) == null ? void 0 : _c.language) != null ? _d : "ar");
    this.createAnimations();
    console.log("\u2705 Preload complete \u2192 starting Level");
    window.dispatchEvent(new CustomEvent("rafiah-preload-complete"));
    this.scene.launch("LevelScene");
    this.scene.launch("UIScene");
    this.scene.stop();
  }
  addProgressBar() {
    const { width, height } = this.cameras.main;
    const bar = this.add.graphics();
    const box = this.add.graphics();
    const label = this.add.text(width / 2, height / 2 - 90, "\u0627\u0644\u062A\u062D\u0645\u064A\u0644...", {
      fontSize: 24,
      fontFamily: "system-ui, sans-serif",
      color: "#5E3116"
    }).setOrigin(0.5);
    box.fillStyle(16777215, 0.35);
    box.fillRoundedRect(width / 2 - 180, height / 2 - 20, 360, 40, 18);
    this.load.on(Phaser.Loader.Events.PROGRESS, (value) => {
      bar.clear();
      bar.fillStyle(3049131, 0.9);
      bar.fillRoundedRect(width / 2 - 170, height / 2 - 12, 340 * value, 24, 12);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      label.destroy();
      bar.destroy();
      box.destroy();
    });
  }
  generateProceduralTextures() {
    this.createSkyTexture();
    this.createMountainTexture();
    this.createDuneTexture();
    this.createForegroundTexture();
    this.createPropTextures();
    this.createTokenTextures();
  }
  createSkyTexture() {
    const key = "sky-gradient";
    if (this.textures.exists(key)) return;
    const rt = this.make.renderTexture({ width: 512, height: 512, add: false });
    const g = this.add.graphics();
    g.fillGradientStyle(16312786, 16312786, 16439676, 16439676, 1, 1, 1, 1);
    g.fillRect(0, 0, 512, 512);
    g.generateTexture(key, 512, 512);
    g.destroy();
    rt.destroy();
  }
  createMountainTexture() {
    const key = "mountains-back";
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(13793858, 0.85);
    g.beginPath();
    g.moveTo(0, 256);
    g.lineTo(90, 200);
    g.lineTo(210, 236);
    g.lineTo(320, 180);
    g.lineTo(440, 230);
    g.lineTo(512, 210);
    g.lineTo(512, 256);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, 512, 256);
    g.destroy();
  }
  createDuneTexture() {
    const key = "dunes-mid";
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(15189392, 1);
    const path = createPathHelpers(g);
    g.beginPath();
    path.moveTo(0, 256);
    path.lineTo(0, 180);
    path.quadraticTo(130, 140, 260, 200);
    path.quadraticTo(360, 240, 512, 180);
    path.lineTo(512, 256);
    g.closePath();
    g.fillPath();
    g.fillGradientStyle(11037496, 11037496, 16040570, 16040570, 0.45, 0.1, 0.25, 0.1);
    g.beginPath();
    path.moveTo(0, 220);
    path.lineTo(512, 180);
    path.lineTo(512, 256);
    path.lineTo(0, 256);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, 512, 256);
    g.destroy();
  }
  createForegroundTexture() {
    const key = "foreground-details";
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(11037496, 0.9);
    for (let i = 0; i < 14; i += 1) {
      const x = 20 + i * 36;
      const h = 30 + i * 17 % 30;
      g.fillEllipse(x, 220 + i % 2 * 6, 40, h);
    }
    g.fillStyle(6172950, 1);
    for (let i = 0; i < 8; i += 1) {
      const x = 50 + i * 60;
      g.fillRect(x, 210, 6, 46);
      g.fillEllipse(x + 3, 200, 40, 26);
    }
    g.generateTexture(key, 512, 256);
    g.destroy();
  }
  createPropTextures() {
    if (!this.textures.exists("sign-panel")) {
      const g = this.add.graphics();
      g.fillStyle(6172950, 1);
      g.fillRect(46, 16, 12, 140);
      g.fillStyle(3049131, 1);
      g.lineStyle(6, 0, 0.8);
      g.fillRoundedRect(0, 0, 110, 60, 12);
      g.strokeRoundedRect(0, 0, 110, 60, 12);
      g.generateTexture("sign-panel", 120, 160);
      g.destroy();
    }
    if (!this.textures.exists("checkpoint-flag")) {
      const g = this.add.graphics();
      g.fillStyle(16777215, 1);
      g.fillRect(58, 10, 10, 140);
      g.fillStyle(27701, 1);
      g.fillRect(68, 10, 70, 36);
      g.fillRect(68, 46, 70, 36);
      g.generateTexture("checkpoint-flag", 160, 160);
      g.destroy();
    }
    if (!this.textures.exists("camel-silhouette")) {
      const g = this.add.graphics();
      g.fillStyle(10119740, 0.95);
      const path = createPathHelpers(g);
      g.beginPath();
      path.moveTo(20, 120);
      path.quadraticTo(60, 20, 120, 70);
      path.quadraticTo(160, 20, 200, 70);
      path.lineTo(240, 120);
      path.lineTo(220, 120);
      path.lineTo(210, 160);
      path.lineTo(190, 160);
      path.lineTo(180, 120);
      path.lineTo(120, 120);
      path.lineTo(112, 160);
      path.lineTo(88, 160);
      path.lineTo(82, 120);
      path.lineTo(20, 120);
      g.closePath();
      g.fillPath();
      g.generateTexture("camel-silhouette", 260, 200);
      g.destroy();
    }
    if (!this.textures.exists("dog-runner")) {
      const g = this.add.graphics();
      g.fillStyle(5192235, 1);
      const path = createPathHelpers(g);
      g.beginPath();
      path.moveTo(10, 90);
      path.lineTo(150, 50);
      path.lineTo(158, 62);
      path.lineTo(136, 74);
      path.quadraticTo(50, 30, 120, 60);
      path.lineTo(100, 120);
      path.lineTo(90, 160);
      path.lineTo(70, 160);
      path.lineTo(68, 130);
      path.lineTo(40, 150);
      path.lineTo(30, 140);
      path.lineTo(44, 110);
      path.lineTo(10, 90);
      g.closePath();
      g.fillPath();
      g.generateTexture("dog-runner", 200, 200);
      g.destroy();
    }
  }
  createTokenTextures() {
    if (!this.textures.exists("coin-token")) {
      const g = this.add.graphics();
      g.fillStyle(16040570, 1);
      g.fillCircle(40, 40, 38);
      g.lineStyle(6, 11037496, 1);
      g.strokeCircle(40, 40, 33);
      g.fillStyle(16439676, 1);
      g.fillCircle(40, 40, 22);
      g.generateTexture("coin-token", 80, 80);
      g.destroy();
    }
    if (!this.textures.exists("kettle-icon")) {
      const g = this.add.graphics();
      g.fillStyle(6172950, 1);
      const path = createPathHelpers(g);
      g.beginPath();
      path.moveTo(20, 60);
      path.quadraticTo(40, 10, 70, 10, 20);
      path.quadraticTo(100, 10, 120, 60, 20);
      path.lineTo(120, 110);
      path.quadraticTo(70, 150, 20, 110, 20);
      g.closePath();
      g.fillPath();
      g.lineStyle(6, 0, 0.7);
      g.strokePath();
      g.generateTexture("kettle-icon", 140, 160);
      g.destroy();
    }
  }
  createAnimations() {
    const anims = [
      { key: "car_idle", start: 0, end: 0, frameRate: 6, repeat: -1 },
      { key: "car_accel", start: 1, end: 1, frameRate: 12, repeat: -1 },
      { key: "car_jump", start: 2, end: 2, frameRate: 6, repeat: -1 },
      { key: "car_land", start: 3, end: 3, frameRate: 6, repeat: 0 },
      { key: "car_drift", start: 4, end: 4, frameRate: 12, repeat: -1 },
      { key: "car_brake", start: 5, end: 5, frameRate: 12, repeat: -1 },
      { key: "car_bounce", start: 6, end: 6, frameRate: 12, repeat: -1 },
      { key: "car_boost", start: 7, end: 7, frameRate: 12, repeat: -1 }
    ];
    ["car-gmc", "car-prado"].forEach((texture) => {
      anims.forEach((cfg) => {
        const key = `${texture}-${cfg.key}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(texture, { start: cfg.start, end: cfg.end }),
            frameRate: cfg.frameRate,
            repeat: cfg.repeat
          });
        }
      });
    });
  }
};
var PreloadScene_default = PreloadScene;

// systems/physics.js
var Matter = Phaser.Physics.Matter.Matter;
var { Bodies, Body, Constraint } = Matter;
var CAR_CONSTANTS = Object.freeze({
  bodyWidth: 180,
  bodyHeight: 70,
  wheelRadius: 26,
  wheelbase: 120,
  bodyMass: 6,
  wheelMass: 1.4,
  restitution: 0.04,
  linearDamping: 0.02,
  suspensionStiffness: 0.21,
  suspensionDamping: 0.23,
  suspensionTravel: 18,
  driveForce: 28e-4,
  airControlTorque: 18e-5
});
var VehicleController = class {
  constructor(scene, spawn, { textureKey = "car-gmc", nitroConfig, modeConfig }) {
    this.scene = scene;
    this.textureKey = textureKey;
    this.nitroConfig = {
      durationSec: 1.25,
      cooldownSec: 4,
      boostTorque: 1.65,
      maxSpeedMul: 1.1,
      ...nitroConfig || {}
    };
    this.modeConfig = modeConfig;
    this.handbrakeTimer = 0;
    this.lastGroundedY = spawn.y;
    this.airTime = 0;
    this.landingVelocity = 0;
    this.isGrounded = false;
    this.createBodies(spawn);
    this.createSprite();
    this.nitro = {
      active: false,
      timer: 0,
      cooldown: 0
    };
    this.state = {
      speed: 0,
      kmh: 0,
      slope: 0,
      airborne: false,
      comboEligible: false,
      hardLanding: false
    };
  }
  createBodies(spawn) {
    const { wheelRadius, bodyWidth, bodyHeight } = CAR_CONSTANTS;
    this.chassis = Bodies.rectangle(spawn.x, spawn.y, bodyWidth, bodyHeight, {
      chamfer: { radius: 18 },
      restitution: CAR_CONSTANTS.restitution,
      frictionAir: CAR_CONSTANTS.linearDamping,
      label: "vehicle-chassis"
    });
    Body.setMass(this.chassis, CAR_CONSTANTS.bodyMass);
    Body.setInertia(this.chassis, Infinity);
    Body.setCentre(this.chassis, { x: 0, y: 10 }, false);
    const wheelOptions = {
      restitution: 0.02,
      friction: 0.85,
      frictionStatic: 0.9,
      density: 0.01,
      label: "vehicle-wheel"
    };
    this.rearWheel = Bodies.circle(spawn.x - CAR_CONSTANTS.wheelbase / 2, spawn.y + 30, wheelRadius, wheelOptions);
    this.frontWheel = Bodies.circle(spawn.x + CAR_CONSTANTS.wheelbase / 2, spawn.y + 30, wheelRadius, wheelOptions);
    Body.setMass(this.rearWheel, CAR_CONSTANTS.wheelMass);
    Body.setMass(this.frontWheel, CAR_CONSTANTS.wheelMass);
    const addSuspension = (wheel, offsetX) => Constraint.create({
      bodyA: this.chassis,
      pointA: { x: offsetX, y: -10 },
      bodyB: wheel,
      pointB: { x: 0, y: 0 },
      length: CAR_CONSTANTS.suspensionTravel,
      stiffness: CAR_CONSTANTS.suspensionStiffness,
      damping: CAR_CONSTANTS.suspensionDamping,
      label: "vehicle-suspension"
    });
    this.rearConstraint = addSuspension(this.rearWheel, -CAR_CONSTANTS.wheelbase / 2);
    this.frontConstraint = addSuspension(this.frontWheel, CAR_CONSTANTS.wheelbase / 2);
    this.scene.matter.world.add([
      this.chassis,
      this.rearWheel,
      this.frontWheel,
      this.rearConstraint,
      this.frontConstraint
    ]);
  }
  createSprite() {
    this.sprite = this.scene.add.sprite(this.chassis.position.x, this.chassis.position.y - 30, this.textureKey, 0);
    this.sprite.setOrigin(0.5, 0.75);
    this.sprite.setDepth(20);
    this.sprite.play(`${this.textureKey}-car_idle`);
  }
  setTexture(textureKey) {
    if (this.textureKey === textureKey) return;
    this.textureKey = textureKey;
    this.sprite.setTexture(textureKey);
    this.playAnimation("car_idle");
  }
  playAnimation(animKey) {
    const key = `${this.textureKey}-${animKey}`;
    if (this.scene.anims.exists(key)) {
      this.sprite.play({ key, repeat: this.scene.anims.get(key).repeat }, true);
    }
  }
  update(dt, input, terrain) {
    const deltaSec = dt / 1e3;
    this.applyNitro(deltaSec, input.nitro);
    this.applyDrive(deltaSec, input, terrain);
    this.applyTilt(deltaSec, input);
    this.applyHandbrake(deltaSec, input.handbrake);
    this.syncSprite(deltaSec);
    this.updateState(deltaSec, terrain);
    return this.state;
  }
  applyDrive(deltaSec, input, terrain) {
    const { driveForce } = CAR_CONSTANTS;
    const nitroBoost = this.nitro.active ? this.nitroConfig.boostTorque : 1;
    const slopePenalty = 1 - Math.min(Math.abs(terrain.slope) * 0.12, 0.6);
    const baseForce = driveForce * nitroBoost * slopePenalty;
    if (input.throttle && this.canAccelerate()) {
      const force = { x: baseForce, y: 0 };
      Body.applyForce(this.rearWheel, this.rearWheel.position, force);
      Body.applyForce(this.frontWheel, this.frontWheel.position, { x: baseForce * 0.85, y: 0 });
    }
    if (input.brake) {
      const sign = Math.sign(this.chassis.velocity.x);
      const brakeForce = baseForce * 0.8 + Math.abs(this.chassis.velocity.x) * 8e-4;
      Body.applyForce(this.rearWheel, this.rearWheel.position, { x: -sign * brakeForce, y: 0 });
      Body.applyForce(this.frontWheel, this.frontWheel.position, { x: -sign * brakeForce * 0.9, y: 0 });
    }
    if (input.reverse) {
      const reverseForce = baseForce * 0.7;
      Body.applyForce(this.rearWheel, this.rearWheel.position, { x: -reverseForce, y: 0 });
      Body.applyForce(this.frontWheel, this.frontWheel.position, { x: -reverseForce * 0.8, y: 0 });
    }
    const maxSpeed = (this.nitro.active ? this.nitroConfig.maxSpeedMul : 1) * 12.5;
    const currentSpeed = Math.hypot(this.chassis.velocity.x, this.chassis.velocity.y);
    if (currentSpeed > maxSpeed) {
      const damp = (currentSpeed - maxSpeed) * 8e-4;
      Body.applyForce(this.chassis, this.chassis.position, {
        x: -this.chassis.velocity.x * damp,
        y: -this.chassis.velocity.y * damp
      });
    }
  }
  applyTilt(deltaSec, input) {
    const { airControlTorque } = CAR_CONSTANTS;
    const inAir = !this.isGrounded;
    const torque = airControlTorque * (inAir ? 1.8 : 0.8);
    if (input.left) {
      Body.setAngularVelocity(this.chassis, this.chassis.angularVelocity - torque * deltaSec * 120);
    }
    if (input.right) {
      Body.setAngularVelocity(this.chassis, this.chassis.angularVelocity + torque * deltaSec * 120);
    }
  }
  applyHandbrake(deltaSec, active) {
    const wheels = [this.rearWheel, this.frontWheel];
    if (active) {
      this.handbrakeTimer = 0.5;
    }
    this.handbrakeTimer = Math.max(0, this.handbrakeTimer - deltaSec);
    const extraFriction = this.handbrakeTimer > 0 ? 2.2 : 0.85;
    wheels.forEach((wheel) => {
      wheel.friction = extraFriction;
      wheel.frictionStatic = extraFriction;
    });
  }
  applyNitro(deltaSec, nitroPressed) {
    if (nitroPressed && !this.nitro.active && this.nitro.cooldown <= 0) {
      this.nitro.active = true;
      this.nitro.timer = this.nitroConfig.durationSec;
      this.scene.events.emit("vehicle-nitro", { active: true });
    }
    if (this.nitro.active) {
      this.nitro.timer -= deltaSec;
      if (this.nitro.timer <= 0) {
        this.nitro.active = false;
        this.nitro.cooldown = this.nitroConfig.cooldownSec;
        this.scene.events.emit("vehicle-nitro", { active: false });
      }
    } else if (this.nitro.cooldown > 0) {
      this.nitro.cooldown = Math.max(0, this.nitro.cooldown - deltaSec);
    }
  }
  syncSprite(deltaSec) {
    this.sprite.setPosition(this.chassis.position.x, this.chassis.position.y - 30);
    this.sprite.setRotation(this.chassis.angle);
    const vy = this.chassis.velocity.y;
    const absVy = Math.abs(vy);
    const absVx = Math.abs(this.chassis.velocity.x);
    if (this.nitro.active) {
      this.playAnimation("car_boost");
    } else if (!this.isGrounded) {
      this.playAnimation(absVy > 2 ? "car_jump" : "car_bounce");
    } else if (this.handbrakeTimer > 0.1) {
      this.playAnimation("car_drift");
    } else if (absVx > 4) {
      this.playAnimation("car_accel");
    } else if (absVx > 1.2) {
      this.playAnimation("car_bounce");
    } else if (absVx > 0.2) {
      this.playAnimation("car_idle");
    } else {
      this.playAnimation("car_idle");
    }
  }
  updateState(deltaSec, terrain) {
    const velocity = this.chassis.velocity;
    const speed = Math.hypot(velocity.x, velocity.y);
    this.state.speed = speed;
    this.state.kmh = speed * 3.6;
    this.state.slope = terrain.slope;
    const groundNormal = terrain.normal || { y: -1 };
    const verticalVelocity = velocity.y;
    const grounded = terrain.isOnGround;
    if (grounded) {
      if (!this.isGrounded) {
        this.landingVelocity = Math.abs(verticalVelocity);
        this.state.hardLanding = this.landingVelocity > 8;
        this.state.comboEligible = this.airTime > 0.25 && this.landingVelocity < 16;
      } else {
        this.state.hardLanding = false;
        this.state.comboEligible = false;
      }
      this.airTime = 0;
      this.lastGroundedY = this.chassis.position.y;
    } else {
      this.airTime += deltaSec;
      this.state.comboEligible = false;
      this.state.hardLanding = false;
    }
    this.state.airborne = !grounded;
    this.state.normal = groundNormal;
    this.isGrounded = grounded;
  }
  canAccelerate() {
    return true;
  }
  getPosition() {
    return { x: this.chassis.position.x, y: this.chassis.position.y };
  }
  destroy() {
    this.scene.matter.world.remove([this.chassis, this.frontWheel, this.rearWheel, this.frontConstraint, this.rearConstraint]);
    this.sprite.destroy();
  }
};
function sampleSlope(segments, x) {
  let closest = null;
  segments.forEach((seg) => {
    if (x >= seg.x1 && x <= seg.x2) {
      closest = seg;
    }
  });
  return closest != null ? closest : segments[segments.length - 1];
}

// systems/particles.js
function ensureTexture(scene, key, builder) {
  if (scene.textures.exists(key)) return;
  builder();
}
function createDustSystem(scene) {
  ensureTexture(scene, "dust-pixel", () => {
    const g = scene.add.graphics();
    g.fillStyle(15189392, 0.9);
    g.fillCircle(4, 4, 4);
    g.generateTexture("dust-pixel", 8, 8);
    g.destroy();
  });
  const manager = scene.add.particles("dust-pixel");
  manager.setDepth(18);
  const emitter = manager.createEmitter({
    speed: { min: 40, max: 120 },
    angle: { min: 200, max: 340 },
    gravityY: 200,
    lifespan: { min: 300, max: 600 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.8, end: 0 },
    quantity: 5,
    on: false
  });
  return {
    manager,
    emitter,
    emit(x, y, intensity = 1) {
      emitter.explode(Math.max(4, Math.floor(6 * intensity)), x, y);
    },
    destroy() {
      manager.destroy();
    }
  };
}
function createBoostBurst(scene) {
  ensureTexture(scene, "boost-puff", () => {
    const g = scene.add.graphics();
    g.fillStyle(16439676, 0.9);
    g.fillCircle(12, 12, 12);
    g.generateTexture("boost-puff", 24, 24);
    g.destroy();
  });
  const manager = scene.add.particles("boost-puff");
  manager.setDepth(25);
  const emitter = manager.createEmitter({
    speed: { min: 120, max: 200 },
    angle: { min: 160, max: 380 },
    lifespan: { min: 200, max: 420 },
    scale: { start: 1.4, end: 0 },
    alpha: { start: 1, end: 0 },
    on: false
  });
  return {
    fire(x, y) {
      emitter.explode(24, x, y);
    },
    destroy() {
      manager.destroy();
    }
  };
}
function createConfettiSystem(scene) {
  ensureTexture(scene, "confetti-chip", () => {
    const g = scene.add.graphics();
    const colors = [3049131, 16040570, 15189392, 11037496];
    colors.forEach((color, idx) => {
      g.fillStyle(color, 1);
      g.fillRect(idx * 6, 0, 6, 12);
    });
    g.generateTexture("confetti-chip", colors.length * 6, 12);
    g.destroy();
  });
  const manager = scene.add.particles("confetti-chip");
  manager.setDepth(200);
  const emitter = manager.createEmitter({
    speedY: { min: 140, max: 260 },
    speedX: { min: -80, max: 80 },
    lifespan: 1200,
    gravityY: 320,
    scale: { start: 1, end: 0.1 },
    rotate: { min: -280, max: 280 },
    quantity: 12,
    on: false
  });
  return {
    celebrate(x, y) {
      emitter.explode(120, x, y);
    },
    destroy() {
      manager.destroy();
    }
  };
}
function createSandstormOverlay(scene) {
  const { width, height } = scene.scale;
  const overlay = scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, 15189392, 0);
  overlay.setDepth(190);
  overlay.setScrollFactor(0);
  const noise = scene.add.graphics();
  noise.setDepth(191);
  noise.setScrollFactor(0);
  noise.setAlpha(0);
  const updateNoise = () => {
    noise.clear();
    noise.fillStyle(3027222, 0.08);
    for (let i = 0; i < 90; i += 1) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      noise.fillCircle(x, y, Phaser.Math.Between(4, 12));
    }
  };
  const timerEvent = scene.time.addEvent({
    delay: 120,
    loop: true,
    callback: updateNoise,
    paused: true
  });
  return {
    activate() {
      scene.tweens.add({ targets: overlay, alpha: 0.55, duration: 500, ease: "Sine.easeOut" });
      scene.tweens.add({ targets: noise, alpha: 0.36, duration: 500, ease: "Sine.easeOut" });
      timerEvent.paused = false;
    },
    deactivate() {
      scene.tweens.add({ targets: overlay, alpha: 0, duration: 700, ease: "Sine.easeIn" });
      scene.tweens.add({ targets: noise, alpha: 0, duration: 700, ease: "Sine.easeIn" });
      timerEvent.paused = true;
    },
    destroy() {
      overlay.destroy();
      noise.destroy();
      timerEvent.destroy();
    }
  };
}

// systems/audio.js
var AudioManager = class {
  constructor(scene, options) {
    var _a2, _b, _c, _d, _e, _f;
    this.scene = scene;
    this.options = options;
    this.musicEnabled = (_b = (_a2 = options.audio) == null ? void 0 : _a2.music) != null ? _b : true;
    this.sfxEnabled = (_d = (_c = options.audio) == null ? void 0 : _c.sfx) != null ? _d : true;
    this.masterVolume = (_f = (_e = options.audio) == null ? void 0 : _e.volume) != null ? _f : 1;
    this.engineIdle = null;
    this.engineRev = null;
    this.skid = null;
    this.nitro = null;
    this.sandstorm = null;
    this.currentEngineTarget = 0;
  }
  init() {
    if (!this.scene.sound) return;
    const sound = this.scene.sound;
    this.engineIdle = sound.add("engine_idle", {
      loop: true,
      volume: 0.25 * this.masterVolume
    });
    this.engineRev = sound.add("engine_rev", {
      loop: true,
      volume: 0,
      rate: 1
    });
    this.skid = sound.add("skid", { loop: true, volume: 0 });
    this.nitro = sound.add("nitro", { loop: false, volume: 0.9 * this.masterVolume });
    this.sandstorm = sound.add("sandstorm", { loop: true, volume: 0 });
    this.cheer = sound.add("cheer", { loop: false, volume: 0.9 * this.masterVolume });
    this.coin = sound.add("coin", { loop: false, volume: 0.7 * this.masterVolume });
    this.checkpoint = sound.add("checkpoint", { loop: false, volume: 0.7 * this.masterVolume });
    this.kettle = sound.add("kettle_spill", { loop: false, volume: 0.7 * this.masterVolume });
    this.sizzling = sound.add("sizzling", { loop: false, volume: 0.6 * this.masterVolume });
    this.dogBark = sound.add("dog_bark", { loop: false, volume: 0.8 * this.masterVolume });
    this.sheela = sound.add("sheela_loop", {
      loop: true,
      volume: 0.3 * this.masterVolume
    });
    if (this.musicEnabled) {
      this.sheela.play();
    }
    if (this.sfxEnabled) {
      this.engineIdle.play();
      this.engineRev.play();
    }
  }
  updateEngine({ speed, throttle, nitroActive, skidIntensity }) {
    var _a2, _b;
    if (!this.sfxEnabled) return;
    if (!this.engineIdle || !this.engineRev) return;
    const idleTarget = Math.max(0.1, Math.min(0.6, 0.25 + throttle * 0.4));
    this.engineIdle.setVolume(idleTarget * this.masterVolume);
    this.engineRev.setVolume(Math.min(1, throttle * 1.1) * this.masterVolume);
    this.engineRev.setRate(0.8 + Math.min(1.6, speed / 12));
    if (nitroActive && !((_a2 = this.nitro) == null ? void 0 : _a2.isPlaying)) {
      (_b = this.nitro) == null ? void 0 : _b.play();
    }
    if (this.skid) {
      const volume = Phaser.Math.Clamp(skidIntensity * 0.8, 0, 0.9);
      this.skid.setVolume(volume * this.masterVolume);
      if (volume > 0.05 && !this.skid.isPlaying) {
        this.skid.play();
      }
      if (volume <= 0.05 && this.skid.isPlaying) {
        this.skid.stop();
      }
    }
  }
  playSfx(key) {
    var _a2;
    if (!this.sfxEnabled) return;
    const sound = this[key];
    (_a2 = sound == null ? void 0 : sound.play) == null ? void 0 : _a2.call(sound);
  }
  playCoin() {
    this.playSfx("coin");
  }
  playCheckpoint() {
    this.playSfx("checkpoint");
  }
  playFood(brand) {
    if (brand === "shalimar") {
      this.playSfx("sizzling");
    } else if (brand === "albaik") {
      this.playSfx("cheer");
    } else {
      this.playSfx("coin");
    }
  }
  playDogBark() {
    this.playSfx("dogBark");
  }
  sandstormState(active) {
    if (!this.sfxEnabled || !this.sandstorm) return;
    if (active) {
      this.sandstorm.play({ volume: 0.4 * this.masterVolume });
    } else {
      this.sandstorm.stop();
    }
  }
  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!this.sheela) return;
    if (enabled && !this.sheela.isPlaying) {
      this.sheela.play();
    } else if (!enabled && this.sheela.isPlaying) {
      this.sheela.stop();
    }
  }
  setSfxEnabled(enabled) {
    var _a2, _b;
    this.sfxEnabled = enabled;
    if (!enabled) {
      [this.engineIdle, this.engineRev, this.skid, this.nitro, this.sandstorm].forEach((s) => {
        var _a3;
        return (_a3 = s == null ? void 0 : s.stop) == null ? void 0 : _a3.call(s);
      });
    } else {
      (_a2 = this.engineIdle) == null ? void 0 : _a2.play();
      (_b = this.engineRev) == null ? void 0 : _b.play();
    }
  }
  destroy() {
    [
      this.engineIdle,
      this.engineRev,
      this.skid,
      this.nitro,
      this.sandstorm,
      this.cheer,
      this.coin,
      this.checkpoint,
      this.kettle,
      this.sizzling,
      this.dogBark,
      this.sheela
    ].forEach((sound) => {
      var _a2;
      return (_a2 = sound == null ? void 0 : sound.destroy) == null ? void 0 : _a2.call(sound);
    });
  }
};

// scenes/LevelScene.js
var DEG_TO_RAD = Math.PI / 180;
var EVENT_UI_READY = "level-ready";
var EVENT_UI_HUD = "level-hud";
var EVENT_UI_TOAST = "level-toast";
var EVENT_UI_STATUS = "level-status";
var EVENT_UI_FINISH = "level-finish";
var EVENT_UI_STORM = "level-sandstorm";
var EVENT_START = "ui-start-request";
var EVENT_PAUSE = "ui-pause-request";
var EVENT_RESTART = "ui-restart-request";
var EVENT_LANGUAGE = "ui-language-request";
var EVENT_MODE = "ui-mode-toggle";
var EVENT_AUDIO = "ui-audio-toggle";
var EVENT_MOBILE_INPUT = "ui-mobile-input";
var EVENT_REDUCED_MOTION = "ui-reduced-motion";
var LevelScene = class extends Phaser.Scene {
  constructor() {
    super({ key: "LevelScene" });
    __publicField(this, "handleStart", () => {
      if (this.gameFinished) {
        this.restartLevel();
        return;
      }
      this.resumeSimulation();
    });
    __publicField(this, "onLanguageChange", (lang) => {
      this.language = lang;
      this.signs.forEach((sign) => sign.text.setText(this.translate(sign.text.getData("textKey"))));
    });
    __publicField(this, "onModeToggle", (mode) => {
      this.config.mode = { ...this.config.mode, ...mode };
    });
    __publicField(this, "onAudioToggle", (payload) => {
      if (!payload) return;
      if (payload.type === "music") {
        this.audioManager.setMusicEnabled(payload.enabled);
      } else if (payload.type === "sfx") {
        this.audioManager.setSfxEnabled(payload.enabled);
      }
    });
    __publicField(this, "onMobileInput", (payload) => {
      Object.assign(this.mobileInput, payload);
    });
    __publicField(this, "onReducedMotion", (enabled) => {
      this.shared.reducedMotion = !!enabled;
    });
    __publicField(this, "togglePause", () => {
      if (!this.isRunning || this.gameFinished) return;
      if (this.isPaused) {
        this.resumeSimulation();
      } else {
        this.pauseSimulation(false);
      }
    });
    __publicField(this, "restartLevel", () => {
      this.scene.restart();
      this.emitUI(EVENT_UI_STATUS, { paused: true });
    });
    this.shared = null;
  }
  init() {
    this.shared = window.RAFIAH_SHARED || this.game.registry.get("shared") || {};
    this.config = this.game.registry.get("config") || this.shared.config || {};
    this.levelData = this.game.registry.get("level-data") || {};
    this.language = this.game.registry.get("language") || this.shared.language || "ar";
    this.eventsBus = this.shared.events || this.game.events;
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
    const fallbackBg = this.add.rectangle(640, 360, 1280, 720, 1253679, 0.65).setDepth(-1e3);
    fallbackBg.setData("rafiah-fallback", true);
    const fallbackLabel = this.add.text(24, 24, "Rafiah Level", {
      fontFamily: "ui-monospace, monospace",
      fontSize: 20,
      color: "#ffffff"
    }).setDepth(1e3);
    console.log("\u2705 LevelScene create invoked");
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
    this.time.delayedCall(2500, () => {
      if (fallbackBg.active) {
        fallbackBg.destroy();
      }
      if (fallbackLabel.active) {
        fallbackLabel.destroy();
      }
    });
    console.log("\u2705 LevelScene systems initialized");
    window.dispatchEvent(new CustomEvent("rafiah-level-ready"));
  }
  setupWorld() {
    this.matter.world.setBounds(0, 0, 3200, 2e3);
    this.matter.world.update60Hz();
    this.cameras.main.setBounds(0, 0, 3200, 720);
    this.cameras.main.setBackgroundColor("#F8E9D2");
  }
  buildParallax() {
    const { width, height } = this.scale;
    this.layers = {
      sky: this.add.tileSprite(0, 0, width * 1.2, height * 1.2, "sky-gradient").setOrigin(0, 0).setScrollFactor(0.2).setDepth(-30),
      mountains: this.add.tileSprite(0, height * 0.25, width * 1.2, 256, "mountains-back").setOrigin(0, 0.5).setScrollFactor(0.35).setDepth(-20),
      dunes: this.add.tileSprite(0, height * 0.55, width * 1.2, 256, "dunes-mid").setOrigin(0, 0.5).setScrollFactor(0.6).setDepth(-15),
      foreground: this.add.tileSprite(0, height * 0.75, width * 1.2, 256, "foreground-details").setOrigin(0, 0.5).setScrollFactor(0.85).setDepth(-5)
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
    g.fillStyle(15189392, 1);
    g.beginPath();
    g.moveTo(samples[0].x, samples[0].y);
    samples.forEach((p) => g.lineTo(p.x, p.y));
    g.lineTo(samples[samples.length - 1].x, 780);
    g.lineTo(samples[0].x, 780);
    g.closePath();
    g.fillPath();
    g.fillGradientStyle(16040570, 16040570, 11037496, 11037496, 0.35, 0.35, 0.6, 0.6);
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
        label: "terrain"
      });
      Phaser.Physics.Matter.Matter.Body.setAngle(body, angle);
      const segmentIsSoft = softSandRanges.some((range) => centerX >= range.from && centerX <= range.to);
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
    signs.forEach((sign) => {
      const y = this.sampleTerrainY(sign.x) - 90;
      const sprite = this.add.image(sign.x, y, "sign-panel").setDepth(6);
      sprite.setData("textKey", sign.text_key);
      const text = this.add.text(sign.x, y - 10, this.translate(sign.text_key), {
        fontSize: 18,
        fontFamily: "system-ui, sans-serif",
        color: "#ffffff"
      }).setOrigin(0.5).setDepth(7);
      this.signs.push({ sprite, text });
    });
    this.camels = [];
    (this.levelData.camels || []).forEach((camel, idx) => {
      var _a2;
      const sprite = this.add.image(camel.x, camel.y, "camel-silhouette").setDepth(5);
      sprite.setScrollFactor((_a2 = camel.parallax) != null ? _a2 : 0.85);
      sprite.setAlpha(0.85);
      sprite.play && sprite.play("camel-walk");
      const sensor = Phaser.Physics.Matter.Matter.Bodies.circle(camel.x, this.sampleTerrainY(camel.x) - 40, 70, {
        isSensor: true,
        isStatic: true,
        label: "camel"
      });
      sensor.camelIndex = idx;
      this.matter.world.add(sensor);
      this.camels.push({ sprite, sensor, hit: false });
    });
  }
  createVehicle() {
    const spawn = this.levelData.spawn || { x: 60, y: 340, vehicle: "gmc" };
    const textureKey = spawn.vehicle === "prado" ? "car-prado" : "car-gmc";
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
    coins.forEach((value) => {
      const x = value;
      const ground = this.sampleTerrainY(x);
      const y = ground - 80;
      const body = Phaser.Physics.Matter.Matter.Bodies.circle(x, y, 20, {
        isStatic: true,
        isSensor: true,
        label: "coin"
      });
      this.matter.world.add(body);
      const sprite = this.add.image(x, y, "coin-token").setDepth(25);
      this.coinObjects.push({ body, sprite, collected: false });
    });
    this.foodSpots = (this.levelData.food_spots || []).map((spot) => {
      const y = this.sampleTerrainY(spot.x) - 50;
      const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(spot.x, y, 80, 60, {
        isStatic: true,
        isSensor: true,
        label: "food"
      });
      body.foodBrand = spot.brand;
      this.matter.world.add(body);
      const hint = this.add.text(spot.x, y - 40, this.translate(`sign.${spot.brand === "zad" ? "zad" : spot.brand}`) || "", {
        fontSize: 16,
        color: "#2E3116",
        backgroundColor: "rgba(255,255,255,0.25)",
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5).setDepth(8);
      return { body, brand: spot.brand, visited: false, hint };
    });
  }
  createHazards() {
    this.dogs = (this.levelData.dogs || []).map((dog, idx) => {
      const sprite = this.add.image(dog.path[0][0], dog.path[0][1], "dog-runner").setDepth(12);
      sprite.setScale(0.8);
      const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(sprite.x, sprite.y, 120, 60, {
        isStatic: true,
        isSensor: true,
        label: "dog"
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
        label: "checkpoint"
      });
      body.checkpointIndex = idx;
      this.matter.world.add(body);
      const flag = this.add.image(x, y - 30, "checkpoint-flag").setDepth(12);
      return { x, body, flag, triggered: false };
    });
  }
  createFinishGate() {
    const finish = this.levelData.finish || { x: 2550, y: 320 };
    const body = Phaser.Physics.Matter.Matter.Bodies.rectangle(finish.x, finish.y, 120, 240, {
      isStatic: true,
      isSensor: true,
      label: "finish"
    });
    this.matter.world.add(body);
    const arch = this.add.graphics();
    arch.setDepth(14);
    arch.lineStyle(12, 6172950, 1);
    arch.strokeRoundedRect(finish.x - 90, finish.y - 180, 180, 200, 28);
    arch.fillStyle(16040570, 0.3);
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
    this.matter.world.on("collisionstart", (evt) => this.handleCollisions(evt));
  }
  registerControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,S,A,D,SHIFT,SPACE,P");
    this.input.keyboard.on("keydown-P", () => this.togglePause());
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
    const segment = this.terrainSegments.find((seg) => x >= seg.x1 && x <= seg.x2) || this.terrainSegments[0];
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
      this.softSandTimer = Math.max(0, this.softSandTimer - delta / 1e3);
      return;
    }
    this.softSandTimer += delta / 1e3;
    const dragForce = 2e-3 * Math.sign(this.vehicle.chassis.velocity.x);
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
    this.dogs.forEach((dog) => {
      if (!dog.active) return;
      const [a, b] = dog.data.path;
      const segmentLength = Phaser.Math.Distance.Between(a[0], a[1], b[0], b[1]);
      const step = dog.data.speed * delta / 1e3 / segmentLength;
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
      if (!dog.poofed && Phaser.Math.FloatBetween(0, 1) < 5e-3) {
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
    const delay = Phaser.Math.Between(min * 1e3, max * 1e3);
    this.time.delayedCall(delay, () => this.startSandstorm(config.durationSec), null, this);
  }
  startSandstorm(duration) {
    if (this.sandstormActive) return;
    this.sandstormActive = true;
    this.sandstormElapsed = 0;
    this.sandstormDuration = duration;
    this.sandstormWind = Phaser.Math.Between(0, 1) === 0 ? -15e-4 : 15e-4;
    this.sandstormRewardPending = true;
    this.survivedSandstorm = false;
    this.crashedDuringStorm = false;
    this.sandstormOverlay.activate();
    this.audioManager.sandstormState(true);
    this.emitUI(EVENT_UI_TOAST, { key: "toast.sandstorm" });
    this.emitUI(EVENT_UI_STORM, { active: true });
    this.time.delayedCall(duration * 1e3, () => this.endSandstorm(), null, this);
  }
  endSandstorm() {
    this.sandstormActive = false;
    this.sandstormOverlay.deactivate();
    this.audioManager.sandstormState(false);
    this.emitUI(EVENT_UI_TOAST, { key: "toast.stormClear" });
    this.emitUI(EVENT_UI_STORM, { active: false });
    if (this.sandstormRewardPending && !this.crashedDuringStorm) {
      this.score += 30;
      this.survivedSandstorm = true;
      this.emitUI(EVENT_UI_TOAST, { text: "+30" });
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
      this.lastComboTime += delta / 1e3;
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
        this.audioManager.playSfx("kettle");
        this.emitUI(EVENT_UI_TOAST, { key: "toast.kettle" });
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
    var _a2, _b, _c;
    return {
      speed: state.kmh,
      nitro: {
        active: this.vehicle.nitro.active,
        timer: this.vehicle.nitro.timer,
        cooldown: this.vehicle.nitro.cooldown,
        duration: (_c = (_a2 = this.vehicle.nitroConfig) == null ? void 0 : _a2.durationSec) != null ? _c : ((_b = this.config.nitro) == null ? void 0 : _b.durationSec) || 1.25
      },
      score: this.score,
      combo: this.combo,
      kettle: this.kettleMeter / this.kettleThreshold
    };
  }
  checkFlip(delta) {
    const angle = Math.abs(Phaser.Math.RadToDeg(this.vehicle.chassis.angle));
    if (angle > 95) {
      this.flipTimer += delta / 1e3;
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
    event.pairs.forEach((pair) => {
      const bodies = [pair.bodyA, pair.bodyB];
      const labels = bodies.map((body) => body.label);
      if (labels.includes("coin")) {
        this.resolveCoin(bodies.find((b) => b.label === "coin"));
      } else if (labels.includes("checkpoint")) {
        this.resolveCheckpoint(bodies.find((b) => b.label === "checkpoint"));
      } else if (labels.includes("finish")) {
        this.handleFinish();
      } else if (labels.includes("food")) {
        this.resolveFoodSpot(bodies.find((b) => b.label === "food"));
      } else if (labels.includes("dog")) {
        this.resolveDogHit(bodies.find((b) => b.label === "dog"));
      } else if (labels.includes("camel")) {
        this.resolveCamelHit();
      }
    });
  }
  resolveCoin(body) {
    const coin = this.coinObjects.find((c) => c.body === body && !c.collected);
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
    if (typeof idx !== "number") return;
    if (this.lastCheckpointIndex === idx) return;
    this.lastCheckpointIndex = idx;
    this.score += 15;
    this.emitUI(EVENT_UI_TOAST, { key: "toast.checkpoint" });
    this.audioManager.playCheckpoint();
    const checkpoint = this.checkpoints[idx];
    checkpoint.flag.setTint(3049131);
  }
  resolveFoodSpot(body) {
    const spot = this.foodSpots.find((s) => s.body === body);
    if (!spot || spot.visited) return;
    spot.visited = true;
    let bonus = 10;
    if (spot.brand === "shalimar" || spot.brand === "albaik") bonus = 20;
    this.score += bonus;
    this.audioManager.playFood(spot.brand);
    this.emitUI(EVENT_UI_TOAST, { key: `toast.food.${spot.brand}` });
  }
  resolveDogHit(body) {
    var _a2;
    const dog = this.dogs.find((d) => d.body === body);
    if (!dog || dog.poofed) return;
    const speed = Math.hypot(this.vehicle.chassis.velocity.x, this.vehicle.chassis.velocity.y);
    if (((_a2 = this.config.mode) == null ? void 0 : _a2.familySafe) !== false) {
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
          x: -Math.sign(this.vehicle.chassis.velocity.x) * 2e-3,
          y: -5e-4
        });
      }
      this.audioManager.playDogBark();
    }
  }
  resolveCamelHit() {
    this.triggerRespawn();
  }
  handleFinish() {
    var _a2, _b;
    if (this.gameFinished) return;
    this.gameFinished = true;
    this.pauseSimulation(false);
    this.finish.reached = true;
    this.score += 100;
    const rank = this.calculateRank(this.score);
    this.confettiSystem.celebrate(this.finish.x, this.finish.y - 100);
    this.audioManager.playSfx("cheer");
    this.emitUI(EVENT_UI_TOAST, { key: "finish.text" });
    this.emitUI(EVENT_UI_FINISH, { score: this.score, rank });
    if (this.score >= 180) {
      (_b = (_a2 = this.shared.unlockedVehicles) == null ? void 0 : _a2.add) == null ? void 0 : _b.call(_a2, "prado");
      this.emitUI(EVENT_UI_TOAST, { key: "toast.unlock.prado" });
    }
  }
  calculateRank(score) {
    if (score >= 220) return "S";
    if (score >= 180) return "A";
    if (score >= 140) return "B";
    return "C";
  }
  emitUI(event, payload) {
    if (!this.eventsBus || !event) return;
    this.eventsBus.emit(event, payload);
  }
  translate(key) {
    const map = this.cache.json.get(`i18n-${this.language}`) || {};
    if (!key) return "";
    const value = map[key];
    return typeof value === "string" ? value : key;
  }
  destroy() {
    var _a2, _b, _c, _d, _e;
    this.cleanupEvents();
    (_a2 = this.dustSystem) == null ? void 0 : _a2.destroy();
    (_b = this.boostSystem) == null ? void 0 : _b.destroy();
    (_c = this.confettiSystem) == null ? void 0 : _c.destroy();
    (_d = this.sandstormOverlay) == null ? void 0 : _d.destroy();
    (_e = this.audioManager) == null ? void 0 : _e.destroy();
  }
};
var LevelScene_default = LevelScene;

// scenes/UIScene.js
var EVENT_UI_READY2 = "level-ready";
var EVENT_UI_HUD2 = "level-hud";
var EVENT_UI_TOAST2 = "level-toast";
var EVENT_UI_STATUS2 = "level-status";
var EVENT_UI_FINISH2 = "level-finish";
var EVENT_UI_STORM2 = "level-sandstorm";
var EVENT_START2 = "ui-start-request";
var EVENT_PAUSE2 = "ui-pause-request";
var EVENT_RESTART2 = "ui-restart-request";
var EVENT_LANGUAGE2 = "ui-language-request";
var EVENT_AUDIO2 = "ui-audio-toggle";
var EVENT_MOBILE_INPUT2 = "ui-mobile-input";
var UIScene = class extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
    __publicField(this, "handleReady", () => {
      this.startOverlay.setVisible(true);
    });
    __publicField(this, "updateHud", (hud) => {
      var _a2, _b, _c, _d, _e;
      if (!hud) return;
      this.state.score = (_a2 = hud.score) != null ? _a2 : this.state.score;
      this.state.combo = (_b = hud.combo) != null ? _b : this.state.combo;
      this.state.speed = (_c = hud.speed) != null ? _c : this.state.speed;
      this.state.nitro = (_d = hud.nitro) != null ? _d : this.state.nitro;
      this.state.kettle = (_e = hud.kettle) != null ? _e : this.state.kettle;
      this.refreshHud();
    });
    __publicField(this, "updateStatus", (status) => {
      if (!status) return;
      this.state.paused = status.paused;
      if (status.paused) {
        this.pauseOverlay.setVisible(true);
      } else {
        this.pauseOverlay.setVisible(false);
      }
    });
    __publicField(this, "showToast", (payload) => {
      const message = (payload == null ? void 0 : payload.text) || this.translate(payload == null ? void 0 : payload.key);
      if (!message) return;
      this.toastQueue.push(message);
      if (!this.toastTween || !this.toastTween.isPlaying()) {
        this.displayNextToast();
      }
    });
    __publicField(this, "showFinish", (payload) => {
      var _a2, _b;
      this.finishOverlay.setVisible(true);
      this.finishTitle.setText(this.translate("finish.text"));
      this.finishScore.setText(`${this.translate("hud.score")}: ${(_a2 = payload == null ? void 0 : payload.score) != null ? _a2 : 0}`);
      this.finishRank.setText(this.translate("finish.rank").replace("{rank}", (_b = payload == null ? void 0 : payload.rank) != null ? _b : "C"));
    });
    __publicField(this, "onSandstormState", (data) => {
      if (data == null ? void 0 : data.active) {
        this.stormBadge.setVisible(true);
        this.stormBadge.setText(this.translate("toast.sandstorm"));
      } else {
        this.stormBadge.setText(this.translate("toast.stormClear"));
        this.time.delayedCall(1200, () => this.stormBadge.setVisible(false));
      }
    });
    this.shared = null;
  }
  init() {
    var _a2;
    this.shared = window.RAFIAH_SHARED || this.game.registry.get("shared") || {};
    this.language = (_a2 = this.shared.language) != null ? _a2 : "ar";
    this.eventsBus = this.shared.events || this.game.events;
    this.state = {
      paused: true,
      finished: false,
      combo: 0,
      score: 0,
      speed: 0,
      nitro: { active: false, timer: 0, cooldown: 0, duration: 1.25 },
      kettle: 0
    };
    this.mobileState = {
      left: false,
      right: false,
      reverse: false,
      brake: false,
      nitro: false,
      throttle: false
    };
  }
  create() {
    this.createHUD();
    this.createStartOverlay();
    this.createPauseMenu();
    this.createToast();
    this.createFinishOverlay();
    this.createPauseButton();
    this.createSandstormBadge();
    this.createMobileControls();
    this.registerEvents();
    this.updateLanguage();
  }
  registerEvents() {
    this.eventsBus.on(EVENT_UI_READY2, this.handleReady, this);
    this.eventsBus.on(EVENT_UI_HUD2, this.updateHud, this);
    this.eventsBus.on(EVENT_UI_STATUS2, this.updateStatus, this);
    this.eventsBus.on(EVENT_UI_TOAST2, this.showToast, this);
    this.eventsBus.on(EVENT_UI_FINISH2, this.showFinish, this);
    this.eventsBus.on(EVENT_UI_STORM2, this.onSandstormState, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupEvents());
  }
  cleanupEvents() {
    this.eventsBus.off(EVENT_UI_READY2, this.handleReady, this);
    this.eventsBus.off(EVENT_UI_HUD2, this.updateHud, this);
    this.eventsBus.off(EVENT_UI_STATUS2, this.updateStatus, this);
    this.eventsBus.off(EVENT_UI_TOAST2, this.showToast, this);
    this.eventsBus.off(EVENT_UI_FINISH2, this.showFinish, this);
    this.eventsBus.off(EVENT_UI_STORM2, this.onSandstormState, this);
  }
  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(100);
    this.speedText = this.add.text(32, 24, "0 km/h", {
      fontSize: 24,
      fontFamily: "system-ui, sans-serif",
      color: "#1D2A38",
      backgroundColor: "rgba(255,255,255,0.65)",
      padding: { x: 12, y: 8 }
    }).setScrollFactor(0);
    this.scoreText = this.add.text(this.scale.width - 32, 24, "0", {
      fontSize: 24,
      fontFamily: "system-ui, sans-serif",
      color: "#1D2A38",
      backgroundColor: "rgba(255,255,255,0.65)",
      padding: { x: 12, y: 8 }
    }).setOrigin(1, 0).setScrollFactor(0);
    this.comboText = this.add.text(this.scale.width - 32, 64, "Combo 0", {
      fontSize: 18,
      fontFamily: "system-ui, sans-serif",
      color: "#2E86AB",
      backgroundColor: "rgba(255,255,255,0.65)",
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setScrollFactor(0);
    this.nitroBarBg = this.add.rectangle(32, 80, 200, 18, 16777215, 0.5).setOrigin(0, 0).setScrollFactor(0);
    this.nitroBar = this.add.rectangle(32, 80, 200, 18, 3049131, 0.9).setOrigin(0, 0).setScale(0, 1).setScrollFactor(0);
    this.kettleIcon = this.add.image(this.scale.width / 2, this.scale.height - 80, "kettle-icon").setScale(0.35).setScrollFactor(0).setDepth(102);
  }
  createStartOverlay() {
    const { width, height } = this.scale;
    this.startOverlay = this.add.container(0, 0).setDepth(200);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0, 0.45);
    const title = this.add.text(width / 2, height / 2 - 120, "\u0637\u0639\u064A\u0633 \u2013 Rafiah Dune Adventure", {
      fontSize: 42,
      fontFamily: "system-ui, sans-serif",
      color: "#ffffff"
    }).setOrigin(0.5);
    const button = this.createButton(width / 2, height / 2 + 40, "menu.start", () => {
      this.startOverlay.setVisible(false);
      this.state.paused = false;
      this.eventsBus.emit(EVENT_START2);
    });
    this.startOverlay.add([bg, title, button]);
  }
  createPauseMenu() {
    const { width, height } = this.scale;
    this.pauseOverlay = this.add.container(0, 0).setDepth(210).setVisible(false);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0, 0.55);
    const panel = this.add.rectangle(width / 2, height / 2, 420, 420, 16312786, 0.96).setStrokeStyle(4, 6172950, 0.6);
    this.resumeButton = this.createButton(width / 2, height / 2 - 120, "menu.resume", () => {
      this.pauseOverlay.setVisible(false);
      this.state.paused = false;
      this.eventsBus.emit(EVENT_START2);
    });
    this.restartButton = this.createButton(width / 2, height / 2 - 40, "menu.restart", () => {
      this.pauseOverlay.setVisible(false);
      this.state.paused = true;
      this.eventsBus.emit(EVENT_RESTART2);
    });
    this.musicToggle = this.createToggle(width / 2, height / 2 + 40, "ui.mute", true, (enabled) => {
      this.eventsBus.emit(EVENT_AUDIO2, { type: "music", enabled });
    });
    this.sfxToggle = this.createToggle(width / 2, height / 2 + 110, "ui.mute", true, (enabled) => {
      this.eventsBus.emit(EVENT_AUDIO2, { type: "sfx", enabled });
    });
    this.langButton = this.createButton(width / 2, height / 2 + 180, "menu.language", () => {
      this.language = this.language === "ar" ? "en" : "ar";
      this.updateLanguage();
      this.eventsBus.emit(EVENT_LANGUAGE2, this.language);
    });
    this.pauseOverlay.add([
      bg,
      panel,
      this.resumeButton,
      this.restartButton,
      this.musicToggle.container,
      this.sfxToggle.container,
      this.langButton
    ]);
  }
  createToast() {
    this.toastText = this.add.text(this.scale.width / 2, this.scale.height * 0.18, "", {
      fontSize: 28,
      fontFamily: "system-ui, sans-serif",
      color: "#ffffff",
      backgroundColor: "rgba(46,134,171,0.85)",
      padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setDepth(205).setScrollFactor(0).setAlpha(0);
    this.toastQueue = [];
  }
  createFinishOverlay() {
    const { width, height } = this.scale;
    this.finishOverlay = this.add.container(0, 0).setDepth(220).setVisible(false);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0, 0.6);
    const panel = this.add.rectangle(width / 2, height / 2, 460, 360, 16312786, 0.98).setStrokeStyle(5, 6172950, 0.7);
    this.finishTitle = this.add.text(width / 2, height / 2 - 110, "", {
      fontSize: 36,
      fontFamily: "system-ui, sans-serif",
      color: "#2E3116"
    }).setOrigin(0.5);
    this.finishScore = this.add.text(width / 2, height / 2 - 30, "", {
      fontSize: 28,
      color: "#2E86AB",
      fontFamily: "system-ui, sans-serif"
    }).setOrigin(0.5);
    this.finishRank = this.add.text(width / 2, height / 2 + 40, "", {
      fontSize: 32,
      color: "#A86B38",
      fontFamily: "system-ui, sans-serif"
    }).setOrigin(0.5);
    const closeBtn = this.createButton(width / 2, height / 2 + 120, "menu.restart", () => {
      this.finishOverlay.setVisible(false);
      this.eventsBus.emit(EVENT_RESTART2);
    });
    this.finishOverlay.add([bg, panel, this.finishTitle, this.finishScore, this.finishRank, closeBtn]);
  }
  createPauseButton() {
    this.pauseButton = this.add.text(this.scale.width - 32, this.scale.height - 32, "II", {
      fontSize: 28,
      fontFamily: "system-ui, sans-serif",
      color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.4)",
      padding: { x: 12, y: 6 }
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(150).setInteractive({ useHandCursor: true });
    this.pauseButton.on("pointerdown", () => {
      this.pauseOverlay.setVisible(true);
      this.state.paused = true;
      this.eventsBus.emit(EVENT_PAUSE2);
    });
  }
  createSandstormBadge() {
    this.stormBadge = this.add.text(32, this.scale.height - 60, "", {
      fontSize: 20,
      fontFamily: "system-ui, sans-serif",
      color: "#F4C27A",
      backgroundColor: "rgba(46,49,22,0.65)",
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(160).setVisible(false);
  }
  createMobileControls() {
    var _a2, _b, _c;
    const mobileEnabled = (_c = (_b = (_a2 = this.shared.config) == null ? void 0 : _a2.mobile) == null ? void 0 : _b.buttons) != null ? _c : true;
    if (!mobileEnabled) return;
    const size = 96;
    const spacing = 16;
    const bottom = this.scale.height - spacing - size / 2;
    const makePad = (x, y, label, onPress) => {
      const pad = this.add.rectangle(x, y, size, size, 3049131, 0.85).setStrokeStyle(4, 0, 0.35).setScrollFactor(0).setDepth(140).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, {
        fontSize: 28,
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(141);
      pad.on("pointerdown", () => onPress(true));
      pad.on("pointerup", () => onPress(false));
      pad.on("pointerout", () => onPress(false));
      return { pad, text };
    };
    const leftX = spacing + size / 2;
    const rightX = leftX + size + spacing;
    const rightSideStart = this.scale.width - spacing - size / 2;
    const brakeX = rightSideStart;
    const nitroX = brakeX - size - spacing;
    makePad(leftX, bottom, "\u27F5", (state) => {
      this.mobileState.left = state;
      this.mobileState.reverse = state;
      this.pushMobileState();
    });
    makePad(rightX, bottom, "\u27F6", (state) => {
      this.mobileState.right = state;
      this.mobileState.throttle = state;
      this.pushMobileState();
    });
    makePad(brakeX, bottom, "\u26D4", (state) => {
      this.mobileState.brake = state;
      this.pushMobileState();
    });
    makePad(nitroX, bottom, "\u26A1", (state) => {
      this.mobileState.nitro = state;
      this.pushMobileState();
    });
  }
  pushMobileState() {
    this.eventsBus.emit(EVENT_MOBILE_INPUT2, { ...this.mobileState });
  }
  createButton(x, y, key, handler) {
    const button = this.add.text(x, y, "", {
      fontSize: 24,
      fontFamily: "system-ui, sans-serif",
      color: "#ffffff",
      backgroundColor: "#2E86AB",
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    button.on("pointerdown", handler);
    button.setData("key", key);
    return button;
  }
  createToggle(x, y, key, initial, handler) {
    const container = this.add.container(x, y).setScrollFactor(0);
    const bg = this.add.rectangle(0, 0, 210, 54, 3049131, 0.9).setStrokeStyle(4, 0, 0.35).setScrollFactor(0);
    const text = this.add.text(0, 0, "", {
      fontSize: 22,
      fontFamily: "system-ui, sans-serif",
      color: "#ffffff"
    }).setOrigin(0.5).setScrollFactor(0);
    container.add([bg, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-105, -27, 210, 54), Phaser.Geom.Rectangle.Contains);
    const toggleState = { value: initial };
    container.on("pointerdown", () => {
      toggleState.value = !toggleState.value;
      handler(toggleState.value);
      this.updateToggleLabel(text, toggleState.value);
    });
    container.getData = () => toggleState.value;
    container.setDataEnabled();
    container.data.set("key", key);
    this.updateToggleLabel(text, initial);
    return { container, text, state: toggleState };
  }
  updateToggleLabel(text, enabled) {
    text.setText(this.translate(enabled ? "ui.unmute" : "ui.mute"));
  }
  displayNextToast() {
    if (this.toastQueue.length === 0) return;
    const message = this.toastQueue.shift();
    this.toastText.setText(message);
    this.toastText.setAlpha(0);
    this.toastText.setVisible(true);
    this.toastTween = this.tweens.timeline({
      tweens: [
        { targets: this.toastText, alpha: 1, duration: 250 },
        { targets: this.toastText, alpha: 1, duration: 1500 },
        {
          targets: this.toastText,
          alpha: 0,
          duration: 350,
          onComplete: () => {
            this.toastText.setVisible(false);
            this.displayNextToast();
          }
        }
      ]
    });
  }
  refreshHud() {
    const speedLabel = `${Math.round(this.state.speed || 0)} km/h`;
    this.speedText.setText(speedLabel);
    this.scoreText.setText(`${this.translate("hud.score")}: ${this.state.score}`);
    this.comboText.setText(`${this.translate("hud.combo")} ${this.state.combo}`);
    const nitro = this.state.nitro;
    const progress = nitro.active ? Phaser.Math.Clamp(nitro.timer / (nitro.duration || 1), 0, 1) : 1 - Phaser.Math.Clamp(nitro.cooldown / (nitro.duration || 1), 0, 1);
    this.nitroBar.setScale(progress, 1);
    this.kettleIcon.setScale(0.35 + 0.05 * Phaser.Math.Clamp(this.state.kettle, 0, 1));
  }
  updateLanguage() {
    const startBtn = this.startOverlay.list.find((child) => child.getData && child.getData("key") === "menu.start");
    if (startBtn) startBtn.setText(this.translate("menu.start"));
    if (this.resumeButton) this.resumeButton.setText(this.translate("menu.resume"));
    if (this.restartButton) this.restartButton.setText(this.translate("menu.restart"));
    if (this.langButton) this.langButton.setText(this.translate("menu.language"));
    if (this.musicToggle) this.updateToggleLabel(this.musicToggle.text, this.musicToggle.state.value);
    if (this.sfxToggle) this.updateToggleLabel(this.sfxToggle.text, this.sfxToggle.state.value);
    this.refreshHud();
  }
  translate(key) {
    if (!key) return "";
    const map = this.cache.json.get(`i18n-${this.language}`) || {};
    return map[key] || key;
  }
};
var UIScene_default = UIScene;

// main.js
var _a;
var SHARED = (_a = window.RAFIAH_SHARED) != null ? _a : {
  config: null,
  i18n: { ar: {}, en: {} },
  language: "ar",
  reducedMotion: false,
  unlockedVehicles: /* @__PURE__ */ new Set(["gmc"])
};
window.RAFIAH_SHARED = SHARED;
var { Game, AUTO, Scale, Events } = Phaser;
(() => {
  var _a2, _b;
  try {
    const G = (_b = (_a2 = Phaser.GameObjects) == null ? void 0 : _a2.Graphics) == null ? void 0 : _b.prototype;
    if (!G) return;
    if (G.__rafiahBezierPatched) return;
    const origMoveTo = G.moveTo;
    const origLineTo = G.lineTo;
    G.moveTo = function(x, y) {
      this.__penX = x;
      this.__penY = y;
      return origMoveTo.call(this, x, y);
    };
    G.lineTo = function(x, y) {
      this.__penX = x;
      this.__penY = y;
      return origLineTo.call(this, x, y);
    };
    const drawQuadratic = function(cpx, cpy, x, y, segments = 24) {
      var _a3, _b2;
      const startX = (_a3 = this.__penX) != null ? _a3 : 0;
      const startY = (_b2 = this.__penY) != null ? _b2 : 0;
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(startX, startY),
        new Phaser.Math.Vector2(cpx, cpy),
        new Phaser.Math.Vector2(x, y)
      );
      const pts = curve.getPoints(Math.max(8, segments));
      for (let i = 1; i < pts.length; i += 1) {
        origLineTo.call(this, pts[i].x, pts[i].y);
        this.__penX = pts[i].x;
        this.__penY = pts[i].y;
      }
      return this;
    };
    if (typeof G.quadraticBezierTo !== "function") {
      G.quadraticBezierTo = drawQuadratic;
    }
    if (typeof G.quadraticCurveTo !== "function") {
      G.quadraticCurveTo = drawQuadratic;
    }
    G.__rafiahBezierPatched = true;
    console.log("\u2705 Graphics bezier polyfill applied");
  } catch (err) {
    console.warn("\u26A0\uFE0F Failed to polyfill Graphics beziers", err);
  }
})();
var gameConfig = {
  type: AUTO,
  width: 1280,
  height: 720,
  backgroundColor: "#101418",
  parent: document.body,
  pixelArt: true,
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: false
    }
  },
  scene: [PreloadScene_default, LevelScene_default, UIScene_default]
};
var game = new Game(gameConfig);
window.__RAFIAH_GAME = game;
console.log("\u2705 Phaser.Game created");
SHARED.game = game;
SHARED.events = SHARED.events || new Events.EventEmitter();
game.registry.set("shared", SHARED);
game.events.on("language-change", (lang) => {
  SHARED.language = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
});
game.events.on("reduced-motion", (enabled) => {
  SHARED.reducedMotion = !!enabled;
});
setTimeout(() => {
  const canvas = document.querySelector("canvas");
  if (canvas) {
    console.log(`\u2705 Canvas detected (${canvas.width}\xD7${canvas.height})`);
  } else {
    console.warn("\u26A0\uFE0F Canvas not found yet");
  }
}, 300);
bootstrapAsync().catch((err) => {
  console.warn("\u26A0\uFE0F bootstrapAsync encountered error", err);
});
async function bootstrapAsync() {
  console.log("\u23F3 Fetching configuration & translations");
  const [config, ar, en] = await Promise.all([
    fetchJSON("./config.json"),
    fetchJSON("./i18n/ar.json"),
    fetchJSON("./i18n/en.json")
  ]).catch((err) => {
    console.warn("\u26A0\uFE0F config fallback used", err);
    return [
      { audio: { music: true, sfx: true }, mode: { familySafe: true }, vehicle: "gmc" },
      {},
      {}
    ];
  });
  SHARED.config = config;
  SHARED.i18n = { ar, en };
  SHARED.language = SHARED.language || "ar";
  SHARED.unlockedVehicles = new Set(config.vehicle === "prado" ? ["gmc", "prado"] : ["gmc"]);
  game.registry.set("config", config);
  game.registry.set("lang", SHARED.language);
  game.registry.set("language", SHARED.language);
  game.registry.set("level-data", null);
  game.events.emit("rafiah-shared-ready", SHARED);
  console.log("\u2705 config loaded");
  document.dispatchEvent(new CustomEvent("rafiah:config-loaded", { detail: config }));
  document.documentElement.lang = SHARED.language;
  document.documentElement.dir = SHARED.language === "ar" ? "rtl" : "ltr";
}
async function fetchJSON(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} ${response.status} ${response.statusText}`);
  }
  return response.json();
}
window.addEventListener("rafiah-level-ready", () => {
  console.log("\u2705 Level visible (canvas present)");
  console.log("\u2705 Boot OK");
});
