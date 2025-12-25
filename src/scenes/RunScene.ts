import Phaser from 'phaser';
import { ItemKey, itemMeta, essentials, getMissingEssentials } from '../data/items';
import { ensureProceduralArt } from '../visual/Procedural';
import { preloadExternalAssets } from '../visual/ExternalAssets';
import { ArtKeys } from '../visual/ArtKeys';
import { Feel } from '../systems/Feel';
import { PauseMenu } from '../ui/PauseMenu';
import { ChaosDirector, ChaosEvent, ChaosKey } from '../systems/ChaosDirector';
import { mulberry32, hashStringToSeed, randInt, choice } from '../systems/rng';
import { JokeEngine } from '../systems/JokeEngine';
import { ToastManager } from '../ui/Toast';
import { beep } from '../ui/Sfx';
import { inc, getNumber, setNumber } from '../systems/persist';
import { balance } from '../config/balance';

type Vehicle = 'gmc' | 'prado';

interface RunData {
  vehicle: Vehicle;
}

const RUN_SECONDS = balance.RUN_SECONDS;

interface POI {
  sprite: Phaser.GameObjects.Image;
  body: Phaser.Physics.Arcade.StaticBody;
  type: 'station' | 'shop' | 'restaurant';
  used: boolean;
}

interface DogSprite extends Phaser.GameObjects.Rectangle {
  body: Phaser.Physics.Arcade.Body;
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
  private cc0Ground?: Phaser.GameObjects.TileSprite;
  private cc0Horizon?: Phaser.GameObjects.Image;
  private rainOverlay?: Phaser.GameObjects.Graphics;
  private fuel = 100;
  private speed = 0;
  private angle = -0.1;
  private timeLeft = RUN_SECONDS;
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
  private director = new ChaosDirector();
  private rng: () => number = Math.random;
  private toast!: ToastManager;
  private banner!: { box: Phaser.GameObjects.Rectangle; title: Phaser.GameObjects.Text; line: Phaser.GameObjects.Text };
  private activeKey: ChaosKey | null = null;
  private activeEndsAt = 0;
  private tractionMul = 1;
  private maxSpeedMul = 1;
  private accelMul = 1;
  private steerMul = 1;
  private nitroDisabledUntil = 0;
  private overheatSlowTimer = 0;
  private honkTimer = 0;
  private dogs: DogSprite[] = [];
  private eventsTriggered: ChaosKey[] = [];
  private funniestKey: ChaosKey | null = null;
  private funnies: string[] = [];
  private joke!: JokeEngine;
  private isPaused = false;
  private pauseMenu!: PauseMenu;
  private freezeUntil = 0;
  private speedLines!: Phaser.GameObjects.Graphics;
  private timePulseStarted = false;
  private buffActiveUntil = 0;

  constructor() {
    super('RunScene');
  }

  init(data: RunData) {
    this.vehicle = data?.vehicle || 'gmc';
  }

  preload() {
    preloadExternalAssets(this);
    ensureProceduralArt(this);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    const seed = this.buildSeed();
    this.rng = mulberry32(seed);
    this.joke = new JokeEngine(seed);
    this.director.reset(this.rng, RUN_SECONDS);

    this.toast = new ToastManager(this);
    this.banner = this.createBanner();

    this.sky = this.add.tileSprite(width / 2, height / 2, width, height, ArtKeys.SKY_GRAD).setScrollFactor(0);
    const hasNewArt =
      this.textures.exists('bg_desert_clean') &&
      this.textures.exists('bg_dunes_1080') &&
      this.textures.exists('veh_gmc_cc0') &&
      this.textures.exists('veh_prado_cc0');

    if (hasNewArt) {
      this.cc0Horizon = this.add.image(0, 0, 'bg_dunes_1080').setOrigin(0, 0).setScrollFactor(0);
      this.cc0Horizon.setDisplaySize(width, height);
      this.cc0Ground = this.add.tileSprite(0, 0, width, height, 'bg_desert_clean').setOrigin(0, 0).setScrollFactor(0);
    } else {
      this.createDuneLayers(width, height);
      this.createRoadLayer();
    }

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    const stats = this.vehicleStats();
    const startY = this.worldHeight - 220;

    const useCc0 = this.textures.exists('veh_gmc_cc0') && this.textures.exists('veh_prado_cc0');
    this.shadow = this.add.image(180, startY, ArtKeys.VEH_SHADOW).setDepth(1);
    const key = useCc0 ? (this.vehicle === 'gmc' ? 'veh_gmc_cc0' : 'veh_prado_cc0') : this.vehicle === 'gmc' ? ArtKeys.VEH_GMC : ArtKeys.VEH_PRADO;
    this.player = this.physics.add.image(180, startY, key).setDepth(2);
    this.player.setScale(useCc0 ? 0.6 : 1);
    this.player.setDamping(true).setDrag(stats.drag).setMaxVelocity(stats.max).setAngularDrag(600);
    this.player.setSize(this.player.width * 0.55, this.player.height * 0.7).setCollideWorldBounds(true);

    this.createPOIs();
    this.createItems();
    this.createFinish();
    this.createHUD();
    this.createTrailTimer();
    this.joke.setContext({ veh: this.vehicle, place: 'الرافعية', runCount: getNumber('rafiah_runs', 1) });
    this.speedLines = this.add.graphics().setDepth(5).setScrollFactor(0).setAlpha(0);
    this.pauseMenu = new PauseMenu(
      this,
      () => (this.isPaused = false),
      () => this.scene.restart({ vehicle: this.vehicle }),
      () => this.scene.start('MenuScene')
    );

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      H: Phaser.Input.Keyboard.KeyCodes.H
    }) as any;

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(240, 160);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.input.keyboard?.on('keydown-ESC', () => {
      this.isPaused = !this.isPaused;
      this.pauseMenu[this.isPaused ? 'show' : 'hide']();
    });

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

  private buildSeed() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('daily') === '1') {
      const d = new Date();
      const day = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;
      return hashStringToSeed(day);
    }
    return hashStringToSeed(`${Date.now()}-${Math.random()}`);
  }

  private vehicleStats() {
    return this.vehicle === 'gmc'
      ? { accel: 430, drag: 220, max: 330, fuelUse: 0.23 }
      : { accel: 520, drag: 180, max: 370, fuelUse: 0.2 };
  }

  private createDuneLayers(screenW: number, screenH: number) {
    const l3 = this.add.tileSprite(screenW / 2, screenH / 2 + 60, screenW, screenH, ArtKeys.DUNE_L3).setScrollFactor(0);
    const l2 = this.add.tileSprite(screenW / 2, screenH / 2 + 30, screenW, screenH, ArtKeys.DUNE_L2).setScrollFactor(0);
    const l1 = this.add.tileSprite(screenW / 2, screenH / 2, screenW, screenH, ArtKeys.DUNE_L1).setScrollFactor(0);
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
      .tileSprite(this.worldWidth / 2, roadY, this.worldWidth, 140, ArtKeys.ROAD_TILE)
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
      const sprite = this.add.image(d.x, roadY, d.tex).setDepth(2).setOrigin(0.5, 1);
      this.add.text(d.x, roadY - 80, d.label, {
        fontSize: '18px',
        color: '#e5e7eb',
        fontFamily: 'system-ui'
      }).setOrigin(0.5);
      this.physics.add.existing(sprite, true);
      const poi: POI = { sprite, body: sprite.body as Phaser.Physics.Arcade.StaticBody, type: d.type, used: false };
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
      this.toast.show(this.joke.pick('toast_refuel', 1, 'فللنا تانكي'));
    } else if (poi.type === 'shop') {
      const missing = getMissingEssentials(this.collected);
      const pick = missing.length ? missing[0] : choice(this.rng, essentials);
      this.collectItem(pick);
      this.toast.show('البقالة عطتنا ' + itemMeta[pick].label);
    } else if (poi.type === 'restaurant') {
      this.collectItem('hummus');
      this.toast.show('خدنا حمص من المطعم');
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
      this.toast.show(this.joke.pick('toast_item_pickup', 1, 'أخذنا: ' + itemMeta[key].label).replace('{item}', itemMeta[key].label));
      this.spawnConfetti(img.x, img.y, key === 'salt');
      Feel.pop(this, this.player);
      beep('ui');
    });
  }

  private spawnConfetti(x: number, y: number, special: boolean) {
    if (!special) return;
    for (let i = 0; i < 8; i++) {
      const sq = this.add.rectangle(x, y, 6, 6, 0xfcd34d).setDepth(5);
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(20, 60);
      const tx = x + Math.cos(ang) * dist;
      const ty = y + Math.sin(ang) * dist;
      this.tweens.add({
        targets: sq,
        x: tx,
        y: ty,
        alpha: 0,
        duration: 420,
        onComplete: () => sq.destroy()
      });
    }
  }

  private collectItem(key: ItemKey) {
    this.collected.add(key);
    if (this.hudIcons[key]) this.hudIcons[key].setTint(0xffffff);
    const missing = getMissingEssentials(this.collected);
    if (!missing.length && this.buffActiveUntil === 0) {
      if (this.elapsed <= balance.planReward.earlyEssentialsDeadlineSec) {
        this.buffActiveUntil = this.elapsed + balance.planReward.buffDurationSec;
        this.toast.show('ما شاء الله… جاهزين بدري 🔥');
        beep('win');
      }
    }
  }

  private createFinish() {
    const zoneX = this.worldWidth - 200;
    const zoneY = 280;
    this.finishZone = this.add.rectangle(zoneX, zoneY, 200, 240, 0x4ade80, 0.12);
    this.add.image(zoneX, zoneY - 120, ArtKeys.FINISH_FLAG).setDepth(2);
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
    const mult = this.keys.SPACE.isDown ? 1.6 : 1;
    for (let i = 0; i < mult; i++) {
      const puff = this.add.image(
        this.player.x - Math.cos(this.angle) * (16 + i * 4),
        this.player.y - Math.sin(this.angle) * (16 + i * 4),
        ArtKeys.PUFF
      )
        .setAlpha(0.8)
        .setDepth(1)
        .setScale(1 + (mult - 1) * 0.2);
      this.tweens.add({
        targets: puff,
        alpha: 0,
        scale: 1.8,
        duration: 420,
        onComplete: () => puff.destroy()
      });
    }
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

  private createBanner() {
    const box = this.add.rectangle(this.scale.width / 2, 40, 360, 70, 0x111827, 0.8)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xfcd34d)
      .setScrollFactor(0)
      .setDepth(30)
      .setAlpha(0);
    const title = this.add.text(this.scale.width / 2, 26, '', {
      fontSize: '18px',
      color: '#f8fafc',
      fontFamily: 'system-ui'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31).setAlpha(0);
    const line = this.add.text(this.scale.width / 2, 50, '', {
      fontSize: '14px',
      color: '#e5e7eb',
      fontFamily: 'system-ui'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31).setAlpha(0);
    return { box, title, line };
  }

  private showBanner(title: string, line: string) {
    this.banner.title.setText(title);
    this.banner.line.setText(line);
    this.tweens.add({
      targets: [this.banner.box, this.banner.title, this.banner.line],
      alpha: 1,
      duration: 150,
      yoyo: false
    });
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: [this.banner.box, this.banner.title, this.banner.line],
        alpha: 0,
        duration: 200
      });
    });
  }

  private toastMissingHints() {
    const missing = getMissingEssentials(this.collected);
    if (!missing.length) return;
    const key = choice(this.rng, missing);
    this.joke.setContext({ item: itemMeta[key].label });
    this.toast.show(this.joke.pick('hint_missing_essential', 1, 'لا تنسى الأساسيات'));
  }

  private toastFuelEmpty() {
    this.toast.show(this.joke.pick('toast_fuel_empty', 2, 'بنزين خلص… ممتاز'));
  }

  private toastNitro() {
    this.toast.show(this.joke.pick('toast_nitro', 2, 'نيترو يحرق البنزين'));
  }

  private startEvent(ev: ChaosEvent) {
    this.activeKey = ev.key;
    this.activeEndsAt = this.elapsed + ev.dur;
    this.eventsTriggered.push(ev.key);
    this.funniestKey = ev.key;
    const intensity = this.eventIntensityFromTime();
    this.joke.setContext({ timeLeftSec: this.timeLeft });
    switch (ev.key) {
      case 'stuck':
        this.tractionMul = 0.35 + ev.intensity * 0.1;
        this.maxSpeedMul = 0.55 + ev.intensity * 0.08;
        this.toast.show(this.joke.pick('event_stuck', intensity, 'تغريز'));
        break;
      case 'overheat':
        this.maxSpeedMul = 0.65 + ev.intensity * 0.06;
        this.nitroDisabledUntil = this.activeEndsAt;
        this.toast.show(this.joke.pick('event_overheat', intensity, 'حرارة!'));
        break;
      case 'flat':
        this.maxSpeedMul = 0.7 + ev.intensity * 0.05;
        this.steerMul = 0.7 + ev.intensity * 0.08;
        this.activeEndsAt = this.elapsed + randInt(this.rng, 12, 18);
        this.toast.show(this.joke.pick('event_flat', intensity, 'بنشر'));
        break;
      case 'rain':
        this.tractionMul = 0.7 + ev.intensity * 0.05;
        this.toast.show(this.joke.pick('event_rain', intensity, 'مطر'));
        this.showRain();
        break;
      case 'helicopter':
        this.toast.show(this.joke.pick('event_helicopter', intensity, 'هيلوكبتر'));
        this.spawnHelicopter();
        inc('rafiah_helicopter_seen', 1);
        break;
      case 'camel':
        this.toast.show(this.joke.pick('event_camel', intensity, 'جمل يقطع الطريق'));
      this.spawnCamel();
      Feel.shake(this, 100, 0.003);
      break;
    case 'dogs':
      this.toast.show(this.joke.pick('event_dogs_safe', intensity, 'زمّر لهم'));
      this.spawnDogs();
      break;
    }

    if (ev.key === 'stuck') inc('rafiah_total_stucks', 1);
    if (ev.key === 'flat') inc('rafiah_total_flats', 1);
    if (ev.key === 'overheat') inc('rafiah_total_overheats', 1);

    const line = this.joke.pick(`event_${ev.key}`, intensity, 'وش السالفة…');
    this.showBanner(this.eventTitle(ev.key), line);
    this.pushFunny(line);
  }

  private endEvent() {
    this.activeKey = null;
    this.activeEndsAt = 0;
    this.tractionMul = 1;
    this.maxSpeedMul = 1;
    this.accelMul = 1;
    this.steerMul = 1;
    this.nitroDisabledUntil = 0;
    this.overheatSlowTimer = 0;
    if (this.rainOverlay) {
      this.rainOverlay.destroy();
      this.rainOverlay = undefined;
    }
  }

  private eventTitle(key: ChaosKey) {
    switch (key) {
      case 'stuck':
        return 'تغريز';
      case 'overheat':
        return 'حرارة';
      case 'flat':
        return 'بنشر';
      case 'rain':
        return 'مطر';
      case 'helicopter':
        return 'هيلوكبتر';
      case 'camel':
        return 'جمل';
      case 'dogs':
        return 'كلاب شوارع';
    }
  }

  private showRain() {
    if (this.rainOverlay) this.rainOverlay.destroy();
    this.rainOverlay = this.add.graphics().setScrollFactor(0).setDepth(25).setAlpha(0.15);
    const { width, height } = this.scale;
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.rainOverlay.lineStyle(1, 0x38bdf8, 0.8);
      this.rainOverlay.beginPath();
      this.rainOverlay.moveTo(x, y);
      this.rainOverlay.lineTo(x + 6, y + 16);
      this.rainOverlay.strokePath();
    }
  }

  private spawnHelicopter() {
    const y = 120;
    const heli = this.add.rectangle(-80, y, 80, 28, 0x38bdf8).setStrokeStyle(2, 0x0ea5e9).setDepth(15);
    this.tweens.add({
      targets: heli,
      x: this.worldWidth + 120,
      duration: 5000,
      ease: 'Linear',
      onComplete: () => heli.destroy()
    });
    this.cameras.main.shake(160, 0.003);
    beep('helicopter');
  }

  private spawnCamel() {
    const y = Phaser.Math.Between(240, this.worldHeight - 240);
    const camel = this.add.rectangle(-60, y, 80, 44, 0xd4a373).setStrokeStyle(2, 0x8b5e34).setDepth(10);
    this.physics.add.existing(camel, false);
    const body = camel.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(160);
    this.physics.add.overlap(this.player, camel, () => {
      this.speed *= 0.5;
      this.cameras.main.shake(100, 0.002);
    });
  }

  private spawnDogs() {
    this.dogs.forEach((d) => d.destroy());
    this.dogs = [];
    const count = randInt(this.rng, 2, 4);
    for (let i = 0; i < count; i++) {
      const y = this.worldHeight / 2 + Phaser.Math.Between(-80, 80);
      const dog = this.add.rectangle(this.player.x + 200 + i * 20, y, 46, 26, 0xcbd5e1).setStrokeStyle(2, 0x475569).setDepth(9) as DogSprite;
      this.physics.add.existing(dog, false);
      const body = dog.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(-120 - i * 10);
      this.dogs.push(dog);
      this.physics.add.overlap(this.player, dog, () => {
        this.speed *= 0.7;
        dog.setFillStyle(0x22c55e);
        body.setVelocity(180, Phaser.Math.Between(-60, 60));
        this.pushFunny('كلب طق جونا وهرب');
        Feel.hitStop(this, 50);
        Feel.shake(this, 80, 0.002);
      });
    }
  }

  private handleHonk(dt: number) {
    if (this.keys.H.isDown) {
      if (this.honkTimer <= 0) {
        beep('ui');
        this.honkTimer = 0.4;
        this.dogs.forEach((dog) => {
          const body = dog.body;
          body.setVelocity(200, Phaser.Math.Between(-80, 80));
          dog.setFillStyle(0x22c55e);
        });
      }
    }
    if (this.honkTimer > 0) this.honkTimer -= dt;
  }

  private updateHints() {
    if (this.elapsed > RUN_SECONDS * 0.25 && this.elapsed < RUN_SECONDS * 0.3) {
      this.toastMissingHints();
    }
    if (this.elapsed > RUN_SECONDS * 0.6 && this.elapsed < RUN_SECONDS * 0.65 && !this.collected.has('salt')) {
      this.joke.setContext({ item: itemMeta.salt.label });
      this.toast.show(this.joke.pick('forgot_salt', 2, 'الملح ناقص!'));
    }
    if (this.elapsed > RUN_SECONDS * 0.85 && getMissingEssentials(this.collected).length >= 2) {
      this.toast.show(this.joke.pick('plan_failed_generic', 3, 'الخطة فشلت'));
    }
    if (this.elapsed > RUN_SECONDS * 0.6 && this.elapsed < RUN_SECONDS * 0.65) {
      this.toastMissingHints();
    }
  }

  update(_time: number, delta: number) {
    if (this.isFinished) return;
    if (this.freezeUntil && this.time.now < this.freezeUntil) return;
    if (this.isPaused) return;
    const dt = delta / 1000;
    this.elapsed += dt;
    this.handleDrive(dt);
    this.updateHUD();
    this.updateBackground(dt);
    this.updateShadow();
    this.handleEvents();
    this.handleHonk(dt);
    this.updateHints();
  }

  private handleEvents() {
    if (this.activeKey && this.elapsed >= this.activeEndsAt) {
      this.endEvent();
    }
    if (!this.activeKey) {
      let ev = this.director.update(this.elapsed);
      if (this.buffActiveUntil > this.elapsed && ev) {
        ev = { ...ev, intensity: Math.max(1, (ev.intensity as number) - 1) as 1 | 2 | 3, at: ev.at + 10 };
      }
      if (ev && this.blockLatePunish(ev)) ev = null;
      if (ev) this.startEvent(ev);
    }
  }

  private drawSpeedLines(active: boolean) {
    this.speedLines.clear();
    if (!active) return;
    const { width, height } = this.scale;
    this.speedLines.lineStyle(2, 0xffffff, 0.2);
    for (let i = 0; i < 6; i++) {
      const x = (width / 6) * i + 20;
      this.speedLines.beginPath();
      this.speedLines.moveTo(x, height / 2 - 40);
      this.speedLines.lineTo(x + 20, height / 2 - 10);
      this.speedLines.strokePath();
    }
    this.speedLines.setAlpha(0.35);
  }

  private nitroZoom() {
    this.tweens.add({ targets: this.cameras.main, zoom: 1.03, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
  }

  private pushFunny(line: string) {
    this.funnies.push(line);
    if (this.funnies.length > 5) this.funnies.shift();
  }

  private eventIntensityFromTime() {
    const pos = this.elapsed / RUN_SECONDS;
    if (pos < 0.4) return 1;
    if (pos < 0.75) return 2;
    return 3;
  }

  private blockLatePunish(ev: ChaosEvent) {
    if (this.timeLeft <= 20 && (ev.key === 'flat' || ev.key === 'overheat')) return true;
    if (this.fuel <= 15 && ev.key === 'overheat') return true;
    return false;
  }

  private handleDrive(dt: number) {
    const stats = this.vehicleStats();
    const forward = this.cursors.up?.isDown || this.keys.W.isDown;
    const backward = this.cursors.down?.isDown || this.keys.S.isDown;
    const left = this.cursors.left?.isDown || this.keys.A.isDown;
    const right = this.cursors.right?.isDown || this.keys.D.isDown;
    const nitroPressed = this.keys.SPACE.isDown && this.fuel > 5 && this.nitroCooldown <= 0 && this.elapsed >= this.nitroDisabledUntil;

    let accel = 0;
    if (forward) accel += stats.accel;
    if (backward) accel -= stats.accel * 0.5;
    accel *= this.accelMul * this.tractionMul;
    if (nitroPressed) accel *= 1.25;
    this.speed += accel * dt;

    const buff = this.buffActiveUntil > this.elapsed;
    const buffTraction = buff ? balance.planReward.buffTractionMul : 1;
    const buffMax = buff ? balance.planReward.buffMaxSpeedMul : 1;

    const dynamicDrag = stats.drag + this.speed * 0.12 + (this.fuel <= 0 ? 260 : 0);
    const max = this.fuel <= 0 ? stats.max * 0.35 : stats.max * this.maxSpeedMul * buffMax;
    this.speed -= this.speed * dynamicDrag * 0.0012 * dt;
    this.speed = Phaser.Math.Clamp(this.speed, 0, max);

    if (nitroPressed) {
      this.fuel -= stats.fuelUse * 2.5 * dt;
      this.nitroCooldown = 2;
      this.toastNitro();
      this.nitroZoom();
      this.drawSpeedLines(true);
      if (this.activeKey === 'stuck') {
        this.fuel = Math.max(0, this.fuel - 4);
        this.endEvent();
        beep('hit');
      }
    } else {
      this.drawSpeedLines(false);
      this.fuel -= stats.fuelUse * (forward ? 1.2 : 0.4) * dt;
      this.nitroCooldown = Math.max(0, this.nitroCooldown - dt);
    }

    if (this.fuel <= 0) {
      this.fuel = 0;
      if (Math.abs(this.speed) > 5) this.toastFuelEmpty();
    }

    let turn = 0;
    if (left) turn -= 1;
    if (right) turn += 1;
    const turnRate = (0.7 + this.speed / (max || 1)) * 1.15 * this.steerMul * buffTraction;
    this.angle += turn * turnRate * dt;

    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.player.setVelocity(vx, vy);
    this.player.setRotation(this.angle + Math.PI / 2);

    if (this.activeKey === 'overheat') {
      if (this.speed < max * 0.3) this.overheatSlowTimer += dt;
      else this.overheatSlowTimer = 0;
      if (this.overheatSlowTimer > 1.2) this.endEvent();
    }
  }

  private updateHUD() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.max(0, Math.floor(this.timeLeft % 60));
    this.hudSpeed.setText(`السرعة: ${Math.round(this.speed)}`);
    this.hudFuel.setText(`البنزين: ${this.fuel.toFixed(0)}%`);
    this.hudTime.setText(`الغروب: ${mins}:${secs.toString().padStart(2, '0')}`);
    const missing = getMissingEssentials(this.collected);
    this.hudItems.setText(`الأغراض: ${missing.length ? 'ناقص ' + missing.length : 'كامل'}`);
    if (!this.timePulseStarted && this.timeLeft <= 30) {
      this.timePulseStarted = true;
      this.tweens.add({
        targets: this.hudTime,
        scale: 1.15,
        yoyo: true,
        repeat: -1,
        duration: 320
      });
      this.toast.show('الشمس قربت… شد!');
    }
  }

  private updateBackground(dt: number) {
    const progress = Phaser.Math.Clamp(this.player.x / this.worldWidth, 0, 1);
    const fade = Phaser.Math.Clamp((progress - 0.45) / 0.15, 0, 1);
    this.roadLayer.setAlpha(1 - fade * 0.9);
    const scroll = this.speed * dt;
    if (this.duneLayers.length) {
      this.duneLayers.forEach((l) => (l.sprite.tilePositionX += scroll * l.speed));
    }
    if (this.cc0Ground) this.cc0Ground.tilePositionX = this.cameras.main.scrollX * 0.9;
    this.sky.tilePositionY = (RUN_SECONDS - this.timeLeft) * 0.2;
  }

  private updateShadow() {
    this.shadow.setPosition(this.player.x, this.player.y + 12);
    this.shadow.setRotation(this.player.rotation);
  }

  private finishRun(success: boolean, reason: string) {
    if (this.isFinished) return;
    this.isFinished = true;
    if (success) inc('rafiah_wins', 1);
    else inc('rafiah_fails', 1);
    if (!this.collected.has('salt')) inc('rafiah_forgot_salt_count', 1);
    const best = getNumber('rafiah_best_time', Infinity);
    if (success && this.elapsed < best) setNumber('rafiah_best_time', this.elapsed);
    const payload = {
      result: success ? 'win' : 'fail',
      collected: Array.from(this.collected),
      vehicle: this.vehicle,
      reason,
      timeUsedSeconds: this.elapsed,
      eventsTriggered: this.eventsTriggered,
      funniestKey: this.funniestKey,
      funnies: this.funnies.slice(-3)
    };
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CampScene', payload);
    });
  }
}
