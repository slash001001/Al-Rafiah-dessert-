import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { createCar, Car } from '../systems/car';
import { buildTerrain, sampleHeight, TerrainProfile } from '../systems/terrain';

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
  private readonly targetDistance = 1500;
  private readonly startX = 120;
  private ended = false;
  private pickups: Phaser.Physics.Matter.Sprite[] = [];

  constructor() {
    super('HillClimbScene');
  }

  create() {
    this.ended = false;
    this.fuel = 100;
    this.coins = 0;
    this.timeLeft = 225;

    this.addSky();
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

    this.hud = new HUD(this);
    this.hud.showBanner('Climb before sunset. Arrows / A-D to drive.');
    this.hud.update({ fuel: this.fuel, distance: 0, target: this.targetDistance, coins: this.coins, timeLeft: this.timeLeft });

    this.keys = this.input.keyboard?.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D' }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.matter.world.on('collisionstart', this.handleCollision, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.matter.world.off('collisionstart', this.handleCollision, this);
    });
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
  }

  private getInputDirection() {
    const left = this.keys?.left?.isDown || this.keys?.a?.isDown;
    const right = this.keys?.right?.isDown || this.keys?.d?.isDown;
    if (left && !right) return -1;
    if (right && !left) return 1;
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
    const sun = this.add.circle(140, 120, 60, 0xf9d976, 0.8);
    sun.setScrollFactor(0.2);
    sun.setDepth(-5);
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
}
