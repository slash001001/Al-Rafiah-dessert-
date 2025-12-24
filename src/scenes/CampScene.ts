import Phaser from 'phaser';
import { ItemKey, getMissingEssentials } from '../data/items';

interface CampData {
  result: 'win' | 'fail';
  collected: ItemKey[];
  vehicle: string;
  reason: string;
  timeSpent: number;
}

export default class CampScene extends Phaser.Scene {
  constructor() {
    super('CampScene');
  }

  create(data: CampData) {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);

    const panel = this.add.rectangle(width / 2, height / 2, width * 0.7, height * 0.7, 0x111827, 0.9)
      .setStrokeStyle(2, data.result === 'win' ? 0x4ade80 : 0xf87171);

    const title = data.result === 'win' ? 'وصلنا قبل الغروب ✅' : 'غابت الشمس قبل لا نوصل 🌅💀';
    this.add.text(width / 2, height / 2 - 150, title, {
      fontSize: '26px',
      color: data.result === 'win' ? '#86efac' : '#fca5a5',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);

    const collectedSet = new Set<ItemKey>(data.collected || []);
    const missing = getMissingEssentials(collectedSet);
    const recap: string[] = [];
    recap.push(`السيارة: ${data.vehicle === 'gmc' ? 'جمس أسود' : 'برادو بني'}`);
    recap.push(`الوقت: ${data.timeSpent.toFixed(1)} ثانية`);
    recap.push(`الأغراض: ${data.collected.length ? data.collected.map((k) => k).join(', ') : 'ولا شي'}`);
    recap.push(`ناقص: ${missing.length ? missing.join(', ') : 'ولا حاجة'}`);

    recap.push(this.cookOutcome(collectedSet, missing));

    const recapText = this.add.text(width / 2, height / 2 - 80, recap.join('\n'), {
      fontSize: '18px',
      color: '#e5e7eb',
      fontFamily: 'system-ui',
      align: 'center',
      wordWrap: { width: width * 0.6 }
    }).setOrigin(0.5, 0);

    const restart = this.makeButton(width / 2, height / 2 + 120, 'رجعنا للمنيو', () => this.backMenu());
    const rerun = this.makeButton(width / 2, height / 2 + 170, 'إعادة الجولة', () => this.restartRun(data.vehicle));

    panel.setDepth(1);
    recapText.setDepth(2);
    restart.setDepth(2);
    rerun.setDepth(2);
  }

  private cookOutcome(collected: Set<ItemKey>, missing: ItemKey[]) {
    let chance = 0.2;
    if (collected.has('salt')) chance += 0.25;
    if (collected.has('charcoal')) chance += 0.2;
    if (collected.has('lighter')) chance += 0.2;
    if (collected.has('water')) chance += 0.15;
    chance += 0.1; // الصدفة
    chance = Math.min(0.95, chance);
    const roll = Math.random();
    const success = roll < chance;
    if (!collected.has('salt')) return 'بدون ملح؟ الطبخة صارت سويت… 🤦‍♂️';
    return success ? 'الطبخة: ضبطت صدفة 🔥' : 'الطبخة: خربت… طبيعي 🤝';
  }

  private makeButton(x: number, y: number, label: string, cb: () => void) {
    const btn = this.add.text(x, y, label, {
      fontSize: '20px',
      color: '#0f172a',
      backgroundColor: '#fcd34d',
      padding: { x: 16, y: 10 },
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', cb);
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    return btn;
  }

  private backMenu() {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MenuScene');
    });
  }

  private restartRun(vehicle: string) {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('RunScene', { vehicle });
    });
  }
}
