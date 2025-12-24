import Phaser from 'phaser';
import { ItemKey, essentials, getMissingEssentials } from '../data/items';
import { pickJoke, pickRare } from '../systems/JokeEngine';
import { mulberry32, hashStringToSeed } from '../systems/rng';
import { inc, getNumber, setNumber } from '../systems/persist';
import { beep } from '../ui/Sfx';

interface CampData {
  result: 'win' | 'fail';
  collected: ItemKey[];
  vehicle: 'gmc' | 'prado';
  reason: string;
  timeUsedSeconds: number;
  eventsTriggered: string[];
  funniestKey?: string | null;
}

export default class CampScene extends Phaser.Scene {
  constructor() {
    super('CampScene');
  }

  create(data: CampData) {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const rng = mulberry32(hashStringToSeed(`${Date.now()}-${Math.random()}`));

    const panel = this.add.rectangle(width / 2, height / 2, width * 0.78, height * 0.76, 0x111827, 0.9)
      .setStrokeStyle(2, data.result === 'win' ? 0x4ade80 : 0xf87171);

    const title = data.result === 'win' ? 'وصلنا قبل الغروب ✅' : 'غابت الشمس قبل لا نوصل 🌅💀';
    this.add.text(width / 2, height / 2 - 180, title, {
      fontSize: '26px',
      color: data.result === 'win' ? '#86efac' : '#fca5a5',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);

    const collectedSet = new Set<ItemKey>(data.collected || []);
    const missing = getMissingEssentials(collectedSet);

    const funniest = data.funniestKey || (data.eventsTriggered && data.eventsTriggered[0]) || 'plan_failed_generic';
    const funniestLine = pickJoke(rng, `event_${funniest}`, 'الخطة فشلت بس انبسطنا');
    const planLine = pickJoke(rng, 'plan_failed_generic', 'التخطيط صفر والمتعة عشرة');
    const aliLine = pickRare(rng, 0.03) ? pickJoke(rng, 'ali_mishari_rare', '') : '';

    const forgotLine = this.missingLines(missing);
    const outcome = this.cookOutcome(rng, collectedSet, missing);

    const recapLines = [
      `وش نسيت؟ ${forgotLine}`,
      `أغرب شي صار: ${funniestLine}`,
      `التخطيط: ${essentials.length - missing.length}/4`
    ];
    recapLines.push(planLine);
    if (aliLine) recapLines.push(aliLine);
    recapLines.push(outcome);

    this.add.text(width / 2, height / 2 - 110, recapLines.join('\n'), {
      fontSize: '18px',
      color: '#e5e7eb',
      fontFamily: 'system-ui',
      align: 'center',
      wordWrap: { width: width * 0.7 }
    }).setOrigin(0.5, 0);

    this.renderBadges(width, height, missing, data.eventsTriggered);

    const restart = this.makeButton(width / 2, height / 2 + 150, 'طلعنا مرة ثانية', () => this.backMenu());
    const rerun = this.makeButton(width / 2, height / 2 + 200, 'إعادة نفس الجولة', () => this.restartRun(data.vehicle));

    panel.setDepth(1);
    restart.setDepth(2);
    rerun.setDepth(2);
  }

  private renderBadges(width: number, height: number, missing: ItemKey[], events: string[]) {
    const badges: string[] = [];
    if (missing.includes('salt')) badges.push('نسيت الملح');
    if (events.filter((e) => e === 'stuck').length >= 2) badges.push('ملك الغرز');
    if (events.includes('helicopter')) badges.push('افتتاح الموسم');
    badges.forEach((b, i) => {
      this.add.text(width / 2 - 120 + i * 120, height / 2 + 70, `🏅 ${b}`, {
        fontSize: '16px',
        color: '#fcd34d',
        fontFamily: 'system-ui'
      }).setOrigin(0.5);
    });
  }

  private missingLines(missing: ItemKey[]) {
    if (!missing.length) return 'ما نسينا شي (معجزة)';
    return missing.join(', ');
  }

  private cookOutcome(rng: () => number, collected: Set<ItemKey>, missing: ItemKey[]) {
    let chance = 0.2;
    if (collected.has('salt')) chance += 0.25;
    if (collected.has('charcoal')) chance += 0.2;
    if (collected.has('lighter')) chance += 0.2;
    if (collected.has('water')) chance += 0.15;
    chance += 0.1;
    chance = Math.min(0.95, chance);
    const success = rng() < chance;
    if (!collected.has('salt')) return pickJoke(rng, 'forgot_salt', 'بدون ملح؟ الطبخة راحت');
    return success ? pickJoke(rng, 'cooking_success', 'الطبخة: ضبطت') : pickJoke(rng, 'cooking_fail', 'الطبخة خربت');
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
    btn.on('pointerdown', () => {
      beep('ui');
      cb();
    });
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
