import Phaser from 'phaser';

const COLORS = {
  bg: 0x0b0f14,
  sand: 0xf2d7a6,
  dune: 0xe4c48e,
  accent: 0x2e86ab,
  text: '#e8f1ff'
};

type VehicleType = 'gmc' | 'prado';

interface RunData {
  vehicle: VehicleType;
}

const overlayEl = document.getElementById('error-overlay') as HTMLElement | null;
function showError(message: string) {
  if (!overlayEl) return;
  overlayEl.textContent = message;
  overlayEl.setAttribute('style', overlayEl.getAttribute('style') || '');
  overlayEl.style.display = 'block';
}

window.addEventListener('error', ev => showError(`window.error: ${ev.message}`));
window.addEventListener('unhandledrejection', ev => showError(`unhandledrejection: ${String(ev.reason)}`));

class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.fadeIn(180, 0, 0, 0);
    const title = this.add.text(width / 2, height / 2 - 120, 'الرافعية', {
      fontSize: '52px',
      fontFamily: 'system-ui, sans-serif',
      color: COLORS.text
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height / 2 - 60, 'مغامرة الكثبان — اختيار المركبة', {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#cdd7ff'
    }).setOrigin(0.5);

    const btnGmc = this.makeButton(width / 2 - 120, height / 2 + 30, 'GMC (أسود)', () => this.start('gmc'));
    const btnPrado = this.makeButton(width / 2 + 120, height / 2 + 30, 'Prado (بني)', () => this.start('prado'));
    const startBtn = this.makeButton(width / 2, height / 2 + 110, 'ابدأ', () => this.start(this.selected || 'gmc'), 32);

    this.selected = 'gmc';
    this.highlight(btnGmc, true);

    btnGmc.on('pointerdown', () => { this.selected = 'gmc'; this.highlight(btnGmc, true); this.highlight(btnPrado, false); });
    btnPrado.on('pointerdown', () => { this.selected = 'prado'; this.highlight(btnPrado, true); this.highlight(btnGmc, false); });

    this.input.keyboard?.on('keydown-ENTER', () => startBtn.emit('pointerdown'));
    this.input.keyboard?.on('keydown-SPACE', () => startBtn.emit('pointerdown'));

    this.tweens.add({ targets: [title, subtitle], alpha: { from: 0, to: 1 }, duration: 250 });
  }

  selected: VehicleType = 'gmc';

  makeButton(x: number, y: number, label: string, cb: () => void, fontSize = 24) {
    const btn = this.add.text(x, y, label, {
      fontSize: `${fontSize}px`,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 14, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', cb);
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    return btn;
  }

  highlight(btn: Phaser.GameObjects.Text, active: boolean) {
    btn.setStyle({ backgroundColor: active ? '#4ba3d6' : '#2e86ab' });
    btn.setScale(active ? 1.05 : 1);
  }

  start(vehicle: VehicleType) {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('RunScene', { vehicle } as RunData);
    });
  }
}

interface Item {
  key: string;
  label: string;
  color: number;
  x: number;
  y: number;
}

class RunScene extends Phaser.Scene {
  vehicle: VehicleType = 'gmc';
  player!: Phaser.Physics.Arcade.Sprite;
  shadow!: Phaser.GameObjects.Image;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  fuel = 100;
  nitro = { active: false, timer: 0, cooldown: 0 };
  items: Item[] = [];
  collected = new Set<string>();
  hud: Record<string, Phaser.GameObjects.Text> = {};
  timerTotal = 210;
  timer = this.timerTotal;
  finishX = 2800;
  chaosQueue: string[] = [];
  chaosCooldown = 12;
  chaosTimer = 6;
  statusText!: Phaser.GameObjects.Text;
  trailTimer = 0;
  constructor() { super('RunScene'); }

  preload() { this.makeTextures(); }

  makeTextures() {
    const g = this.add.graphics();
    // car body
    g.fillStyle(this.vehicle === 'prado' ? 0x8b5a2b : 0x111111, 1);
    g.fillRoundedRect(0, 0, 56, 30, 6);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(6, 6, 18, 10);
    g.fillRect(32, 6, 18, 10);
    g.generateTexture('car-body', 56, 30);
    g.clear();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(28, 16, 60, 20);
    g.generateTexture('car-shadow', 60, 24);
    g.clear();
    // rock
    g.fillStyle(0x7c5b3a, 1);
    g.fillCircle(0, 0, 12);
    g.generateTexture('rock', 24, 24);
    g.clear();
    // puff
    g.fillStyle(0xffffff, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture('puff', 10, 10);
    g.clear();
    // finish
    g.fillStyle(0xf4c27a, 1);
    g.fillRect(0, 0, 140, 16);
    g.fillStyle(0x111111, 1);
    for (let i = 0; i < 14; i += 1) {
      if (i % 2 === 0) g.fillRect(i * 10, 0, 10, 16);
    }
    g.generateTexture('finish', 140, 16);
    g.clear();
    // dune tiles
    g.fillStyle(COLORS.sand, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0xe9c792, 0.4);
    for (let i = 0; i < 10; i += 1) {
      g.strokeCircle(Phaser.Math.Between(0, 64), Phaser.Math.Between(0, 64), Phaser.Math.Between(1, 3));
    }
    g.generateTexture('sand-tex', 64, 64);
    g.clear();
    g.lineStyle(3, COLORS.dune, 0.6);
    for (let x = 0; x < 256; x += 12) {
      const y = 60 + Math.sin(x * 0.12) * 10;
      g.lineBetween(x, y, x + 12, 60 + Math.sin((x + 12) * 0.12) * 10);
    }
    g.generateTexture('ridge', 256, 128);
    g.destroy();
  }

  create(data: RunData) {
    this.vehicle = data?.vehicle ?? 'gmc';
    this.timer = this.timerTotal;
    this.fuel = 100;
    this.collected.clear();
    this.chaosQueue = ['stuck', 'overheat', 'flat', 'rain', 'helicopter', 'camel'];
    Phaser.Utils.Array.Shuffle(this.chaosQueue);
    this.chaosCooldown = 10;
    this.chaosTimer = 8;
    this.trailTimer = 0;

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.fadeIn(180, 0, 0, 0);

    // background
    this.add.tileSprite(0, 0, width, height, 'ridge').setOrigin(0, 0).setScrollFactor(0.1).setAlpha(0.4);
    this.add.tileSprite(0, height * 0.55, width, height * 0.45, 'sand-tex').setOrigin(0, 0).setScrollFactor(0.2);

    this.player = this.physics.add.sprite(160, height / 2, 'car-body');
    this.shadow = this.add.image(this.player.x, this.player.y + 12, 'car-shadow');
    this.shadow.setDepth(-1);
    this.physics.world.setBounds(0, 0, 3600, height);
    this.player.setCollideWorldBounds(true);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(220, 140);
    this.cameras.main.setFollowOffset(0, -30);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,ESC') as Record<string, Phaser.Input.Keyboard.Key>;

    this.spawnItems();
    this.spawnRocks();
    this.makeFinish();
    this.makeHUD();

    this.statusText = this.add.text(width / 2, 60, '', {
      fontSize: '20px',
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.35)',
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0);
  }

  spawnItems() {
    const labels = [
      { key: 'salt', label: 'ملح', color: 0xdcd6f7 },
      { key: 'water', label: 'مويه', color: 0x7fc8f8 },
      { key: 'charcoal', label: 'فحم', color: 0x2b2b2b },
      { key: 'lighter', label: 'ولاعة', color: 0xffc857 },
      { key: 'hummus', label: 'حمص', color: 0xfff2b2 }
    ];
    const spread = 2400;
    this.items = labels.map((item, i) => ({
      ...item,
      x: 400 + i * (spread / labels.length) + Phaser.Math.Between(-50, 50),
      y: Phaser.Math.Between(200, this.scale.height - 200)
    }));
    this.items.forEach(item => {
      const icon = this.add.rectangle(item.x, item.y, 28, 20, item.color).setStrokeStyle(2, 0x111111);
      this.physics.add.existing(icon, true);
      this.physics.add.overlap(this.player, icon as any, () => {
        if (!this.collected.has(item.key)) {
          this.collected.add(item.key);
          icon.destroy();
          this.toast(`أخذت ${item.label}`);
        }
      });
    });
  }

  spawnRocks() {
    for (let i = 0; i < 8; i += 1) {
      const x = Phaser.Math.Between(500, 3200);
      const y = Phaser.Math.Between(180, this.scale.height - 180);
      const rock = this.physics.add.staticImage(x, y, 'rock');
      rock.body.setCircle(12);
      this.physics.add.overlap(this.player, rock, () => this.hitRock(rock), undefined, this);
    }
  }

  makeFinish() {
    const y = this.scale.height / 2;
    const gate = this.physics.add.staticImage(this.finishX, y, 'finish');
    (gate.body as Phaser.Physics.Arcade.StaticBody).setSize(140, 2000);
    this.physics.add.overlap(this.player, gate, () => this.win(), undefined, this);
  }

  makeHUD() {
    const panel = this.add.graphics().setScrollFactor(0);
    panel.fillStyle(0x0b0f14, 0.75);
    panel.fillRoundedRect(12, 12, 320, 120, 12);
    const style = { fontSize: '18px', fontFamily: 'system-ui, sans-serif', color: '#e8f1ff' };
    this.hud.speed = this.add.text(20, 20, 'Speed: 0', style).setScrollFactor(0);
    this.hud.fuel = this.add.text(20, 44, 'Fuel: 100%', style).setScrollFactor(0);
    this.hud.timer = this.add.text(20, 68, 'Time: 0', style).setScrollFactor(0);
    this.hud.items = this.add.text(20, 92, 'Items: 0/5', style).setScrollFactor(0);
    this.hud.timeLeft = this.add.text(this.scale.width - 16, 20, '', style).setOrigin(1, 0).setScrollFactor(0);
  }

  update(time: number, delta: number) {
    if (!this.player) return;
    const dt = delta / 1000;
    this.timer -= dt;
    if (this.timer <= 0) return this.fail();

    this.handleInput(dt);
    this.updateHUD();
    this.updateTrail(dt);
    this.handleChaos(dt);
    this.shadow.setPosition(this.player.x, this.player.y + 12);
  }

  handleInput(dt: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const throttle = this.cursors.up.isDown || this.keys.W.isDown;
    const brake = this.cursors.down.isDown || this.keys.S.isDown;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const boostReq = this.keys.SPACE.isDown;

    if (this.nitro.cooldown > 0) this.nitro.cooldown -= dt;
    if (this.nitro.active) {
      this.nitro.timer -= dt;
      if (this.nitro.timer <= 0) {
        this.nitro.active = false;
        this.nitro.cooldown = 3;
      }
    } else if (boostReq && this.nitro.cooldown <= 0 && this.fuel > 5) {
      this.nitro.active = true;
      this.nitro.timer = 1;
      this.toast('نيترو!');
    }

    const accel = throttle ? 170 : 0;
    const brakeForce = brake ? 220 : 0;
    const boost = this.nitro.active ? 300 : 0;
    const fuelDrain = throttle ? 6 * dt : 1.5 * dt;
    this.fuel = Math.max(0, this.fuel - fuelDrain - (this.nitro.active ? 8 * dt : 0));

    const drag = 0.9;
    const maxSpeed = this.fuel <= 0 ? 220 : 420;
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    const speed = body.velocity.length();
    const speedNorm = Phaser.Math.Clamp(speed / maxSpeed, 0, 1);

    const ax = (accel + boost - brakeForce - drag * speed) * Math.cos(this.player.rotation);
    const ay = (accel + boost - brakeForce - drag * speed) * Math.sin(this.player.rotation);
    body.velocity.x += ax * dt;
    body.velocity.y += ay * dt;
    if (body.velocity.length() > maxSpeed) {
      body.velocity.setLength(maxSpeed);
    }
    if (Math.abs(steer) > 0.1 && speed > 10) {
      this.player.rotation += steer * (2.6 + 2 * speedNorm) * dt;
    }

    this.cameras.main.setFollowOffset(0, -30 + Math.sin(this.time.now * 0.003) * 8);
  }

  updateTrail(dt: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && body.velocity.length() > 40) {
      this.trailTimer = 0.05;
      const offset = new Phaser.Math.Vector2(-20, 6).rotate(this.player.rotation);
      const puff = this.add.image(this.player.x + offset.x, this.player.y + offset.y, 'puff')
        .setScale(Phaser.Math.FloatBetween(0.8, 1.2))
        .setAlpha(0.7);
      this.tweens.add({
        targets: puff,
        alpha: 0,
        scale: puff.scale * 1.8,
        duration: 320,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy()
      });
    }
  }

  updateHUD() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = Math.round(body.velocity.length());
    const dist = Math.max(0, this.finishX - this.player.x);
    this.hud.speed?.setText(`Speed: ${speed}`);
    this.hud.fuel?.setText(`Fuel: ${Math.round(this.fuel)}%`);
    this.hud.timer?.setText(`Time: ${this.timer.toFixed(1)}s`);
    this.hud.items?.setText(`Items: ${this.collected.size}/5`);
    this.hud.timeLeft?.setText(`Finish @ ${this.finishX} | Dist ${dist.toFixed(0)}m`);
  }

  handleChaos(dt: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.chaosTimer -= dt;
    if (this.chaosTimer > 0 || this.chaosQueue.length === 0) return;
    this.chaosTimer = this.chaosCooldown;
    this.chaosCooldown = Math.max(6, this.chaosCooldown - 1);
    const event = this.chaosQueue.shift()!;
    switch (event) {
      case 'stuck': this.toast('علقنا بالرمل!'); body.velocity.scale(0.4); break;
      case 'overheat': this.toast('الموتر حار، خف!'); body.velocity.scale(0.6); break;
      case 'flat': this.toast('كفر مهبط، السرعة محدودة'); body.setMaxSpeed?.(240); break;
      case 'rain': this.toast('مطر خفيف، امسك الخط'); body.velocity.scale(0.7); break;
      case 'helicopter': this.toast('تدريب هليكوبتر فوقنا!'); this.cameras.main.shake(150, 0.003); break;
      case 'camel': this.toast('جمل يقطع الطريق!'); body.velocity.scale(0.5); break;
    }
  }

  toast(msg: string) {
    this.statusText?.setText(msg);
    this.tweens.add({ targets: this.statusText, alpha: { from: 1, to: 0 }, duration: 800, onComplete: () => this.statusText?.setAlpha(1) });
  }

  hitRock(rock: Phaser.GameObjects.GameObject) {
    (this.player.body as Phaser.Physics.Arcade.Body).velocity.scale(0.5);
    this.cameras.main.shake(150, 0.004);
    this.toast('حجر يوقفنا شوي');
  }

  win() {
    this.cameras.main.fadeOut(220, 0, 0, 0, () => {
      this.scene.start('CampScene', { win: true, items: Array.from(this.collected) });
    });
  }

  fail() {
    this.scene.start('CampScene', { win: false, items: Array.from(this.collected) });
  }
}

class CampScene extends Phaser.Scene {
  win = false;
  items: string[] = [];
  constructor() { super('CampScene'); }
  init(data: { win: boolean; items: string[] }) {
    this.win = data?.win ?? false;
    this.items = data?.items ?? [];
  }
  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.fadeIn(180, 0, 0, 0);
    const title = this.add.text(width / 2, height / 2 - 120, this.win ? 'وصلنا المخيم 🔥' : 'غابت الشمس قبل لا نوصل', {
      fontSize: '36px',
      fontFamily: 'system-ui, sans-serif',
      color: this.win ? '#f4c27a' : '#ffaaaa'
    }).setOrigin(0.5);

    const recap = this.add.text(width / 2, height / 2 - 50, `الأغراض: ${this.items.length}/5`, {
      fontSize: '20px',
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    const missing = ['salt', 'water', 'charcoal', 'lighter', 'hummus'].filter(k => !this.items.includes(k));
    const missText = this.add.text(width / 2, height / 2 - 10, missing.length ? `ناقص: ${missing.join(', ')}` : 'كاملين!', {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#cdd7ff'
    }).setOrigin(0.5);

    const flavor = this.win ? 'القهوة والقدر جاهزة ✨' : 'نرجع بكرة إن شاء الله.';
    this.add.text(width / 2, height / 2 + 30, flavor, {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e8f1ff'
    }).setOrigin(0.5);

    const restart = this.add.text(width / 2, height / 2 + 100, '↻ رجوع للقائمة', {
      fontSize: '24px',
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 14, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.on('pointerdown', () => this.scene.start('MenuScene'));
    restart.on('pointerover', () => restart.setScale(1.05));
    restart.on('pointerout', () => restart.setScale(1));

    if (this.win) {
      for (let i = 0; i < 15; i += 1) {
        const dx = Phaser.Math.Between(-140, 140);
        const dy = Phaser.Math.Between(-20, 40);
        const puff = this.add.circle(title.x + dx, title.y + dy, Phaser.Math.Between(2, 4), 0xf4c27a, 0.9);
        this.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 1.8,
          duration: Phaser.Math.Between(300, 600),
          ease: 'Sine.easeOut',
          delay: Phaser.Math.Between(0, 200),
          onComplete: () => puff.destroy()
        });
      }
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: COLORS.bg,
  parent: 'app',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scene: [MenuScene, RunScene, CampScene]
});
