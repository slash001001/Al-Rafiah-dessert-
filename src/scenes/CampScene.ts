import Phaser from 'phaser';

interface CampData {
  success: boolean;
  items: string[];
  timeSpent: number;
  vehicle: string;
  log: string[];
  reason: string;
}

export default class CampScene extends Phaser.Scene {
  constructor() {
    super('CampScene');
  }

  create(data: CampData) {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(220, 0, 0, 0);

    const overlay = this.add.rectangle(width / 2, height / 2, width * 0.7, height * 0.7, 0x111827, 0.9)
      .setStrokeStyle(2, 0xfcd34d);
    overlay.setScrollFactor(0);

    const heading = data.success ? 'وصلنا القعدة 👏' : 'غابت الشمس قبل ما نوصل';
    this.add.text(width / 2, height / 2 - 120, heading, {
      fontSize: '28px',
      color: data.success ? '#86efac' : '#fca5a5',
      fontFamily: 'system-ui, sans-serif'
    }).setOrigin(0.5);

    const missing = this.missingItems(data.items);
    const recapLines: string[] = [
      `السيارة: ${data.vehicle === 'gmc' ? 'جمس أسود' : 'برادو بني'}`,
      `الوقت: ${data.timeSpent.toFixed(1)} ثانية`,
      `الأغراض: ${data.items.length ? data.items.join(', ') : 'نسينا كل شي تقريبًا'}`
    ];
    if (missing.length) {
      recapLines.push(`نسينا: ${missing.join(', ')}`);
    } else {
      recapLines.push('معانا كل الأساسيات (معجزة!)');
    }

    const aliRoll = Phaser.Math.Between(1, 100);
    if (aliRoll <= 4) {
      recapLines.push('إيستر إيج: علي مشاري طقها ضحك وقال وين السالفة؟');
    }

    const cookScore = this.cookScore(data.success, missing);
    recapLines.push(cookScore);
    if (data.reason) recapLines.push(`ملاحظة: ${data.reason}`);
    if (data.log?.length) {
      recapLines.push('');
      recapLines.push('سوالف الطريق:');
      recapLines.push(...data.log.slice(-5));
    }

    const recap = this.add.text(width / 2, height / 2 - 60, recapLines.join('\n'), {
      fontSize: '16px',
      color: '#e5e7eb',
      fontFamily: 'system-ui, sans-serif',
      align: 'center',
      wordWrap: { width: width * 0.64 }
    }).setOrigin(0.5, 0);

    const restart = this.add.text(width / 2, height - 110, 'رجعني للمنيو', {
      fontSize: '22px',
      color: '#0f172a',
      backgroundColor: '#fcd34d',
      padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restart.on('pointerdown', () => this.back());
    this.input.keyboard?.once('keydown-SPACE', () => this.back());
    this.input.keyboard?.once('keydown-ENTER', () => this.back());
  }

  private missingItems(items: string[]) {
    const required = ['salt', 'water', 'charcoal', 'lighter'];
    return required.filter((i) => !items.includes(i));
  }

  private cookScore(success: boolean, missing: string[]) {
    if (success && missing.length <= 1) return 'الطبخة ضبطت صدفة (وكلن مبسوط)';
    if (missing.includes('salt')) return 'بدون ملح؟ الطبخة صارت سويت — فضيحة موسمية';
    if (missing.length >= 3) return 'نسينا كل شي، طبخنا هوا وضحكنا وخلص';
    return success ? 'أديناها نيشان، لكن الطعم يبغى له شغل' : 'فشلنا في الوقت، لكن القعدة حلوة';
  }

  private back() {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MenuScene');
    });
  }
}
