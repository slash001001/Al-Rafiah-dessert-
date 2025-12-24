import Phaser from 'phaser';
import { VisualFactory } from '../visual/VisualFactory';

type VehicleType = 'gmc' | 'prado';

interface RunData {
  vehicle: VehicleType;
}

const ITEM_KEYS = ['salt', 'water', 'charcoal', 'lighter', 'hummus'] as const;
type ItemKey = (typeof ITEM_KEYS)[number];

const VEHICLES: Record<VehicleType, { accel: number; drag: number; max: number; fuelUse: number }> = {
  gmc: { accel: 420, drag: 220, max: 320, fuelUse: 0.25 },
  prado: { accel: 520, drag: 180, max: 360, fuelUse: 0.2 }
};

export default class RunScene extends Phaser.Scene {
  private vehicle: VehicleType = 'gmc';
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private worldWidth = 4800;
  private worldHeight = 1400;
  private sky!: Phaser.GameObjects.Image;
  private duneLayers: { sprite: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private road!: Phaser.GameObjects.TileSprite;
  private hudSpeed!: Phaser.GameObjects.Text;
  private hudFuel!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudItems!: Phaser.GameObjects.Text;
  private minimapDot!: Phaser.GameObjects.Ellipse;
  private fuel = 110;
  private speed = 0;
  private angle = -0.1;
  private sunset = 210; // seconds ~3.5 min
  private elapsed = 0;
  private inventory: Set<ItemKey> = new Set();
  private isFinished = false;
  private finishZone!: Phaser.GameObjects.Rectangle;
  private activeEffects: Set<string> = new Set();
  private log: string[] = [];

  constructor() {
    super('RunScene');
  }

  init(data: RunData) {
    this.vehicle = data?.vehicle || 'gmc';
  }

  preload() {
    VisualFactory.ensureAll(this);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.sky = this.add.image(width / 2, height / 2, 'sky').setScrollFactor(0);
    this.sky.setDisplaySize(width, height);

    this.createDuneLayers(width, height);
    this.createRoadLayer();

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    const stats = VEHICLES[this.vehicle];
    const roadY = this.worldHeight - 140;
    const startY = roadY - 50;
    this.player = this.physics.add.image(180, startY, `car-${this.vehicle}`);
    this.player.setDamping(true).setDrag(stats.drag).setMaxVelocity(stats.max).setAngularDrag(600);
    this.player.setSize(52, 28);
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
    this.cameras.main.setDeadzone(240, 160);
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

  private createDuneLayers(screenW: number, screenH: number) {
    const layer3 = this.add.tileSprite(screenW / 2, screenH / 2 + 60, screenW, screenH, 'dune-3').setScrollFactor(0);
    const layer2 = this.add.tileSprite(screenW / 2, screenH / 2 + 30, screenW, screenH, 'dune-2').setScrollFactor(0);
    const layer1 = this.add.tileSprite(screenW / 2, screenH / 2, screenW, screenH, 'dune-1').setScrollFactor(0);
    layer3.setTileScale(1.8, 2.4);
    layer2.setTileScale(1.6, 2.2);
    layer1.setTileScale(1.4, 2);
    layer3.setTint(0xd4a373);
    layer2.setTint(0xe1ac79);
    layer1.setTint(0xf2c89a);
    this.duneLayers = [
      { sprite: layer3, speed: 0.05 },
      { sprite: layer2, speed: 0.12 },
      { sprite: layer1, speed: 0.18 }
    ];
  }

  private createRoadLayer() {
    const roadY = this.worldHeight - 140;
    this.road = this.add.tileSprite(this.worldWidth / 2, roadY, this.worldWidth, 160, 'road').setOrigin(0.5, 1);
    this.road.setDepth(1);
  }

  private createHUD() {
    const panel = this.add.image(18, 18, 'hud-panel').setOrigin(0).setScrollFactor(0);
    this.hudSpeed = this.add.text(32, 32, 'السرعة: 0', this.hudStyle()).setScrollFactor(0);
    this.hudFuel = this.add.text(32, 58, 'البنزين: 100', this.hudStyle()).setScrollFactor(0);
    this.hudTime = this.add.text(32, 84, 'الغروب: 0:00', this.hudStyle()).setScrollFactor(0);
    this.hudItems = this.add.text(32, 110, 'الأغراض: -', this.hudStyle()).setScrollFactor(0);
    this.children.bringToTop(panel);

    const minimap = this.add.image(this.scale.width - 238, 18, 'minimap').setOrigin(0).setScrollFactor(0);
    const g = this.add.graphics().setScrollFactor(0).setDepth(5);
    const pad = 12;
    g.lineStyle(3, 0x38bdf8, 0.8);
    g.beginPath();
    g.moveTo(minimap.x + pad, minimap.y + pad + 60);
    g.lineTo(minimap.x + 220 - pad, minimap.y + pad + 60);
    g.strokePath();

    const stopsPx = [0.12, 0.3, 0.45];
    stopsPx.forEach((p) => {
      g.fillStyle(0xfcd34d, 1);
      g.fillCircle(minimap.x + pad + 196 * p, minimap.y + pad + 60, 5);
    });

    this.minimapDot = this.add.ellipse(minimap.x + pad, minimap.y + pad + 60, 12, 12, 0x22c55e).setScrollFactor(0).setDepth(6);

    this.add.text(minimap.x + 110, minimap.y + 18, 'Rafiah — Dammam dunes', {
      fontSize: '12px',
      color: '#bae6fd',
      fontFamily: 'system-ui'
    }).setOrigin(0.5, 0).setScrollFactor(0);
  }

  private hudStyle() {
    return {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e5e7eb'
    };
  }

  private createStops() {
    const roadY = this.worldHeight - 200;
    const stops: { x: number; label: string; grants: ItemKey[]; tex: string }[] = [
      { x: 520, label: 'محطة بنزين', grants: ['water'], tex: 'poi-gas' },
      { x: 1050, label: 'مطعم', grants: ['hummus'], tex: 'poi-food' },
      { x: 1580, label: 'بقالة', grants: ['salt', 'lighter'], tex: 'poi-shop' }
    ];
    stops.forEach((stop) => {
      const pad = this.add.rectangle(stop.x, roadY, 140, 110, 0xffffff, 0.01);
      this.physics.add.existing(pad, true);
      this.add.image(stop.x, roadY - 30, stop.tex).setDepth(2).setScale(0.9);
      this.add.text(stop.x, roadY - 90, stop.label, { fontSize: '18px', color: '#f8fafc', fontFamily: 'system-ui' }).setOrigin(0.5);
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
      const x = Phaser.Math.Between(1900, this.worldWidth - 500);
      const y = Phaser.Math.Between(240, this.worldHeight - 240);
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
    const zoneY = 320;
    this.finishZone = this.add.rectangle(zoneX, zoneY, 180, 240, 0x4ade80, 0.14);
    this.add.image(zoneX, zoneY - 120, 'finish').setAngle(-6);
    this.add.text(zoneX, zoneY + 80, 'قمة الطعس', {
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
        const puff = this.add.image(
          this.player.x - Math.cos(this.angle) * 18,
          this.player.y - Math.sin(this.angle) * 18,
          'puff'
        )
          .setTint(0xf1c27d)
          .setAlpha(0.7);
        this.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 1.9,
          duration: 520,
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
    this.duneLayers.forEach((l) => {
      l.sprite.tilePositionX += this.speed * dt * l.speed;
    });
    const fade = Phaser.Math.Clamp((this.player.x - 1800) / 900, 0, 1);
    this.road.setAlpha(1 - fade * 0.8);
    this.updateMinimap();
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
    this.hudSpeed.setText(`السرعة: ${Math.round(this.speed)}`);
    this.hudFuel.setText(`البنزين: ${this.fuel.toFixed(0)}%`);
    this.hudTime.setText(`الغروب: ${mins}:${secs.toString().padStart(2, '0')}`);
    const items = ITEM_KEYS.filter((i) => this.inventory.has(i));
    this.hudItems.setText(`الأغراض: ${items.length ? items.join(', ') : 'لسه ناقص'}`);
  }

  private updateMinimap() {
    if (!this.minimapDot) return;
    const pad = 12;
    const rel = Phaser.Math.Clamp(this.player.x / this.worldWidth, 0, 1);
    const baseX = this.scale.width - 238 + pad;
    this.minimapDot.setPosition(baseX + 196 * rel, 18 + pad + 60);
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
