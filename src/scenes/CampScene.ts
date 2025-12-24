import Phaser from 'phaser';
import { ItemKey, essentials, getMissingEssentials } from '../data/items';
import { JokeEngine } from '../systems/JokeEngine';
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
  funnies?: string[];
}

export default class CampScene extends Phaser.Scene {
  constructor() {
    super('CampScene');
  }

  create(data: CampData) {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const seed = hashStringToSeed(`${Date.now()}-${Math.random()}`);
    const rng = mulberry32(seed);
    const jokes = new JokeEngine(seed);
    jokes.setContext({ veh: data.vehicle, place: 'الرافعية', timeLeftSec: Math.max(0, 300 - data.timeUsedSeconds) });

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
    const funniestLine = data.funnies && data.funnies.length ? data.funnies[data.funnies.length - 1] : jokes.pick(`event_${funniest}`, 2, 'الخطة فشلت بس انبسطنا');
    const planLine = jokes.pick('plan_failed_generic', data.result === 'win' ? 1 : 2, 'التخطيط صفر والمتعة عشرة');
    const aliLine = jokes.pickRare(0.03) ? jokes.pick('ali_mishari_rare', 1, '') : '';

    const forgotLine = this.missingLines(missing);
    const outcome = this.cookOutcome(jokes, collectedSet, missing);

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

    const ctas = ['طلعنا مرة ثانية', 'أعد… يمكن تضبط', 'خلاص آخر مرة (كذب)'];
    const restart = this.makeButton(width / 2, height / 2 + 150, ctas[0], () => this.backMenu());
    const rerun = this.makeButton(width / 2, height / 2 + 200, ctas[1], () => this.restartRun(data.vehicle));

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

  private cookOutcome(jokes: JokeEngine, collected: Set<ItemKey>, missing: ItemKey[]) {
    let chance = 0.2;
    if (collected.has('salt')) chance += 0.25;
    if (collected.has('charcoal')) chance += 0.2;
    if (collected.has('lighter')) chance += 0.2;
    if (collected.has('water')) chance += 0.15;
    chance += 0.1;
    chance = Math.min(0.95, chance);
    const success = jokes.pickRare(chance);
    if (!collected.has('salt')) return jokes.pick('forgot_salt', 3, 'بدون ملح؟ الطبخة راحت');
    return success ? jokes.pick('cooking_success', 2, 'الطبخة: ضبطت') : jokes.pick('cooking_fail', 2, 'الطبخة خربت');
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
