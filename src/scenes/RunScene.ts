import Phaser from 'phaser';
import { ItemKey, itemMeta, essentials, getMissingEssentials } from '../data/items';
import { makeCarTextures, makeItemTextures, makePOITextures, makeWorldTextures } from '../visual/Procedural';

type Vehicle = 'gmc' | 'prado';

interface RunData {
  vehicle: Vehicle;
}

interface POI {
  sprite: Phaser.GameObjects.Image;
  body: Phaser.Physics.Arcade.StaticBody;
  type: 'station' | 'shop' | 'restaurant';
  used: boolean;
}

export default class RunScene extends Phaser.Scene {
  private vehicle: Vehicle = 'gmc';
  private player!: Phaser.Physics.Arcade.Image;
  private shadow!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private worldWidth = 5200;
  private worldHeight = 1400;
  private duneLayers: { sprite: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private roadLayer!: Phaser.GameObjects.TileSprite;
  private sky!: Phaser.GameObjects.TileSprite;
  private fuel = 100;
  private speed = 0;
  private angle = -0.1;
  private timeLeft = 220;
  private elapsed = 0;
  private nitroCooldown = 0;
  private collected = new Set<ItemKey>();
  private hudSpeed!: Phaser.GameObjects.Text;
  private hudFuel!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudItems!: Phaser.GameObjects.Text;
  private hudIcons: Record<ItemKey, Phaser.GameObjects.Image> = {} as any;
  private finishZone!: Phaser.GameObjects.Rectangle;
  private itemsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private pois: POI[] = [];
  private isFinished = false;

  constructor() {
    super('RunScene');
  }

  init(data: RunData) {
    this.vehicle = data?.vehicle || 'gmc';
  }

  preload() {
    makeWorldTextures(this);
    makeCarTextures(this);
    makeItemTextures(this);
    makePOITextures(this);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.sky = this.add.tileSprite(width / 2, height / 2, width, height, 'sky_grad').setScrollFactor(0);
    this.createDuneLayers(width, height);
    this.createRoadLayer();

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    const stats = this.vehicleStats();
    const startY = this.worldHeight - 220;

    this.shadow = this.add.image(180, startY, 'car_shadow').setDepth(1);
    this.player = this.physics.add.image(180, startY, this.vehicle === 'gmc' ? 'car_gmc' : 'car_prado').setDepth(2);
    this.player.setDamping(true).setDrag(stats.drag).setMaxVelocity(stats.max).setAngularDrag(600);
    this.player.setSize(52, 28).setCollideWorldBounds(true);

    this.createPOIs();
    this.createItems();
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
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as any;

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(240, 160);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isFinished) return;
        this.timeLeft -= 1;
        if (this.timeLeft <= 0) {
          this.finishRun(false, 'sunset');
        }
      }
    });
  }

  private vehicleStats() {
    return this.vehicle === 'gmc'
      ? { accel: 430, drag: 220, max: 330, fuelUse: 0.23 }
      : { accel: 520, drag: 180, max: 370, fuelUse: 0.2 };
  }

  private createDuneLayers(screenW: number, screenH: number) {
    const l3 = this.add.tileSprite(screenW / 2, screenH / 2 + 60, screenW, screenH, 'dune_layer3').setScrollFactor(0);
    const l2 = this.add.tileSprite(screenW / 2, screenH / 2 + 30, screenW, screenH, 'dune_layer2').setScrollFactor(0);
    const l1 = this.add.tileSprite(screenW / 2, screenH / 2, screenW, screenH, 'dune_layer1').setScrollFactor(0);
    l3.setTileScale(1.6, 2.2);
    l2.setTileScale(1.4, 2);
    l1.setTileScale(1.2, 1.8);
    this.duneLayers = [
      { sprite: l3, speed: 0.05 },
      { sprite: l2, speed: 0.1 },
      { sprite: l1, speed: 0.16 }
    ];
  }

  private createRoadLayer() {
    const roadY = this.worldHeight - 140;
    this.roadLayer = this.add
      .tileSprite(this.worldWidth / 2, roadY, this.worldWidth, 140, 'road_tile')
      .setOrigin(0.5, 1)
      .setAlpha(1);
    this.roadLayer.setDepth(1);
  }

  private createPOIs() {
    const roadY = this.worldHeight - 200;
    const data: { x: number; type: POI['type']; tex: string; label: string }[] = [
      { x: 520, type: 'station', tex: 'poi_station', label: 'محطة' },
      { x: 1100, type: 'shop', tex: 'poi_shop', label: 'بقالة' },
      { x: 1650, type: 'restaurant', tex: 'poi_restaurant', label: 'مطعم' }
    ];
    data.forEach((d) => {
      const sprite = this.add.image(d.x, roadY, d.tex).setDepth(2);
      this.add.text(d.x, roadY - 80, d.label, {
        fontSize: '18px',
        color: '#e5e7eb',
        fontFamily: 'system-ui'
      }).setOrigin(0.5);
      this.physics.add.existing(sprite, true);
      const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
      const poi: POI = { sprite, body, type: d.type, used: false };
      this.physics.add.overlap(this.player, sprite, () => this.handlePOI(poi));
      this.pois.push(poi);
    });
  }

  private handlePOI(poi: POI) {
    if (poi.used || this.isFinished) return;
    poi.used = true;
    poi.sprite.setAlpha(0.35);
    if (poi.type === 'station') {
      this.fuel = 100;
      this.toast('فللنا تانكي');
    } else if (poi.type === 'shop') {
      const missing = getMissingEssentials(this.collected);
      const pick = missing.length ? missing[0] : 'salt';
      this.collectItem(pick);
      this.toast('البقالة عطتنا ' + itemMeta[pick].label);
    } else if (poi.type === 'restaurant') {
      this.collectItem('hummus');
      this.toast('خدنا حمص من المطعم');
    }
  }

  private createItems() {
    this.itemsGroup = this.physics.add.staticGroup();
    const positions = [
      { x: 900, y: this.worldHeight - 260, key: 'salt' },
      { x: 1300, y: this.worldHeight - 300, key: 'lighter' },
      { x: 2100, y: this.worldHeight - 320, key: 'water' },
      { x: 2500, y: this.worldHeight - 260, key: 'charcoal' },
      { x: 2900, y: this.worldHeight - 340, key: 'hummus' },
      { x: 3400, y: this.worldHeight - 320, key: 'salt' },
      { x: 3800, y: this.worldHeight - 360, key: 'lighter' },
      { x: 4300, y: this.worldHeight - 280, key: 'water' }
    ] as { x: number; y: number; key: ItemKey }[];

    positions.forEach((p) => {
      const sprite = this.itemsGroup.create(p.x, p.y, itemMeta[p.key].textureKey) as Phaser.Physics.Arcade.Image;
      sprite.setDepth(2);
      sprite.setData('itemKey', p.key);
      sprite.setScale(1.1);
      sprite.setAlpha(0.95);
    });

    this.physics.add.overlap(this.player, this.itemsGroup, (_p, item) => {
      const img = item as Phaser.Physics.Arcade.Image;
      const key = img.getData('itemKey') as ItemKey;
      this.collectItem(key);
      img.disableBody(true, true);
      this.toast('أخذت: ' + itemMeta[key].label);
    });
  }

  private collectItem(key: ItemKey) {
    this.collected.add(key);
    if (this.hudIcons[key]) this.hudIcons[key].setTint(0xffffff);
  }

  private createFinish() {
    const zoneX = this.worldWidth - 200;
    const zoneY = 280;
    this.finishZone = this.add.rectangle(zoneX, zoneY, 200, 240, 0x4ade80, 0.12);
    this.add.image(zoneX, zoneY - 120, 'finish_flag').setDepth(2);
    this.add.text(zoneX, zoneY + 100, 'قمة الطعس', {
      fontSize: '18px',
      color: '#fef08a',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    this.physics.add.existing(this.finishZone, true);
    this.physics.add.overlap(this.player, this.finishZone, () => this.finishRun(true, 'arrived'));
  }

  private createTrailTimer() {
    this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        if (!this.player || this.isFinished || this.speed < 40) return;
        const puff = this.add.image(
          this.player.x - Math.cos(this.angle) * 18,
          this.player.y - Math.sin(this.angle) * 18,
          'puff'
        )
          .setAlpha(0.8)
          .setDepth(1);
        this.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 1.8,
          duration: 520,
          onComplete: () => puff.destroy()
        });
      }
    });
  }

  private createHUD() {
    const panel = this.add.rectangle(16, 16, 270, 150, 0x0f172a, 0.75)
      .setOrigin(0)
      .setStrokeStyle(2, 0xfcd34d)
      .setScrollFactor(0)
      .setDepth(10);
    this.hudSpeed = this.add.text(28, 30, 'السرعة: 0', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.hudFuel = this.add.text(28, 54, 'البنزين: 100', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.hudTime = this.add.text(28, 78, 'الغروب: 00:00', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.hudItems = this.add.text(28, 104, 'الأغراض:', this.hudStyle()).setScrollFactor(0).setDepth(11);

    essentials.forEach((k, idx) => {
      const icon = this.add.image(110 + idx * 34, 120, itemMeta[k].textureKey).setScrollFactor(0).setDepth(11);
      icon.setTint(0x475569);
      this.hudIcons[k] = icon;
    });
    const hummusIcon = this.add.image(110 + essentials.length * 34, 120, itemMeta.hummus.textureKey).setScrollFactor(0).setDepth(11);
    hummusIcon.setTint(0x475569);
    this.hudIcons.hummus = hummusIcon;

    this.children.bringToTop(panel);
  }

  private hudStyle() {
    return {
      fontSize: '16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e5e7eb'
    };
  }

  private toast(msg: string) {
    const t = this.add.text(this.player.x, this.player.y - 60, msg, {
      fontSize: '16px',
      color: '#fcd34d',
      fontFamily: 'system-ui'
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t,
      y: t.y - 40,
      alpha: 0,
      duration: 1200,
      onComplete: () => t.destroy()
    });
  }

  update(_time: number, delta: number) {
    if (this.isFinished) return;
    const dt = delta / 1000;
    this.elapsed += dt;
    this.handleDrive(dt);
    this.updateHUD();
    this.updateBackground(dt);
    this.updateShadow();
  }

  private handleDrive(dt: number) {
    const stats = this.vehicleStats();
    const forward = this.cursors.up?.isDown || this.keys.W.isDown;
    const backward = this.cursors.down?.isDown || this.keys.S.isDown;
    const left = this.cursors.left?.isDown || this.keys.A.isDown;
    const right = this.cursors.right?.isDown || this.keys.D.isDown;
    const nitroPressed = this.keys.SPACE.isDown && this.fuel > 5 && this.nitroCooldown <= 0;

    let accel = 0;
    if (forward) accel += stats.accel;
    if (backward) accel -= stats.accel * 0.5;
    if (nitroPressed) accel *= 1.25;
    this.speed += accel * dt;

    const drag = stats.drag + (this.fuel <= 0 ? 260 : 0);
    const max = this.fuel <= 0 ? stats.max * 0.35 : stats.max;
    this.speed -= this.speed * drag * 0.0015 * dt;
    this.speed = Phaser.Math.Clamp(this.speed, 0, max);

    if (nitroPressed) {
      this.fuel -= stats.fuelUse * 2.5 * dt;
      this.nitroCooldown = 2;
      this.toast('نيترو! يحرق البنزين 🔥');
    } else {
      this.fuel -= stats.fuelUse * (forward ? 1.2 : 0.4) * dt;
      this.nitroCooldown = Math.max(0, this.nitroCooldown - dt);
    }

    this.fuel = Math.max(0, Math.min(100, this.fuel));

    let turn = 0;
    if (left) turn -= 1;
    if (right) turn += 1;
    const turnRate = (0.8 + this.speed / (max || 1)) * 1.2;
    this.angle += turn * turnRate * dt;

    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.player.setVelocity(vx, vy);
    this.player.setRotation(this.angle + Math.PI / 2);
  }

  private updateHUD() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.max(0, Math.floor(this.timeLeft % 60));
    this.hudSpeed.setText(`السرعة: ${Math.round(this.speed)}`);
    this.hudFuel.setText(`البنزين: ${this.fuel.toFixed(0)}%`);
    this.hudTime.setText(`الغروب: ${mins}:${secs.toString().padStart(2, '0')}`);
    const missing = getMissingEssentials(this.collected);
    this.hudItems.setText(`الأغراض: ${missing.length ? 'ناقص ' + missing.length : 'كامل'}`);
  }

  private updateBackground(dt: number) {
    const progress = Phaser.Math.Clamp(this.player.x / this.worldWidth, 0, 1);
    const fade = Phaser.Math.Clamp((progress - 0.45) / 0.15, 0, 1);
    this.roadLayer.setAlpha(1 - fade * 0.9);
    const scroll = this.speed * dt;
    this.duneLayers.forEach((l) => (l.sprite.tilePositionX += scroll * l.speed));
    this.sky.tilePositionY = (220 - this.timeLeft) * 0.2;
  }

  private updateShadow() {
    this.shadow.setPosition(this.player.x, this.player.y + 12);
    this.shadow.setRotation(this.player.rotation);
  }

  private finishRun(success: boolean, reason: string) {
    if (this.isFinished) return;
    this.isFinished = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    const payload = {
      result: success ? 'win' : 'fail',
      collected: Array.from(this.collected),
      vehicle: this.vehicle,
      reason,
      timeSpent: this.elapsed
    };
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CampScene', payload);
    });
  }
}
