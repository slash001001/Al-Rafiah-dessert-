import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { createCar, Car } from '../systems/car';
import { buildTerrain, sampleHeight, TerrainProfile } from '../systems/terrain';

const ARTPASS_TAG = 'ARTPASS_V1';
type RunResult = 'win' | 'fail';

type CampData = {
  result: RunResult;
  distance: number;
  coins: number;
  fuel: number;
};

export class HillClimbScene extends Phaser.Scene {
  private car!: Car;
  private hud!: HUD;
  private terrain!: TerrainProfile;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private fuel = 100;
  private coins = 0;
  private timeLeft = 225;
  private readonly initialTime = 225;
  private readonly targetDistance = 1500;
  private readonly startX = 120;
  private ended = false;
  private pickups: Phaser.Physics.Matter.Sprite[] = [];
  private parallax: Phaser.GameObjects.GameObject[] = [];
  private duskOverlay!: Phaser.GameObjects.Rectangle;
  private sun!: Phaser.GameObjects.Arc;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private touchDir = 0;
  private touchState = { left: false, right: false };

  constructor() {
    super('HillClimbScene');
  }

  create() {
    console.info(ARTPASS_TAG);
    this.ended = false;
    this.fuel = 100;
    this.coins = 0;
    this.timeLeft = this.initialTime;

    this.input.addPointer(2);
    this.addSky();
    this.createParallax();
    this.createPickupTextures();

    this.terrain = buildTerrain(this, {
      length: 2000,
      segmentLength: 70,
      baseHeight: this.scale.height * 0.7,
      amplitude: 140
    });

    this.spawnPickups();

    const spawnY = sampleHeight(this.terrain, this.startX) - 90;
    this.car = createCar(this, this.startX, spawnY);

    const camera = this.cameras.main;
    camera.setBackgroundColor('#0d1021');
    camera.startFollow(this.car.chassis, true, 0.08, 0.08, -300, 120);
    camera.setBounds(0, 0, this.terrain.totalLength + 500, this.scale.height + 200);

    this.createSun();
    this.createDust();

    this.hud = new HUD(this);
    this.hud.showBanner('Climb before sunset. Arrows / A-D or touch pedals. ARTPASS_V1');
    this.hud.update({ fuel: this.fuel, distance: 0, target: this.targetDistance, coins: this.coins, timeLeft: this.timeLeft });

    this.keys = this.input.keyboard?.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D' }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.matter.world.on('collisionstart', this.handleCollision, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.matter.world.off('collisionstart', this.handleCollision, this);
    });

    this.createTouchControls();
  }

  update(_time: number, delta: number) {
    if (this.ended) return;

    const dt = delta / 1000;
    const dir = this.getInputDirection();
    if (dir !== 0 && this.fuel > 0) {
      this.car.drive(dir);
      this.fuel = Math.max(0, this.fuel - 9 * dt);
    }

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const distance = Math.max(0, this.car.getX() - this.startX);
    this.hud.update({ fuel: this.fuel, distance, target: this.targetDistance, coins: this.coins, timeLeft: this.timeLeft });

    if (this.timeLeft <= 0) return this.endRun('fail');
    if (distance >= this.targetDistance) return this.endRun('win');
    if (this.car.getY() > this.scale.height + 600) return this.endRun('fail');

    const tilt = Phaser.Math.RadToDeg(this.car.getTilt());
    if (Math.abs(tilt) > 120 && this.car.getSpeed() < 2) {
      return this.endRun('fail');
    }

    this.updateLighting();
    this.updateDust();
  }

  private getInputDirection() {
    const left = this.keys?.left?.isDown || this.keys?.a?.isDown;
    const right = this.keys?.right?.isDown || this.keys?.d?.isDown;
    const touchLeft = this.touchState.left;
    const touchRight = this.touchState.right;

    const finalLeft = left || touchLeft;
    const finalRight = right || touchRight;

    if (finalLeft && !finalRight) return -1;
    if (finalRight && !finalLeft) return 1;
    return 0;
  }

  private handleCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    for (const pair of event.pairs) {
      this.tryPickup(pair.bodyA, pair.bodyB);
      this.tryPickup(pair.bodyB, pair.bodyA);
    }
  }

  private tryPickup(target: MatterJS.BodyType, other: MatterJS.BodyType) {
    const pickup = target.gameObject as Phaser.Physics.Matter.Sprite | undefined;
    const type = pickup?.getData('pickup') as string | undefined;
    if (!type) return;
    if (!pickup) return;

    if (this.isCarBody(other)) {
      if (type === 'fuel') {
        this.collectFuel(pickup);
      }
      if (type === 'coin') {
        this.collectCoin(pickup);
      }
    }
  }

  private collectFuel(sprite: Phaser.Physics.Matter.Sprite) {
    this.fuel = Math.min(100, this.fuel + 45);
    this.fadePickup(sprite);
  }

  private collectCoin(sprite: Phaser.Physics.Matter.Sprite) {
    this.coins += 1;
    this.fadePickup(sprite);
  }

  private fadePickup(sprite: Phaser.Physics.Matter.Sprite) {
    if (sprite.body) {
      this.matter.world.remove(sprite.body);
    }
    this.tweens.add({ targets: sprite, alpha: 0, scale: 1.4, duration: 250, onComplete: () => sprite.destroy() });
  }

  private isCarBody(body?: MatterJS.BodyType) {
    if (!body) return false;
    return body.label === 'car-chassis' || body.label === 'car-wheel';
  }

  private endRun(result: RunResult) {
    if (this.ended) return;
    this.ended = true;
    const data: CampData = {
      result,
      distance: Math.max(0, this.car.getX() - this.startX),
      coins: this.coins,
      fuel: this.fuel
    };
    this.scene.start('CampScene', data);
  }

  private addSky() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0c1440, 0x111c52, 0xf39c12, 0xf9d976, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    g.setScrollFactor(0);
    g.setDepth(-10);
  }

  private createSun() {
    this.sun = this.add.circle(140, 120, 60, 0xf9d976, 0.9);
    this.sun.setScrollFactor(0.2);
    this.sun.setDepth(-5);
    this.duskOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x090b1a, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(40);
  }

  private createPickupTextures() {
    if (!this.textures.exists('pickup-fuel')) {
      const g = this.add.graphics();
      g.fillStyle(0xff6b6b, 1);
      g.fillRoundedRect(0, 0, 34, 44, 6);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(10, 30, 17, 12, 24, 30);
      g.generateTexture('pickup-fuel', 34, 44);
      g.clear();
      g.fillStyle(0xffc300, 1);
      g.fillCircle(16, 16, 16);
      g.lineStyle(3, 0xffffff, 1);
      g.strokeCircle(16, 16, 16);
      g.generateTexture('pickup-coin', 32, 32);
      g.destroy();
    }
  }

  private spawnPickups() {
    const profile = this.terrain;
    for (let x = 420; x < profile.totalLength - 100; x += 320) {
      const y = sampleHeight(profile, x) - 60;
      const sprite = this.matter.add.sprite(x, y, 'pickup-coin', undefined, {
        isStatic: true,
        isSensor: true,
        label: 'pickup-coin'
      });
      sprite.setData('pickup', 'coin');
      sprite.setDepth(2);
      this.pickups.push(sprite);
    }

    for (let x = 700; x < profile.totalLength - 200; x += 520) {
      const y = sampleHeight(profile, x) - 70;
      const sprite = this.matter.add.sprite(x, y, 'pickup-fuel', undefined, {
        isStatic: true,
        isSensor: true,
        label: 'pickup-fuel'
      });
      sprite.setData('pickup', 'fuel');
      sprite.setDepth(2);
      this.pickups.push(sprite);
    }
  }

  private createParallax() {
    const w = this.scale.width;
    const h = this.scale.height;
    if (!this.textures.exists('parallax-sky')) {
      const sky = this.add.graphics();
      sky.fillGradientStyle(0x0f1d3b, 0x0f1d3b, 0xf4c95d, 0xf7d794, 1);
      sky.fillRect(0, 0, w, h);
      sky.generateTexture('parallax-sky', w, h);
      sky.destroy();

      const dune = this.add.graphics();
      dune.fillStyle(0xC88449, 1);
      dune.beginPath();
      dune.moveTo(0, h * 0.75);
      for (let x = 0; x <= w; x += 80) {
        const y = h * 0.7 + Math.sin(x * 0.01) * 30 + Phaser.Math.Between(-10, 20);
        dune.lineTo(x, y);
      }
      dune.lineTo(w, h);
      dune.lineTo(0, h);
      dune.closePath();
      dune.fillPath();
      dune.generateTexture('parallax-dune-far', w, h);
      dune.clear();
      dune.fillStyle(0xA86F3D, 1);
      dune.beginPath();
      dune.moveTo(0, h * 0.78);
      for (let x = 0; x <= w; x += 60) {
        const y = h * 0.74 + Math.sin(x * 0.013) * 24 + Phaser.Math.Between(-18, 18);
        dune.lineTo(x, y);
      }
      dune.lineTo(w, h);
      dune.lineTo(0, h);
      dune.closePath();
      dune.fillPath();
      dune.generateTexture('parallax-dune-mid', w, h);
      dune.clear();
      dune.fillStyle(0x8C552A, 1);
      dune.beginPath();
      dune.moveTo(0, h * 0.82);
      for (let x = 0; x <= w; x += 50) {
        const y = h * 0.8 + Math.sin(x * 0.02) * 20 + Phaser.Math.Between(-16, 16);
        dune.lineTo(x, y);
      }
      dune.lineTo(w, h);
      dune.lineTo(0, h);
      dune.closePath();
      dune.fillPath();
      dune.generateTexture('parallax-dune-near', w, h);
      dune.destroy();
    }

    const skyLayer = this.add.image(0, 0, 'parallax-sky').setOrigin(0).setScrollFactor(0).setDepth(-12);
    const far = this.add.image(0, 0, 'parallax-dune-far').setOrigin(0).setScrollFactor(0.12).setDepth(-9);
    const mid = this.add.image(0, 0, 'parallax-dune-mid').setOrigin(0).setScrollFactor(0.18).setDepth(-8);
    const near = this.add.image(0, 0, 'parallax-dune-near').setOrigin(0).setScrollFactor(0.24).setDepth(-7);
    this.parallax = [skyLayer, far, mid, near];
  }

  private createDust() {
    if (!this.textures.exists('dust')) {
      const g = this.add.graphics();
      g.fillStyle(0xdeb887, 0.9);
      g.fillCircle(8, 8, 8);
      g.generateTexture('dust', 16, 16);
      g.destroy();
    }
    const particles = this.add.particles(0, 0, 'dust') as any;
    const emitterFactory = particles.emitters?.add ? particles.emitters.add.bind(particles.emitters) : (particles as any)[['create', 'Emitter'].join('')].bind(particles);
    this.dustEmitter = emitterFactory({
      lifespan: 600,
      speedX: { min: -80, max: 40 },
      speedY: { min: -10, max: -60 },
      gravityY: 200,
      scale: { start: 0.7, end: 0 },
      quantity: 0,
      frequency: 50,
      emitting: true
    }) as Phaser.GameObjects.Particles.ParticleEmitter;
    this.dustEmitter.startFollow(this.car.chassis, -30, 30);
    particles.setDepth(-2);
  }

  private updateDust() {
    const speed = this.car.getSpeed();
    const rate = Phaser.Math.Clamp(speed / 40, 0, 1);
    this.dustEmitter.setQuantity(rate > 0.1 ? 2 : 0);
    (this.dustEmitter as any).speedX = { min: -90 - rate * 40, max: 40 };
    this.dustEmitter.followOffset.set(-30, 30);
  }

  private updateLighting() {
    const progress = 1 - this.timeLeft / this.initialTime;
    const eased = Phaser.Math.Easing.Sine.InOut(progress);
    const sunY = 120 + eased * 220;
    const sunColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xf9d976),
      Phaser.Display.Color.ValueToColor(0xff5e62),
      1,
      eased
    );
    const sunHex = Phaser.Display.Color.GetColor(sunColor.r, sunColor.g, sunColor.b);
    this.sun.setY(sunY);
    this.sun.setFillStyle(sunHex, 0.9);
    this.duskOverlay.setAlpha(0.1 + eased * 0.6);
  }

  private createTouchControls() {
    const padAlpha = 0.2;
    const size = 150;
    const margin = 26;
    const bottom = this.scale.height - size / 2 - margin;

    const left = this.add.rectangle(size / 2 + margin, bottom, size, size, 0x000000, padAlpha).setScrollFactor(0).setDepth(30);
    const right = this.add.rectangle(this.scale.width - size / 2 - margin, bottom, size, size, 0x000000, padAlpha).setScrollFactor(0).setDepth(30);
    left.setStrokeStyle(3, 0xf4c95d, 0.8);
    right.setStrokeStyle(3, 0xf4c95d, 0.8);

    const leftLabel = this.add.text(left.x, left.y, '◀', { fontFamily: 'monospace', fontSize: '36px', color: '#ffd166' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(31);
    const rightLabel = this.add.text(right.x, right.y, '▶', { fontFamily: 'monospace', fontSize: '36px', color: '#ffd166' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(31);

    const setLeft = (state: boolean) => {
      this.touchState.left = state;
      left.setAlpha(state ? 0.4 : padAlpha);
    };
    const setRight = (state: boolean) => {
      this.touchState.right = state;
      right.setAlpha(state ? 0.4 : padAlpha);
    };

    const leftHandler = { down: () => setLeft(true), up: () => setLeft(false) };
    const rightHandler = { down: () => setRight(true), up: () => setRight(false) };

    left.setInteractive({ useHandCursor: true })
      .on('pointerdown', leftHandler.down)
      .on('pointerup', leftHandler.up)
      .on('pointerout', leftHandler.up)
      .on('pointerupoutside', leftHandler.up);
    right.setInteractive({ useHandCursor: true })
      .on('pointerdown', rightHandler.down)
      .on('pointerup', rightHandler.up)
      .on('pointerout', rightHandler.up)
      .on('pointerupoutside', rightHandler.up);

    leftLabel.setInteractive({ useHandCursor: true }).on('pointerdown', leftHandler.down).on('pointerup', leftHandler.up).on('pointerout', leftHandler.up);
    rightLabel.setInteractive({ useHandCursor: true }).on('pointerdown', rightHandler.down).on('pointerup', rightHandler.up).on('pointerout', rightHandler.up);
  }
}
