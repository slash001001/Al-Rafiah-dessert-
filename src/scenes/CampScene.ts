import Phaser from 'phaser';

interface CampData {
  win: boolean;
  items: string[];
  vehicle: string;
}

export default class CampScene extends Phaser.Scene {
  private win = false;
  private items: string[] = [];
  private vehicle = 'gmc';

  constructor() {
    super('CampScene');
  }

  init(data: CampData) {
    this.win = data?.win ?? false;
    this.items = data?.items ?? [];
    this.vehicle = data?.vehicle ?? 'gmc';
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0b0f14);
    this.cameras.main.fadeIn(180, 0, 0, 0);

    const title = this.add.text(width / 2, height / 2 - 120, this.win ? 'وصلنا المخيم 🔥' : 'غابت الشمس قبل لا نوصل', {
      fontSize: '36px',
      fontFamily: 'system-ui, sans-serif',
      color: this.win ? '#f4c27a' : '#ffaaaa'
    }).setOrigin(0.5);

    const essentials = ['salt', 'water', 'charcoal', 'lighter'];
    const missing = essentials.filter(k => !this.items.includes(k));
    const extras = this.items.filter(k => !essentials.includes(k));

    this.add.text(width / 2, height / 2 - 50, `الأغراض الأساسية: ${essentials.length - missing.length}/${essentials.length}`, {
      fontSize: '20px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e8f1ff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 10, missing.length ? `ناقص: ${missing.join(', ')}` : 'كاملين ما شاء الله', {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#cdd7ff'
    }).setOrigin(0.5);

    const humor = this.randomLine(missing, extras);
    this.add.text(width / 2, height / 2 + 30, humor, {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    const restart = this.add.text(width / 2, height / 2 + 110, '↻ رجوع للقائمة', {
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

  randomLine(missing: string[], extras: string[]) {
    const aliChance = Math.random() < 0.03;
    if (aliChance) return 'علي مشاري يقول: لو سألنا عن الملح كان أحسن 😅';
    if (missing.length === 0) return 'الطبخة نجحت بالصدفة، حتى مع حركاتكم';
    if (missing.length >= 3) return 'المشوي بدون ملح ومويه؟ زعلت الكشته كلها';
    if (missing.includes('salt')) return 'مين طلع بدون ملح؟ السيرك كامل حاضر';
    if (missing.includes('water')) return 'مويه مافي، بس عندنا حماس.';
    if (extras.includes('hummus')) return 'حمص موجود، بس الفحم وينه؟';
    return 'حاولنا نضبطها، النتيجة: قابلين للأكل بالكاد.';
  }
}
