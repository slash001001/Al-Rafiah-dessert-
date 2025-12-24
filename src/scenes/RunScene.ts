import Phaser from 'phaser';

type VehicleType = 'gmc' | 'prado';

interface RunData {
  vehicle: VehicleType;
}

interface ChaosEvent {
  key: string;
  label: string;
  duration: number;
  effect: () => void;
}

const VEHICLES: Record<VehicleType, { color: number; shadow: number; accel: number; drag: number; max: number; fuelUse: number }> = {
  gmc: { color: 0x111111, shadow: 0x000000, accel: 420, drag: 220, max: 320, fuelUse: 0.25 },
  prado: { color: 0x6b4a2d, shadow: 0x2d1a0a, accel: 520, drag: 180, max: 360, fuelUse: 0.2 }
};

const ITEM_KEYS = ['salt', 'water', 'charcoal', 'lighter', 'hummus'] as const;
type ItemKey = (typeof ITEM_KEYS)[number];

export default class RunScene extends Phaser.Scene {
  private vehicle: VehicleType = 'gmc';
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private worldWidth = 4200;
  private worldHeight = 1600;
  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private hudSpeed!: Phaser.GameObjects.Text;
  private hudFuel!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudItems!: Phaser.GameObjects.Text;
  private fuel = 110;
  private speed = 0;
  private angle = -0.02;
  private sunset = 210; // seconds ~3.5 min
  private elapsed = 0;
  private inventory: Set<ItemKey> = new Set();
  private isFinished = false;
  private finishZone!: Phaser.GameObjects.Rectangle;
  private eventsQueue: ChaosEvent[] = [];
  private activeEffects: Set<string> = new Set();
  private log: string[] = [];
  private lastTrail = 0;

  constructor() {
    super('RunScene');
  }

  init(data: RunData) {
    this.vehicle = data?.vehicle || 'gmc';
  }

  preload() {
    this.createTextures();
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.bgFar = this.add.tileSprite(width / 2, height / 2, width, height, 'sand-far').setScrollFactor(0);
    this.bgNear = this.add.tileSprite(width / 2, height / 2, width, height, 'sand-near').setScrollFactor(0);

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    const stats = VEHICLES[this.vehicle];
    this.player = this.physics.add.image(180, this.worldHeight / 2, `car-${this.vehicle}`);
    this.player.setDamping(true).setDrag(stats.drag).setMaxVelocity(stats.max).setAngularDrag(600);
    this.player.setSize(48, 24);
    this.player.setCollideWorldBounds(true);

    this.createStops();
    this.createDunes();
    this.createFinish();
    this.createHUD();
    this.createTrailTimer();

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      H: Phaser.Input.Keyboard.KeyCodes.H
    }) as any;

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(220, 140);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.scheduleChaos();

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isFinished) return;
        this.sunset -= 1;
        if (this.sunset <= 0) {
          this.finishRun(false, 'غابت الشمس قبل القعدة');
        }
      }
    });
  }

  private createTextures() {
    const g = this.add.graphics();
    g.fillStyle(0x0b0f14);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('void', 2, 2);
    g.clear();

    const makeNoise = (key: string, color: number) => {
      const size = 128;
      g.clear();
      for (let i = 0; i < 350; i++) {
        const x = Phaser.Math.Between(0, size);
        const y = Phaser.Math.Between(0, size);
        const alpha = Phaser.Math.FloatBetween(0.03, 0.12);
        g.fillStyle(color, alpha);
        g.fillRect(x, y, 2, 2);
      }
      g.generateTexture(key, size, size);
    };
    makeNoise('sand-far', 0xf0d9a1);
    makeNoise('sand-near', 0xd9a066);

    const makeCar = (key: string, body: number, shadow: number) => {
      g.clear();
      g.fillStyle(shadow, 0.6);
      g.fillRoundedRect(4, 12, 84, 34, 8);
      g.fillStyle(body, 1);
      g.fillRoundedRect(0, 8, 90, 36, 8);
      g.fillStyle(0x1e1e1e, 1);
      g.fillRect(8, 12, 74, 16);
      g.fillStyle(0xd1d1d1);
      g.fillRect(16, 16, 16, 12);
      g.fillRect(58, 16, 16, 12);
      g.generateTexture(key, 92, 52);
    };
    makeCar('car-gmc', VEHICLES.gmc.color, VEHICLES.gmc.shadow);
    makeCar('car-prado', VEHICLES.prado.color, VEHICLES.prado.shadow);

    g.clear();
    g.fillStyle(0x70543c);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0x4a3424);
    g.fillCircle(10, 10, 10);
    g.generateTexture('rock', 24, 24);

    g.clear();
    g.fillStyle(0xffffff);
    g.fillCircle(8, 8, 8);
    g.generateTexture('puff', 16, 16);

    g.clear();
    g.fillStyle(0x1f2937, 0.7);
    g.fillRoundedRect(0, 0, 210, 86, 8);
    g.generateTexture('hud-panel', 210, 86);

    g.clear();
    g.fillStyle(0xffe066);
    g.fillRect(0, 0, 120, 40);
    g.fillStyle(0x111111);
    g.fillRect(0, 18, 120, 6);
    g.generateTexture('finish', 120, 40);
  }

  private createHUD() {
    const panel = this.add.image(18, 18, 'hud-panel').setOrigin(0).setScrollFactor(0);
    this.hudSpeed = this.add.text(28, 26, 'سرعة: 0', this.hudStyle()).setScrollFactor(0);
    this.hudFuel = this.add.text(28, 48, 'بنزين: 100', this.hudStyle()).setScrollFactor(0);
    this.hudTime = this.add.text(28, 70, 'غروب: 0:00', this.hudStyle()).setScrollFactor(0);
    this.hudItems = this.add.text(240, 30, 'أغراض: -', this.hudStyle()).setScrollFactor(0);
    this.children.bringToTop(panel);
  }

  private hudStyle() {
    return {
      fontSize: '16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e5e7eb'
    };
  }

  private createStops() {
    const stops: { x: number; label: string; grants: ItemKey[] }[] = [
      { x: 420, label: 'محطة بنزين', grants: ['water'] },
      { x: 750, label: 'مطعم', grants: ['hummus'] },
      { x: 1050, label: 'بقالة', grants: ['salt', 'lighter'] }
    ];
    stops.forEach((stop) => {
      const pad = this.add.rectangle(stop.x, this.worldHeight / 2 - 120, 120, 80, 0x2e86ab, 0.5);
      this.physics.add.existing(pad, true);
      this.add.text(stop.x, this.worldHeight / 2 - 170, stop.label, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      this.physics.add.overlap(this.player, pad, () => {
        stop.grants.forEach((i) => this.inventory.add(i));
        this.log.push(`أخذت ${stop.grants.join(', ')}`);
        this.addFloatingText(pad.x, pad.y - 30, 'خذنا المطلوب');
      });
    });
  }

  private createDunes() {
    const rocks = this.physics.add.staticGroup();
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(1500, this.worldWidth - 400);
      const y = Phaser.Math.Between(200, this.worldHeight - 200);
      rocks.create(x, y, 'rock').setScale(1.2).refreshBody();
    }
    this.physics.add.collider(this.player, rocks, () => {
      this.speed *= 0.6;
      this.cameras.main.shake(120, 0.002);
      this.log.push('دعست صخرة');
    });
  }

  private createFinish() {
    const zoneX = this.worldWidth - 200;
    this.finishZone = this.add.rectangle(zoneX, this.worldHeight / 2, 140, 220, 0x4ade80, 0.2);
    this.add.image(zoneX, this.worldHeight / 2 - 80, 'finish').setAngle(-4);
    const flagText = this.add.text(zoneX, this.worldHeight / 2 + 60, 'قمة الطعس', {
      fontSize: '18px',
      color: '#fef08a',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    this.physics.add.existing(this.finishZone, true);
    this.physics.add.overlap(this.player, this.finishZone, () => this.finishRun(true, 'وصلت قبل الغروب'));
  }

  private createTrailTimer() {
    this.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => {
        if (!this.player || this.isFinished) return;
        const puff = this.add.image(this.player.x, this.player.y, 'puff').setTint(0xf1c27d).setAlpha(0.6);
        this.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 2,
          duration: 500,
          onComplete: () => puff.destroy()
        });
      }
    });
  }

  private scheduleChaos() {
    const possible = ['stuck', 'overheat', 'flat', 'rain', 'heli', 'camel', 'dogs'];
    Phaser.Utils.Array.Shuffle(possible);
    const count = Phaser.Math.Between(3, 5);
    let t = 14;
    for (let i = 0; i < count; i++) {
      const key = possible[i % possible.length];
      const delay = Phaser.Math.Between(12, 24);
      t += delay;
      this.time.addEvent({
        delay: t * 1000,
        callback: () => this.triggerEvent(key)
      });
    }
  }

  private triggerEvent(key: string) {
    if (this.isFinished) return;
    switch (key) {
      case 'stuck':
        this.applyEffect('stuck', 4500, 'تغريز خفيف، هد اللعب');
        break;
      case 'overheat':
        this.applyEffect('overheat', 6000, 'حرارة — النيترو موقف');
        break;
      case 'flat':
        this.applyEffect('flat', 8000, 'بنشر، السرعة مقفلة');
        break;
      case 'rain':
        this.applyEffect('rain', 9000, 'مطر — الدعسة تزحلق');
        break;
      case 'heli':
        this.log.push('هيلوكبتر تدريب: افتتاح موسم الرافعية');
        this.cameras.main.shake(160, 0.004);
        this.addFloatingText(this.player.x, this.player.y - 60, 'هيلوكبتر التدريب عدى');
        break;
      case 'camel':
        this.spawnCamel();
        break;
      case 'dogs':
        this.spawnDogs();
        break;
      default:
        break;
    }
  }

  private applyEffect(key: string, duration: number, msg: string) {
    this.activeEffects.add(key);
    this.log.push(msg);
    this.addFloatingText(this.player.x, this.player.y - 60, msg);
    this.time.delayedCall(duration, () => this.activeEffects.delete(key));
  }

  private spawnCamel() {
    const y = Phaser.Math.Between(200, this.worldHeight - 200);
    const camel = this.add.rectangle(-60, y, 80, 44, 0xd4a373).setStrokeStyle(2, 0x8b5e34);
    this.physics.add.existing(camel, false);
    (camel.body as Phaser.Physics.Arcade.Body).setVelocityX(180);
    this.physics.add.overlap(this.player, camel, () => {
      this.speed *= 0.5;
      this.cameras.main.shake(100, 0.002);
    });
  }

  private spawnDogs() {
    const y = this.worldHeight / 2 + Phaser.Math.Between(-80, 80);
    const dog = this.add.rectangle(this.player.x + 200, y, 50, 28, 0xcbd5e1).setStrokeStyle(2, 0x475569);
    this.physics.add.existing(dog, false);
    const body = dog.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(-120);
    this.addFloatingText(dog.x, dog.y - 30, 'كلاب شوارع — زمّر لهم');
    this.time.addEvent({
      delay: 200,
      repeat: 10,
      callback: () => {
        if (this.keys.H.isDown) {
          body.setVelocityX(200);
          body.setVelocityY(Phaser.Math.Between(-60, 60));
          dog.setFillStyle(0x22c55e);
        }
      }
    });
    this.physics.add.overlap(this.player, dog, () => {
      this.speed *= 0.7;
    });
  }

  private addFloatingText(x: number, y: number, msg: string) {
    const t = this.add.text(x, y, msg, {
      fontSize: '16px',
      color: '#fcd34d',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 1200,
      onComplete: () => t.destroy()
    });
  }

  update(_time: number, delta: number) {
    if (this.isFinished) return;
    const dt = delta / 1000;
    this.handleDrive(dt);
    this.updateHUD();
    this.bgFar.tilePositionX += this.speed * dt * 0.1;
    this.bgNear.tilePositionX += this.speed * dt * 0.2;
  }

  private handleDrive(dt: number) {
    const stats = VEHICLES[this.vehicle];
    const forward = this.cursors.up?.isDown || this.keys.W.isDown;
    const backward = this.cursors.down?.isDown || this.keys.S.isDown;
    const left = this.cursors.left?.isDown || this.keys.A.isDown;
    const right = this.cursors.right?.isDown || this.keys.D.isDown;
    const nitro = this.keys.SHIFT.isDown && !this.activeEffects.has('overheat') && this.fuel > 0;

    let accel = forward ? stats.accel : 0;
    if (backward) accel -= stats.accel * 0.8;
    if (this.activeEffects.has('stuck')) accel *= 0.45;
    if (this.activeEffects.has('rain')) accel *= 0.65;
    if (nitro) accel *= 1.25;

    const drag = stats.drag + (this.activeEffects.has('flat') ? 260 : 0);
    const max = this.activeEffects.has('flat') ? stats.max * 0.6 : stats.max;
    this.speed += accel * dt;
    this.speed -= this.speed * drag * 0.0018 * dt;
    if (this.speed < 0) this.speed = 0;
    if (this.speed > max) this.speed = max;

    let turn = 0;
    if (left) turn -= 1;
    if (right) turn += 1;
    const turnRate = (0.9 + this.speed / (max || 1)) * 1.2;
    this.angle += turn * turnRate * dt;

    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.player.setVelocity(vx, vy);
    this.player.setRotation(this.angle + Math.PI / 2);

    const fuelUse = stats.fuelUse * (forward ? 1.1 : 0.4) + (nitro ? 0.8 : 0);
    this.fuel -= fuelUse * dt;
    if (this.fuel < 0) {
      this.fuel = 0;
      this.speed *= 0.96;
    }
    if (nitro && this.fuel <= 5) {
      this.log.push('النيترو أحرق البنزين');
    }
  }

  private updateHUD() {
    this.elapsed += this.game.loop.delta / 1000;
    const mins = Math.floor(this.sunset / 60);
    const secs = Math.max(0, Math.floor(this.sunset % 60));
    this.hudSpeed.setText(`سرعة: ${Math.round(this.speed)}`);
    this.hudFuel.setText(`بنزين: ${this.fuel.toFixed(0)}%`);
    this.hudTime.setText(`الغروب: ${mins}:${secs.toString().padStart(2, '0')}`);
    const items = ITEM_KEYS.filter((i) => this.inventory.has(i));
    this.hudItems.setText(`أغراض: ${items.length ? items.join(', ') : 'لسه ناقص'}`);
  }

  private finishRun(success: boolean, reason: string) {
    if (this.isFinished) return;
    this.isFinished = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CampScene', {
        success,
        items: Array.from(this.inventory),
        timeSpent: this.elapsed,
        vehicle: this.vehicle,
        log: this.log,
        reason
      });
    });
  }
}
