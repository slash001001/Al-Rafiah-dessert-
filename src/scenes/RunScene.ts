import Phaser from 'phaser';
import { ItemKey, itemMeta, essentials, getMissingEssentials } from '../data/items';
import { ensureProceduralArt } from '../visual/Procedural';
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
import { makeInputState } from '../input/InputState';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchControls } from '../input/TouchControls';
import { makeRoutePlan, RoutePlan, RouteKey } from '../systems/RoutePlanner';

type Vehicle = 'gmc' | 'prado';

interface RunData {
  vehicle: Vehicle;
  collected?: ItemKey[];
  skippedPack?: boolean;
}

const RUN_SECONDS = balance.RUN_SECONDS;

interface POI {
  sprite: Phaser.GameObjects.Image;
  body: Phaser.Physics.Arcade.StaticBody;
  type: 'station' | 'shop' | 'restaurant';
  used: boolean;
}

type DogSprite = Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body };

export default class RunScene extends Phaser.Scene {
  private vehicle: Vehicle = 'gmc';
  private player!: Phaser.Physics.Arcade.Image;
  private shadow!: Phaser.GameObjects.Image;
  private worldWidth = 5200;
  private worldHeight = 1400;
  private duneLayers: { sprite: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private roadLayer!: Phaser.GameObjects.TileSprite;
  private groundDunes!: Phaser.GameObjects.TileSprite;
  private sky!: Phaser.GameObjects.TileSprite;
  private sunDisk!: Phaser.GameObjects.Graphics;
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
  private finishFlag!: Phaser.GameObjects.Image;
  private finishLabel!: Phaser.GameObjects.Text;
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
  private badges: string[] = [];
  private initialCollected: ItemKey[] = [];
  private joke!: JokeEngine;
  private isPaused = false;
  private pauseMenu!: PauseMenu;
  private freezeUntil = 0;
  private speedLines!: Phaser.GameObjects.Graphics;
  private timePulseStarted = false;
  private buffActiveUntil = 0;
  private dunesEntered = false;
  private sunsetOverlay!: Phaser.GameObjects.Graphics;
  private inputState = makeInputState();
  private keyboard!: KeyboardInput;
  private touch!: TouchControls;
  private routePlan!: RoutePlan;
  private forkShown = false;
  private forkSafeZone?: Phaser.GameObjects.Zone;
  private forkRiskyZone?: Phaser.GameObjects.Zone;
  private routeLabel!: Phaser.GameObjects.Text;
  private hudDistance!: Phaser.GameObjects.Text;
  private finishTargetProgress = 1;

  constructor() {
    super('RunScene');
  }

  init(data: RunData) {
    this.vehicle = data?.vehicle || 'gmc';
    this.initialCollected = data?.collected || [];
  }

  preload() {
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

    this.createBackgroundLayers();
    this.routePlan = makeRoutePlan(this.rng);

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    const stats = this.vehicleStats();
    const startY = this.worldHeight - 220;

    const shadowKey = ArtKeys.VEH_SHADOW;
    const vehKey = this.vehicle === 'gmc' ? ArtKeys.VEH_GMC : ArtKeys.VEH_PRADO;
    const VEH_SCALE_GMC = 0.4;
    const VEH_SCALE_PRADO = 0.4;
    const scale = this.vehicle === 'gmc' ? VEH_SCALE_GMC : VEH_SCALE_PRADO;
    this.shadow = this.add.image(180, startY, shadowKey).setDepth(1).setScale(scale * 0.9).setAlpha(0.35);
    this.player = this.physics.add.image(180, startY, vehKey).setDepth(2);
    this.player.setScale(scale);
    this.player.setDamping(true).setDrag(stats.drag).setMaxVelocity(stats.max).setAngularDrag(600);
    this.player.setSize(this.player.width * 0.55, this.player.height * 0.7).setCollideWorldBounds(true);

    this.createPOIs();
    this.createItems();
    this.createFinish();
    this.createHUD();
    this.routeLabel = this.add.text(28, 138, 'المسار: لم يُحدد', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.hudDistance = this.add.text(28, 162, 'المسافة: 100%', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.createTrailTimer();
    this.joke.setContext({ veh: this.vehicle, place: 'الرافعية', runCount: getNumber('rafiah_runs', 1) });
    this.speedLines = this.add.graphics().setDepth(5).setScrollFactor(0).setAlpha(0);
    this.pauseMenu = new PauseMenu(
      this,
      () => (this.isPaused = false),
      () => this.scene.restart({ vehicle: this.vehicle }),
      () => this.scene.start('MenuScene')
    );

    this.keyboard = new KeyboardInput(this);
    this.touch = new TouchControls(this);
    if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
      this.toast.show('تحكم باللمس جاهز ✅');
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(240, 160);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    const debug = new URL(window.location.href).searchParams.get('debug') === '1';
    if (debug) {
      const artMode = (this.registry.get('artMode') as string) || 'procedural';
      this.add
        .text(12, this.scale.height - 14, `ART MODE: ${artMode}`, {
          fontSize: '12px',
          color: '#e5e7eb',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
        })
        .setScrollFactor(0)
        .setDepth(40);
    }
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

    if (this.initialCollected.length) {
      this.initialCollected.forEach((k) => this.collectItem(k));
      this.toast.show('الشنطة فيها أساسيات جاهزة');
    }
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

  private createBackgroundLayers() {
    const { width, height } = this.scale;
    this.sky = this.add.tileSprite(width / 2, height / 2, width, height, ArtKeys.BG_SKY).setScrollFactor(0);
    this.sunDisk = this.add.graphics().setScrollFactor(0).setDepth(0.1);
    this.sunDisk.fillStyle(0xfbbf24, 0.7);
    this.sunDisk.fillCircle(width * 0.78, height * 0.28, 28);
    this.createDuneLayers(width, height);
    this.groundDunes = this.add
      .tileSprite(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, ArtKeys.GROUND_DUNES)
      .setDepth(0.4)
      .setAlpha(0);
    this.createRoadLayer();
    this.sunsetOverlay = this.add.graphics().setScrollFactor(0).setDepth(50);
  }

  private createDuneLayers(screenW: number, screenH: number) {
    const l3 = this.add.tileSprite(screenW / 2, screenH / 2 + 60, screenW, screenH, ArtKeys.DUNE_FAR).setScrollFactor(0);
    const l2 = this.add.tileSprite(screenW / 2, screenH / 2 + 30, screenW, screenH, ArtKeys.DUNE_MID).setScrollFactor(0);
    const l1 = this.add.tileSprite(screenW / 2, screenH / 2, screenW, screenH, ArtKeys.DUNE_NEAR).setScrollFactor(0);
    l3.setTileScale(1.4, 2);
    l2.setTileScale(1.3, 1.9);
    l1.setTileScale(1.2, 1.8);
    this.duneLayers = [
      { sprite: l3, speed: 0.12 },
      { sprite: l2, speed: 0.25 },
      { sprite: l1, speed: 0.45 }
    ];
  }

  private createRoadLayer() {
    const roadY = this.worldHeight - 140;
    this.roadLayer = this.add
      .tileSprite(this.worldWidth / 2, roadY, this.worldWidth, 140, ArtKeys.GROUND_ROAD)
      .setOrigin(0.5, 1)
      .setAlpha(1);
    this.roadLayer.setDepth(1);
  }

  private createPOIs() {
    const roadY = this.worldHeight - 200;
    const data: { x: number; type: POI['type']; tex: string; label: string }[] = [
      { x: 520, type: 'station', tex: ArtKeys.POI_STATION, label: 'محطة' },
      { x: 1100, type: 'shop', tex: ArtKeys.POI_SHOP, label: 'بقالة' },
      { x: 1650, type: 'restaurant', tex: ArtKeys.POI_RESTAURANT, label: 'مطعم' }
    ];
    data.forEach((d) => {
      this.add.rectangle(d.x + 6, roadY - 6, 70, 70, 0x000000, 0.15).setDepth(1.5).setOrigin(0.5, 1);
      const sprite = this.add.image(d.x, roadY, d.tex).setDepth(2).setOrigin(0.5, 1).setScale(0.55);
      this.add.text(d.x, roadY - 80, d.label, {
        fontSize: '18px',
        color: '#e5e7eb',
        fontFamily: 'system-ui',
        stroke: '#0f172a',
        strokeThickness: 4
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
    this.finishFlag = this.add.image(zoneX, zoneY - 120, ArtKeys.FINISH_FLAG).setDepth(2);
    this.tweens.add({ targets: this.finishFlag, scale: 1.08, yoyo: true, repeat: -1, duration: 650 });
    this.finishLabel = this.add.text(zoneX, zoneY + 100, 'قمة الطعس', {
      fontSize: '18px',
      color: '#fef08a',
      fontFamily: 'system-ui',
      stroke: '#0f172a',
      strokeThickness: 4
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
    const mult = this.inputState.nitro ? 1.6 : 1;
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
    const panel = this.add.rectangle(16, 16, 320, 200, 0x0f172a, 0.75)
      .setOrigin(0)
      .setStrokeStyle(2, 0xfcd34d)
      .setScrollFactor(0)
      .setDepth(10);
    this.hudSpeed = this.add.text(28, 30, 'السرعة: 0', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.hudFuel = this.add.text(28, 54, 'البنزين: 100', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.hudTime = this.add.text(28, 78, 'الغروب: 00:00', this.hudStyle()).setScrollFactor(0).setDepth(11);
    this.hudItems = this.add.text(28, 104, 'الأغراض:', this.hudStyle()).setScrollFactor(0).setDepth(11);

    essentials.forEach((k, idx) => {
      const icon = this.add.image(110 + idx * 38, 132, itemMeta[k].textureKey).setScrollFactor(0).setDepth(11).setScale(0.4);
      icon.setTint(0x475569);
      this.hudIcons[k] = icon;
    });
    const hummusIcon = this.add.image(110 + essentials.length * 38, 132, itemMeta.hummus.textureKey).setScrollFactor(0).setDepth(11).setScale(0.4);
    hummusIcon.setTint(0x475569);
    this.hudIcons.hummus = hummusIcon;

    this.children.bringToTop(panel);

    // Progress bar with markers
    const barX = this.scale.width / 2 - 180;
    const barY = 20;
    const barW = 360;
    const barH = 12;
    const barBg = this.add.rectangle(barX, barY, barW, barH, 0x111827, 0.8).setOrigin(0, 0).setScrollFactor(0).setDepth(11);
    const barFill = this.add.rectangle(barX, barY, 0, barH, 0xfcd34d, 0.9).setOrigin(0, 0).setScrollFactor(0).setDepth(12);
    const markersX = [520, 1100, 1650, this.worldWidth * (this.routePlan?.forkAtProgress || 0.45), this.worldWidth * this.finishTargetProgress];
    markersX.forEach((mx, idx) => {
      const t = Phaser.Math.Clamp(mx / this.worldWidth, 0, 1);
      const color = idx === markersX.length - 1 ? 0x22c55e : 0x38bdf8;
      this.add.rectangle(barX + t * barW, barY - 4, 6, barH + 8, color, 0.9).setOrigin(0.5, 0).setScrollFactor(0).setDepth(13);
    });
    this.events.on('update', () => {
      const progress = Phaser.Math.Clamp(this.player ? this.player.x / this.worldWidth : 0, 0, 1);
      barFill.width = barW * progress;
    });
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
    this.pushFunny(line);
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
    let intensity = ev.intensity;
    if (this.routePlan?.chosen) {
      const mul = (this.routePlan as any)[this.routePlan.chosen].chaosMul || 1;
      intensity = Math.min(3, Math.max(1, Math.round(intensity * mul))) as 1 | 2 | 3;
    }
    this.activeEndsAt = this.elapsed + ev.dur;
    this.eventsTriggered.push(ev.key);
    this.funniestKey = ev.key;
    const timeIntensity = this.eventIntensityFromTime();
    this.joke.setContext({ timeLeftSec: this.timeLeft });
    switch (ev.key) {
      case 'stuck':
        this.tractionMul = 0.35 + intensity * 0.1;
        this.maxSpeedMul = 0.55 + intensity * 0.08;
        this.toast.show(this.joke.pick('event_stuck', timeIntensity, 'تغريز'));
        break;
      case 'overheat':
        this.maxSpeedMul = 0.65 + intensity * 0.06;
        this.nitroDisabledUntil = this.activeEndsAt;
        this.toast.show(this.joke.pick('event_overheat', timeIntensity, 'حرارة!'));
        break;
      case 'flat':
        this.maxSpeedMul = 0.7 + intensity * 0.05;
        this.steerMul = 0.7 + intensity * 0.08;
        this.activeEndsAt = this.elapsed + randInt(this.rng, 12, 18);
        this.toast.show(this.joke.pick('event_flat', timeIntensity, 'بنشر'));
        break;
      case 'rain':
        this.tractionMul = 0.7 + intensity * 0.05;
        this.toast.show(this.joke.pick('event_rain', timeIntensity, 'مطر'));
        this.showRain();
        break;
      case 'helicopter':
        this.toast.show(this.joke.pick('event_helicopter', timeIntensity, 'هيلوكبتر'));
        this.spawnHelicopter();
        inc('rafiah_helicopter_seen', 1);
        break;
      case 'camel':
        this.toast.show(this.joke.pick('event_camel', timeIntensity, 'جمل يقطع الطريق'));
      this.spawnCamel();
      Feel.shake(this, 100, 0.003);
      break;
    case 'dogs':
      this.toast.show(this.joke.pick('event_dogs_safe', timeIntensity, 'زمّر لهم'));
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
    const useSprite = this.textures.exists(ArtKeys.HELICOPTER);
    const heli = useSprite
      ? (this.add.image(-80, y, ArtKeys.HELICOPTER).setDepth(15) as Phaser.GameObjects.Image)
      : (this.add.rectangle(-80, y, 80, 28, 0x38bdf8).setStrokeStyle(2, 0x0ea5e9).setDepth(15) as any);
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
    const camel = this.textures.exists(ArtKeys.CAMEL)
      ? (this.add.image(-60, y, ArtKeys.CAMEL).setDepth(10) as Phaser.GameObjects.Image)
      : (this.add.rectangle(-60, y, 80, 44, 0xd4a373).setStrokeStyle(2, 0x8b5e34).setDepth(10) as any);
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
      const hasDog = this.textures.exists(ArtKeys.DOG);
      const dog = hasDog
        ? (this.add.image(this.player.x + 200 + i * 20, y, ArtKeys.DOG).setDepth(9) as DogSprite)
        : (this.add.rectangle(this.player.x + 200 + i * 20, y, 46, 26, 0xcbd5e1).setStrokeStyle(2, 0x475569).setDepth(9) as DogSprite);
      this.physics.add.existing(dog, false);
      const body = dog.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(-120 - i * 10);
      this.dogs.push(dog);
      this.physics.add.overlap(this.player, dog, () => {
        this.speed *= 0.7;
        if ('setFillStyle' in dog) (dog as any).setFillStyle?.(0x22c55e);
        body.setVelocity(180, Phaser.Math.Between(-60, 60));
        this.pushFunny('كلب طق جونا وهرب');
        Feel.hitStop(this, 50);
        Feel.shake(this, 80, 0.002);
      });
    }
  }

  private handleHonk(dt: number) {
    if (this.inputState.honk) {
      if (this.honkTimer <= 0) {
        beep('ui');
        this.honkTimer = 0.4;
        this.dogs.forEach((dog) => {
          const body = dog.body;
          body.setVelocity(200, Phaser.Math.Between(-80, 80));
          if ('setFillStyle' in dog) (dog as any).setFillStyle?.(0x22c55e);
        });
      }
    }
    if (this.honkTimer > 0) this.honkTimer -= dt;
  }

  private spawnFork() {
    this.forkShown = true;
    const forkX = this.worldWidth * this.routePlan.forkAtProgress;
    const baseY = this.worldHeight / 2;
    const makeSign = (x: number, label: string, align: 'left' | 'right') => {
      const bg = this.add.rectangle(x, baseY - 200, 220, 70, 0x111827, 0.9).setStrokeStyle(2, 0xfcd34d).setDepth(6);
      const txt = this.add.text(x, baseY - 200, label, {
        fontSize: '18px',
        color: '#f8fafc',
        fontFamily: 'system-ui'
      }).setOrigin(align === 'left' ? 0 : 1, 0.5).setDepth(7);
      return [bg, txt];
    };
    const [safeBg, safeTxt] = makeSign(forkX - 180, '⬅ الطريق الآمن', 'left');
    const [riskBg, riskTxt] = makeSign(forkX + 180, 'الاختصار الخطير ➡', 'right');

    const makeZone = (x: number, route: RouteKey) => {
      const z = this.add.zone(x, baseY, 220, 280).setOrigin(0.5);
      this.physics.add.existing(z, true);
      this.physics.add.overlap(this.player, z, () => this.lockRoute(route, [safeBg, safeTxt, riskBg, riskTxt, z, route === 'safe' ? this.forkRiskyZone : this.forkSafeZone]));
      return z;
    };
    this.forkSafeZone = makeZone(forkX - 140, 'safe');
    this.forkRiskyZone = makeZone(forkX + 140, 'risky');
  }

  private lockRoute(route: RouteKey, toDestroy?: (Phaser.GameObjects.GameObject | undefined)[]) {
    if (this.routePlan.chosen) return;
    this.routePlan.chosen = route;
    if (toDestroy) {
      toDestroy.forEach((o) => o && o.destroy());
    }
    const choiceToast = route === 'safe' ? 'اخترت الطريق الآمن… هدوء 👌' : 'اخترت الاختصار… الله يستر 😂';
    this.toast.show(choiceToast);
    if (route === 'safe') inc('route_safe_count', 1);
    if (route === 'risky') inc('route_risky_count', 1);
    this.finishTargetProgress = route === 'risky' ? this.routePlan.risky.finishProgress : this.routePlan.safe.finishProgress;
    this.repositionFinish();
    if (route === 'risky') {
      this.time.delayedCall(10000, () => this.spawnStash());
    }
  }

  private repositionFinish() {
    const targetX = Math.max(400, this.worldWidth * this.finishTargetProgress);
    const zoneX = targetX - 200;
    this.finishZone.setPosition(zoneX, this.finishZone.y);
    this.finishFlag.setPosition(zoneX, this.finishFlag.y);
    this.finishLabel.setPosition(zoneX, this.finishLabel.y);
  }

  private spawnStash() {
    if (this.isFinished) return;
    const missing = getMissingEssentials(this.collected);
    const rewardItem = missing.length ? missing[0] : null;
    const x = this.player.x + 200;
    const y = this.player.y;
    const iconKey = rewardItem ? itemMeta[rewardItem].textureKey : ArtKeys.ICON_WATER;
    const stash = this.physics.add.staticImage(x, y, iconKey).setScale(0.8).setDepth(4);
    this.physics.add.overlap(this.player, stash, () => {
      if (rewardItem) {
        this.collectItem(rewardItem);
        this.toast.show('لقينا تموين صدفة 😭');
      } else {
        this.fuel = Math.min(100, this.fuel + 15);
        this.toast.show('لقينا موية زيادة');
      }
      stash.destroy();
    });
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
    this.inputState.pausePressed = false;
    this.keyboard.update(this.inputState);
    this.touch.update(this.inputState);
    if (this.inputState.pausePressed) {
      this.isPaused = !this.isPaused;
      this.pauseMenu[this.isPaused ? 'show' : 'hide']();
    }
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
      if (ev && this.routePlan?.chosen === 'safe' && this.rng() > this.routePlan.safe.chaosMul) ev = null;
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
    const forward = this.inputState.accel;
    const backward = this.inputState.brake;
    const left = this.inputState.left;
    const right = this.inputState.right;
    const nitroPressed = this.inputState.nitro && this.fuel > 5 && this.nitroCooldown <= 0 && this.elapsed >= this.nitroDisabledUntil;

    let accel = 0;
    if (forward) accel += stats.accel;
    if (backward) accel -= stats.accel * 0.5;
    accel *= this.accelMul * this.tractionMul;
    if (nitroPressed) accel *= 1.25;
    this.speed += accel * dt;

    const buff = this.buffActiveUntil > this.elapsed;
    const buffTraction = buff ? balance.planReward.buffTractionMul : 1;
    const buffMax = buff ? balance.planReward.buffMaxSpeedMul : 1;
    const routeChaosMul = this.routePlan.chosen ? (this.routePlan as any)[this.routePlan.chosen].chaosMul : 1;

    const dynamicDrag = stats.drag + this.speed * 0.12 + (this.fuel <= 0 ? 260 : 0);
    const max = this.fuel <= 0 ? stats.max * 0.35 : stats.max * this.maxSpeedMul * buffMax * (routeChaosMul > 1 ? 1.05 : 1);
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
    const progress = Phaser.Math.Clamp(this.player.x / this.worldWidth, 0, 1);
    this.hudDistance.setText(`المسافة: ${(100 - Math.floor(progress * 100)).toString()}%`);
    const routeText = this.routePlan.chosen ? (this.routePlan.chosen === 'safe' ? 'المسار: آمن' : 'المسار: اختصار') : 'المسار: اختر لاحقاً';
    this.routeLabel.setText(routeText);
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
    this.roadLayer.setAlpha(1 - fade * 0.95);
    if (this.groundDunes) this.groundDunes.setAlpha(fade);
    if (!this.dunesEntered && fade > 0.05) {
      this.dunesEntered = true;
      this.toast.show('دخلنا الطعوس 🏜️');
    }
    const scroll = this.speed * dt;
    if (this.duneLayers.length) {
      this.duneLayers.forEach((l) => (l.sprite.tilePositionX += scroll * l.speed));
    }
    if (this.groundDunes) {
      this.groundDunes.tilePositionX = this.player.x * 0.35;
      this.groundDunes.tilePositionY = this.player.y * 0.05;
    }
    if (this.roadLayer) {
      this.roadLayer.tilePositionX = this.player.x * 0.35;
      this.roadLayer.tilePositionY = this.player.y * 0.05;
    }
    this.sky.tilePositionY = (RUN_SECONDS - this.timeLeft) * 0.2;
    const t = 1 - Phaser.Math.Clamp(this.timeLeft / RUN_SECONDS, 0, 1);
    const overlayAlpha = Phaser.Math.Linear(0, 0.24, t);
    const lateBoost = this.timeLeft <= 30 ? 0.06 : 0;
    this.sunsetOverlay.clear();
    this.sunsetOverlay.fillStyle(0xf97316, overlayAlpha + lateBoost);
    this.sunsetOverlay.fillRect(0, 0, this.scale.width, this.scale.height);

    if (!this.routePlan.chosen && progress >= this.routePlan.forkAtProgress && !this.forkShown) {
      this.spawnFork();
    }
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
      funnies: this.funnies.slice(-3),
      route: this.routePlan?.chosen || 'safe'
    };
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CampScene', payload);
    });
  }
}
