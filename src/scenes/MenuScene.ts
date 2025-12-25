import Phaser from 'phaser';
import { setOverlayStatus } from '../ui/overlay';
import { inc } from '../systems/persist';
import { isMuted, toggleMute, beep } from '../ui/Sfx';
import { ensureProceduralArt } from '../visual/Procedural';
import { ArtKeys } from '../visual/ArtKeys';
import { JokeEngine } from '../systems/JokeEngine';
import { hashStringToSeed, mulberry32 } from '../systems/rng';
import { Feel } from '../systems/Feel';

type Vehicle = 'gmc' | 'prado';

export default class MenuScene extends Phaser.Scene {
  private selected: Vehicle = 'gmc';
  private muteLabel!: Phaser.GameObjects.Text;
  private dunes!: Phaser.GameObjects.TileSprite[];
  private tips: string[] = [];
  private tipIndex = 0;

  constructor() {
    super('MenuScene');
  }

  create() {
    ensureProceduralArt(this);
    const { width: wbg, height: hbg } = this.scale;
    const sky = this.add.tileSprite(wbg / 2, hbg / 2, wbg, hbg, ArtKeys.BG_SKY).setScrollFactor(0);
    const l3 = this.add.tileSprite(wbg / 2, hbg / 2 + 60, wbg, hbg, ArtKeys.DUNE_FAR).setScrollFactor(0);
    const l2 = this.add.tileSprite(wbg / 2, hbg / 2 + 30, wbg, hbg, ArtKeys.DUNE_MID).setScrollFactor(0);
    const l1 = this.add.tileSprite(wbg / 2, hbg / 2, wbg, hbg, ArtKeys.DUNE_NEAR).setScrollFactor(0);
    this.dunes = [l3, l2, l1];
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);
    setOverlayStatus('جاهز — اختر السيارة وابدأ');

    this.add.text(width / 2, height / 2 - 140, 'الرافعية', {
      fontSize: '48px',
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 90, 'طلعة بر… والتخطيط دايم مفقع', {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e5e7eb'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 60, 'التحكم: WASD/الأسهم — نيترو: Space — زمور: H', {
      fontSize: '14px',
      fontFamily: 'system-ui, sans-serif',
      color: '#cbd5e1'
    }).setOrigin(0.5);

    const cards: { x: number; v: Vehicle; label: string; desc: string }[] = [
      { x: width / 2 - 160, v: 'gmc', label: 'جمس أسود', desc: 'ثقيل • ثابت • يحرق بنزين' },
      { x: width / 2 + 160, v: 'prado', label: 'برادو بني', desc: 'خفيف • سريع • ينقلب أسهل' }
    ];

    cards.forEach((card) => this.makeCard(card.x, height / 2 + 10, card.v, card.label, card.desc));

    const start = this.makeButton(width / 2, height / 2 + 160, 'ابدأ الرحلة', () => this.startRun());
    this.input.keyboard?.on('keydown-ENTER', () => start.emit('pointerdown'));
    this.input.keyboard?.on('keydown-SPACE', () => start.emit('pointerdown'));

    this.muteLabel = this.add.text(width - 90, height - 40, this.muteText(), {
      fontSize: '14px',
      color: '#e5e7eb',
      backgroundColor: '#1f2937',
      padding: { x: 10, y: 6 },
      fontFamily: 'system-ui'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    this.muteLabel.on('pointerdown', () => {
      toggleMute();
      this.muteLabel.setText(this.muteText());
      beep('ui');
    });

    const seed = hashStringToSeed(`${Date.now()}-${Math.random()}`);
    const jokes = new JokeEngine(seed);
    jokes.setContext({ place: 'الرافعية' });
    this.tips = [
      jokes.pick('plan_failed_generic', 1, 'خطتنا بسيطة: نضحك ونمشي'),
      jokes.pick('hint_missing_essential', 1, 'تذكر الأساسيات قبل الطعس'),
      jokes.pick('forgot_salt', 1, 'الملح أهم من البنزين')
    ];
    this.add.text(width / 2, height - 70, this.tips[this.tipIndex], {
      fontSize: '14px',
      color: '#cbd5e1',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
  }

  private muteText() {
    return isMuted() ? '🔇 ميوت' : '🔊 صوت';
  }

  private makeCard(x: number, y: number, v: Vehicle, title: string, desc: string) {
    const container = this.add.container(x, y);
    const base = this.add.rectangle(0, 0, 220, 140, 0x111827, 0.9).setStrokeStyle(2, 0x38bdf8);
    const t = this.add.text(0, -30, title, { fontSize: '22px', color: '#e5e7eb', fontFamily: 'system-ui' }).setOrigin(0.5);
    const d = this.add.text(0, 10, desc, { fontSize: '14px', color: '#cbd5e1', fontFamily: 'system-ui' }).setOrigin(0.5);
    container.add([base, t, d]);
    container.setSize(220, 140);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      beep('ui');
      this.pick(v, base);
    });
    container.on('pointerover', () => container.setScale(1.05));
    container.on('pointerout', () => container.setScale(1));
    if (v === this.selected) base.setStrokeStyle(3, 0xf4c27a);
  }

  private makeButton(x: number, y: number, label: string, cb: () => void) {
    const btn = this.add.text(x, y, label, {
      fontSize: '24px',
      color: '#0f172a',
      backgroundColor: '#fcd34d',
      padding: { x: 18, y: 12 },
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      beep('ui');
      Feel.pop(this, btn);
      cb();
    });
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    return btn;
  }

  private pick(v: Vehicle, base: Phaser.GameObjects.Rectangle) {
    this.selected = v;
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Rectangle && child.width === 220) child.setStrokeStyle(2, 0x38bdf8);
    });
    base.setStrokeStyle(3, 0xf4c27a);
  }

  private startRun() {
    inc('rafiah_runs', 1);
    this.tipIndex = (this.tipIndex + 1) % this.tips.length;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('RunScene', { vehicle: this.selected });
    });
  }

  update(_time: number, dtMs: number) {
    const dt = dtMs / 1000;
    this.dunes?.forEach((d, i) => {
      d.tilePositionX += (i + 1) * 12 * dt;
    });
  }
}
