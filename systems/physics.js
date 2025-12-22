import Phaser from 'phaser';

const Matter = Phaser.Physics.Matter.Matter;
const { Bodies, Body, Constraint } = Matter;

export const CAR_CONSTANTS = Object.freeze({
  bodyWidth: 180,
  bodyHeight: 70,
  wheelRadius: 26,
  wheelbase: 120,
  bodyMass: 6.0,
  wheelMass: 1.4,
  restitution: 0.04,
  linearDamping: 0.02,
  suspensionStiffness: 0.21,
  suspensionDamping: 0.23,
  suspensionTravel: 18,
  driveForce: 0.0028,
  airControlTorque: 0.00018
});

export class VehicleController {
  constructor(scene, spawn, { textureKey = 'car-gmc', nitroConfig, modeConfig }) {
    this.scene = scene;
    this.textureKey = textureKey;
    this.nitroConfig = {
      durationSec: 1.25,
      cooldownSec: 4,
      boostTorque: 1.65,
      maxSpeedMul: 1.1,
      ...(nitroConfig || {})
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
      label: 'vehicle-chassis'
    });
    Body.setMass(this.chassis, CAR_CONSTANTS.bodyMass);
    Body.setInertia(this.chassis, Infinity);
    Body.setCentre(this.chassis, { x: 0, y: 10 }, false);

    const wheelOptions = {
      restitution: 0.02,
      friction: 0.85,
      frictionStatic: 0.9,
      density: 0.01,
      label: 'vehicle-wheel'
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
      label: 'vehicle-suspension'
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
    this.playAnimation('car_idle');
  }

  playAnimation(animKey) {
    const key = `${this.textureKey}-${animKey}`;
    if (this.scene.anims.exists(key)) {
      this.sprite.play({ key, repeat: this.scene.anims.get(key).repeat }, true);
    }
  }

  update(dt, input, terrain) {
    const deltaSec = dt / 1000;
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
      const brakeForce = baseForce * 0.8 + Math.abs(this.chassis.velocity.x) * 0.0008;
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
      const damp = (currentSpeed - maxSpeed) * 0.0008;
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
    wheels.forEach(wheel => {
      wheel.friction = extraFriction;
      wheel.frictionStatic = extraFriction;
    });
  }

  applyNitro(deltaSec, nitroPressed) {
    if (nitroPressed && !this.nitro.active && this.nitro.cooldown <= 0) {
      this.nitro.active = true;
      this.nitro.timer = this.nitroConfig.durationSec;
      this.scene.events.emit('vehicle-nitro', { active: true });
    }
    if (this.nitro.active) {
      this.nitro.timer -= deltaSec;
      if (this.nitro.timer <= 0) {
        this.nitro.active = false;
        this.nitro.cooldown = this.nitroConfig.cooldownSec;
        this.scene.events.emit('vehicle-nitro', { active: false });
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
      this.playAnimation('car_boost');
    } else if (!this.isGrounded) {
      this.playAnimation(absVy > 2 ? 'car_jump' : 'car_bounce');
    } else if (this.handbrakeTimer > 0.1) {
      this.playAnimation('car_drift');
    } else if (absVx > 4) {
      this.playAnimation('car_accel');
    } else if (absVx > 1.2) {
      this.playAnimation('car_bounce');
    } else if (absVx > 0.2) {
      this.playAnimation('car_idle');
    } else {
      this.playAnimation('car_idle');
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
}

export function sampleSlope(segments, x) {
  let closest = null;
  segments.forEach(seg => {
    if (x >= seg.x1 && x <= seg.x2) {
      closest = seg;
    }
  });
  return closest ?? segments[segments.length - 1];
}
