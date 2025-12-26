import Phaser from 'phaser';
import { ItemKey, essentials, getMissingEssentials } from '../data/items';
import { JokeEngine } from '../systems/JokeEngine';
import { mulberry32, hashStringToSeed } from '../systems/rng';
import { inc, getNumber, setNumber } from '../systems/persist';
import { beep } from '../ui/Sfx';
import { ShareCard, ShareSummary } from '../ui/ShareCard';
import { ensureProceduralArt } from '../visual/Procedural';
import { ArtKeys } from '../visual/ArtKeys';

interface CampData {
  result: 'win' | 'fail';
  collected: ItemKey[];
  vehicle: 'gmc' | 'prado';
  reason: string;
  timeUsedSeconds: number;
  eventsTriggered: string[];
  funniestKey?: string | null;
  funnies?: string[];
  route?: 'safe' | 'risky';
}

export default class CampScene extends Phaser.Scene {
  private dunes: Phaser.GameObjects.TileSprite[] = [];
  private shareCard?: ShareCard;

  constructor() {
    super('CampScene');
  }

  create(data: CampData) {
    ensureProceduralArt(this);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f14');
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const sky = this.add.tileSprite(width / 2, height / 2, width, height, ArtKeys.BG_SKY).setScrollFactor(0);
    const l3 = this.add.tileSprite(width / 2, height / 2 + 50, width, height, ArtKeys.DUNE_FAR).setScrollFactor(0);
    const l2 = this.add.tileSprite(width / 2, height / 2 + 25, width, height, ArtKeys.DUNE_MID).setScrollFactor(0);
    const l1 = this.add.tileSprite(width / 2, height / 2, width, height, ArtKeys.DUNE_NEAR).setScrollFactor(0);
    l3.setTileScale(1.2, 1.8);
    l2.setTileScale(1.15, 1.75);
    l1.setTileScale(1.1, 1.7);
    this.dunes = [l3, l2, l1];
    const dusk = this.add.rectangle(0, 0, width, height, 0xf97316, 0.2).setOrigin(0).setScrollFactor(0);

    const seed = hashStringToSeed(`${Date.now()}-${Math.random()}`);
    const rng = mulberry32(seed);
    const jokes = new JokeEngine(seed);
    jokes.setContext({ veh: data.vehicle, place: 'الرافعية', timeLeftSec: Math.max(0, 300 - data.timeUsedSeconds) });

    const panel = this.add.rectangle(width / 2, height / 2, width * 0.78, height * 0.76, 0x111827, 0.9)
      .setStrokeStyle(2, data.result === 'win' ? 0x4ade80 : 0xf87171);

    const title = data.result === 'win' ? 'وصلنا قبل الغروب ✅' : 'غابت الشمس قبل لا نوصل 🌅💀';
    const header = this.add.text(width / 2, height / 2 - 180, title, {
      fontSize: '26px',
      color: data.result === 'win' ? '#86efac' : '#fca5a5',
      fontFamily: 'system-ui'
    }).setOrigin(0.5);
    this.stamp(header, data.result === 'win' ? '✅ ضبطت' : '🌅 راحت علينا');

    const collectedSet = new Set<ItemKey>(data.collected || []);
    const missing = getMissingEssentials(collectedSet);

    const funniest = data.funniestKey || (data.eventsTriggered && data.eventsTriggered[0]) || 'plan_failed_generic';
    const funniestLine = data.funnies && data.funnies.length ? data.funnies[data.funnies.length - 1] : jokes.pick(`event_${funniest}`, 2, 'الخطة فشلت بس انبسطنا');
    const planLine = jokes.pick('plan_failed_generic', data.result === 'win' ? 1 : 2, 'التخطيط صفر والمتعة عشرة');
    const aliLine = jokes.pickRare(0.03) ? jokes.pick('ali_mishari_rare', 1, '') : '';
    const routeLine = data.route === 'risky' ? 'المسار: الاختصار الخطير' : 'المسار: الطريق الآمن';

    const forgotLine = this.missingLines(missing);
    const outcome = this.cookOutcome(jokes, collectedSet, missing);

    const recapLines = [
      `وش نسيت؟ ${forgotLine}`,
      `أغرب شي صار: ${funniestLine}`,
      `التخطيط: ${essentials.length - missing.length}/4`,
      routeLine
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

    const badges = this.computeBadges(missing, data.eventsTriggered || []);

    const summary: ShareSummary = {
      result: data.result,
      vehicle: data.vehicle,
      timeUsedSec: data.timeUsedSeconds,
      missingEssentials: missing.map((m) => ({ key: m, label: this.labelFor(m), iconKey: this.iconKeyFor(m) })),
      funniestLine,
      badges,
      url: 'https://slash001001.github.io/Al-Rafiah-dessert-/'
    };
    this.shareCard = new ShareCard(this, summary);
    this.shareCard.show();

    const ctas = ['طلعنا مرة ثانية', 'أعد… يمكن تضبط', 'خلاص آخر مرة (كذب)'];
    const restart = this.makeButton(width / 2, height / 2 + 150, ctas[0], () => this.backMenu());
    const rerun = this.makeButton(width / 2, height / 2 + 210, ctas[1], () => this.restartRun(data.vehicle));
    const saveBtn = this.makeButton(width / 2 - 200, height - 60, 'احفظ كرت الطلعة', async () => {
      try {
        await this.shareCard?.downloadPng('rafiah_postcard.png');
        this.showToast('تم حفظ الكرت ✅');
      } catch (err) {
        this.showToast('ما قدرنا نحفظ الكرت');
      }
    });
    const copyBtn = this.makeButton(width / 2, height - 60, 'انسخ الرابط', async () => {
      await this.shareCard?.copyLink();
      this.showToast('تم نسخ الرابط 🔗');
    });
    const shareSupported = typeof (navigator as any).share === 'function';
    const shareBtn = shareSupported
      ? this.makeButton(width / 2 + 200, height - 60, 'مشاركة', async () => {
          try {
            await this.shareCard?.nativeShare();
            this.showToast('شاركنا الرابط ✅');
          } catch (err) {
            await this.shareCard?.copyLink();
            this.showToast('شاركنا بالرابط المنسوخ');
          }
        })
      : null;

    this.drawCampfire(width / 2 - 230, height / 2 + 110);

    panel.setDepth(1);
    restart.setDepth(2);
    rerun.setDepth(2);
    saveBtn.setDepth(2);
    copyBtn.setDepth(2);
    shareBtn?.setDepth(2);
  }

  private renderBadges(width: number, height: number, missing: ItemKey[], events: string[]) {
    const badges = this.computeBadges(missing, events);
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

  private computeBadges(missing: ItemKey[], events: string[]) {
    const badges: string[] = [];
    if (missing.includes('salt')) badges.push('نسيت الملح');
    if (events.filter((e) => e === 'stuck').length >= 2) badges.push('ملك الغرز');
    if (events.includes('helicopter')) badges.push('افتتاح الموسم');
    return badges;
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

  private stamp(target: Phaser.GameObjects.Text, label: string) {
    const s = this.add.text(target.x, target.y - 50, label, {
      fontSize: '24px',
      color: '#fcd34d',
      fontFamily: 'system-ui',
      backgroundColor: '#1f2937',
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5);
    s.setScale(0.1);
    this.tweens.add({ targets: s, scale: 1, duration: 180, ease: 'Back.Out' });
  }

  private makeButton(x: number, y: number, label: string, cb: () => void) {
    const btn = this.add.text(x, y, label, {
      fontSize: '22px',
      color: '#0f172a',
      backgroundColor: '#fcd34d',
      padding: { x: 20, y: 14 },
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

  private drawCampfire(x: number, y: number) {
    const key = 'campfire_tmp';
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      g.fillStyle(0x92400e);
      g.fillRect(8, 26, 36, 8);
      g.fillRect(0, 30, 36, 8);
      g.fillStyle(0xf97316);
      g.fillTriangle(28, 30, 18, 0, 8, 30);
      g.fillTriangle(36, 30, 26, 6, 16, 30);
      g.fillTriangle(44, 30, 34, 4, 24, 30);
      g.generateTexture(key, 52, 40);
      g.destroy();
    }
    this.add.image(x, y, key).setDepth(3);
  }

  private labelFor(key: ItemKey) {
    switch (key) {
      case 'salt':
        return 'ملح';
      case 'water':
        return 'موية';
      case 'charcoal':
        return 'فحم';
      case 'lighter':
        return 'ولاعة';
      case 'hummus':
        return 'حمص';
    }
  }

  private iconKeyFor(key: ItemKey) {
    switch (key) {
      case 'salt':
        return 'icon_salt';
      case 'water':
        return 'icon_water';
      case 'charcoal':
        return 'icon_charcoal';
      case 'lighter':
        return 'icon_lighter';
      case 'hummus':
        return 'icon_hummus';
    }
  }

  private showToast(msg: string) {
    const t = this.add.text(this.scale.width / 2, this.scale.height - 30, msg, {
      fontSize: '16px',
      color: '#0f172a',
      backgroundColor: '#fcd34d',
      padding: { x: 12, y: 8 },
      fontFamily: 'system-ui'
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, alpha: 0, duration: 1200, delay: 600, onComplete: () => t.destroy() });
  }

  update(_t: number, dtMs: number) {
    const dt = dtMs / 1000;
    this.dunes?.forEach((d, i) => {
      d.tilePositionX += (i + 1) * 8 * dt;
    });
  }
}
