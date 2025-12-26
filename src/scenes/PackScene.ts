import Phaser from 'phaser';
import { ItemKey } from '../data/items';
import { ensureProceduralArt } from '../visual/Procedural';

interface PackData {
  vehicle: 'gmc' | 'prado';
}

export default class PackScene extends Phaser.Scene {
  private selected: Set<ItemKey> = new Set();
  private timer!: Phaser.GameObjects.Text;
  private timeLeft = 12;
  private slots: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('PackScene');
  }

  init(data: PackData) {
    this.data.set('vehicle', data.vehicle || 'gmc');
  }

  create() {
    ensureProceduralArt(this);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.add.text(width / 2, 40, 'حوسة تجهيز الشنطة', {
      fontSize: '26px',
      color: '#f8fafc',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    this.add.text(width / 2, 70, 'اختطف الأساسيات قبل ما ينتهي الوقت', {
      fontSize: '16px',
      color: '#cbd5e1',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);

    this.timer = this.add.text(width - 40, 20, '12s', {
      fontSize: '20px',
      color: '#fcd34d',
      fontFamily: 'system-ui'
    }).setOrigin(1, 0);

    const items: { key: ItemKey; label: string; tex: string }[] = [
      { key: 'salt', label: 'ملح', tex: 'icon_salt' },
      { key: 'water', label: 'موية', tex: 'icon_water' },
      { key: 'charcoal', label: 'فحم', tex: 'icon_charcoal' },
      { key: 'lighter', label: 'ولاعة', tex: 'icon_lighter' },
      { key: 'hummus', label: 'حمص', tex: 'icon_hummus' }
    ];

    items.forEach((item, idx) => {
      const startX = 140 + idx * 140;
      const startY = 200 + (idx % 2) * 80;
      const img = this.add.image(startX, startY, item.tex).setDepth(2).setScale(1.1);
      const label = this.add.text(startX, startY + 38, item.label, {
        fontSize: '14px',
        color: '#e5e7eb',
        fontFamily: 'system-ui'
      }).setOrigin(0.5);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this.pickItem(item.key));
      this.tweens.add({
        targets: img,
        y: startY + Phaser.Math.Between(-18, 18),
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    const slotsBaseY = height - 140;
    for (let i = 0; i < 4; i++) {
      const slot = this.add.text(width / 2 - 180 + i * 120, slotsBaseY, '[فارغ]', {
        fontSize: '16px',
        color: '#94a3b8',
        backgroundColor: '#111827',
        padding: { x: 12, y: 10 },
        fontFamily: 'system-ui'
      }).setOrigin(0.5).setStroke('#0f172a', 2);
      slot.setInteractive({ useHandCursor: true });
      slot.on('pointerdown', () => this.clearSlot(i));
      this.slots.push(slot);
    }

    const skip = this.add.text(80, height - 60, 'تجاوز (بنطبخ على البركة)', {
      fontSize: '14px',
      color: '#0f172a',
      backgroundColor: '#fcd34d',
      padding: { x: 12, y: 8 },
      fontFamily: 'system-ui'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    skip.on('pointerdown', () => this.finishPack(true));

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft -= 1;
        this.timer.setText(`${this.timeLeft}s`);
        if (this.timeLeft <= 0) {
          this.finishPack();
        }
      }
    });
  }

  private pickItem(key: ItemKey) {
    if (this.selected.size >= 4) return;
    this.selected.add(key);
    const arr = Array.from(this.selected);
    this.slots.forEach((s, idx) => {
      const val = arr[idx];
      s.setText(val ? val : '[فارغ]');
      s.setColor(val ? '#f8fafc' : '#94a3b8');
    });
  }

  private clearSlot(index: number) {
    const arr = Array.from(this.selected);
    if (arr[index]) {
      arr.splice(index, 1);
      this.selected = new Set(arr as ItemKey[]);
      this.slots.forEach((s, idx) => {
        const val = arr[idx];
        s.setText(val ? val : '[فارغ]');
        s.setColor(val ? '#f8fafc' : '#94a3b8');
      });
    }
  }

  private finishPack(skipped = false) {
    this.scene.start('RunScene', { vehicle: this.data.get('vehicle'), collected: Array.from(this.selected), skippedPack: skipped });
  }
}
