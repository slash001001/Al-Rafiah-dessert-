import Phaser from 'phaser';
import { setOverlayStatus } from '../ui/overlay';

type Vehicle = 'gmc' | 'prado';

export default class MenuScene extends Phaser.Scene {
  private selected: Vehicle = 'gmc';

  constructor() {
    super('MenuScene');
  }

  create() {
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

    const cards: { x: number; v: Vehicle; label: string; desc: string }[] = [
      { x: width / 2 - 160, v: 'gmc', label: 'جمس أسود', desc: 'ثقيل • ثابت • يحرق بنزين' },
      { x: width / 2 + 160, v: 'prado', label: 'برادو بني', desc: 'خفيف • سريع • ينقلب أسهل' }
    ];

    cards.forEach((card) => this.makeCard(card.x, height / 2, card.v, card.label, card.desc));

    const start = this.makeButton(width / 2, height / 2 + 140, 'ابدأ الرحلة', () => this.startRun());
    this.input.keyboard?.on('keydown-ENTER', () => start.emit('pointerdown'));
    this.input.keyboard?.on('keydown-SPACE', () => start.emit('pointerdown'));
  }

  private makeCard(x: number, y: number, v: Vehicle, title: string, desc: string) {
    const container = this.add.container(x, y);
    const base = this.add.rectangle(0, 0, 220, 140, 0x111827, 0.9).setStrokeStyle(2, 0x38bdf8);
    const t = this.add.text(0, -30, title, { fontSize: '22px', color: '#e5e7eb', fontFamily: 'system-ui' }).setOrigin(0.5);
    const d = this.add.text(0, 10, desc, { fontSize: '14px', color: '#cbd5e1', fontFamily: 'system-ui' }).setOrigin(0.5);
    container.add([base, t, d]);
    container.setSize(220, 140);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => this.pick(v, base));
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
    btn.on('pointerdown', cb);
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
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('RunScene', { vehicle: this.selected });
    });
  }
}
