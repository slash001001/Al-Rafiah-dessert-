import Phaser from 'phaser';
import { formatTimeMMSS } from '../utils/format';

export type ShareSummary = {
  result: 'win' | 'fail';
  vehicle: 'gmc' | 'prado';
  timeUsedSec: number;
  missingEssentials: { key: string; label: string; iconKey: string }[];
  funniestLine: string;
  badges: string[];
  url: string;
};

export class ShareCard {
  private scene: Phaser.Scene;
  private summary: ShareSummary;
  private container?: Phaser.GameObjects.Container;
  private bounds = { x: 0, y: 0, w: 820, h: 460 };

  constructor(scene: Phaser.Scene, summary: ShareSummary) {
    this.scene = scene;
    this.summary = summary;
  }

  show() {
    if (this.container) {
      this.container.setVisible(true);
      return;
    }
    const { width, height } = this.scene.scale;
    const { w, h } = this.bounds;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    this.bounds = { x, y, w, h };

    const c = this.scene.add.container(x, y).setDepth(20);
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x0f172a, 0.92).setOrigin(0).setStrokeStyle(3, 0xfcd34d);
    const title = this.scene.add.text(24, 20, 'طلعة الرافعية', {
      fontSize: '26px',
      color: '#f8fafc',
      fontFamily: 'system-ui'
    });
    const stampText = this.summary.result === 'win' ? '✅ ضبطت' : '🌅 راحت علينا';
    const stamp = this.scene.add.text(w - 24, 26, stampText, {
      fontSize: '24px',
      color: this.summary.result === 'win' ? '#4ade80' : '#fca5a5',
      fontFamily: 'system-ui'
    }).setOrigin(1, 0);
    stamp.setScale(0.1);
    this.scene.tweens.add({ targets: stamp, scale: 1, duration: 180, ease: 'Back.Out' });

    const veh = this.summary.vehicle === 'gmc' ? 'الجمس' : 'البرادو';
    const lines = [
      `السيارة: ${veh}`,
      `الوقت: ${formatTimeMMSS(this.summary.timeUsedSec)}`
    ];
    const info = this.scene.add.text(24, 70, lines.join('\n'), {
      fontSize: '18px',
      color: '#e5e7eb',
      fontFamily: 'system-ui'
    });

    const missLabel = this.scene.add.text(24, 130, 'الناقص:', {
      fontSize: '16px',
      color: '#cbd5e1',
      fontFamily: 'system-ui'
    });

    const missGroup: Phaser.GameObjects.GameObject[] = [];
    if (this.summary.missingEssentials.length === 0) {
      missGroup.push(
        this.scene.add.text(110, 130, 'ولا شي… نادر!', {
          fontSize: '16px',
          color: '#4ade80',
          fontFamily: 'system-ui'
        })
      );
    } else {
      this.summary.missingEssentials.forEach((m, idx) => {
        const icon = this.scene.add.image(110 + idx * 120, 150, m.iconKey).setScale(0.6).setOrigin(0, 0.5);
        const label = this.scene.add.text(140 + idx * 120, 150, m.label, {
          fontSize: '16px',
          color: '#e5e7eb',
          fontFamily: 'system-ui'
        }).setOrigin(0, 0.5);
        missGroup.push(icon, label);
      });
    }

    const funny = this.scene.add.text(24, 200, `أطرف لقطة: ${this.summary.funniestLine}`, {
      fontSize: '16px',
      color: '#fcd34d',
      fontFamily: 'system-ui',
      wordWrap: { width: w - 48 }
    });

    const badgeLabel = this.scene.add.text(24, 260, 'أوسمة الجولة:', {
      fontSize: '16px',
      color: '#cbd5e1',
      fontFamily: 'system-ui'
    });
    const badgeObjs: Phaser.GameObjects.GameObject[] = [];
    this.summary.badges.slice(0, 3).forEach((b, idx) => {
      const chip = this.scene.add.text(160 + idx * 150, 262, b, {
        fontSize: '14px',
        color: '#0f172a',
        backgroundColor: '#fcd34d',
        padding: { x: 10, y: 6 },
        fontFamily: 'system-ui'
      }).setOrigin(0, 0.5);
      badgeObjs.push(chip);
    });

    const footer = this.scene.add.text(24, h - 30, this.summary.url, {
      fontSize: '14px',
      color: '#94a3b8',
      fontFamily: 'ui-monospace'
    });

    c.add([bg, title, stamp, info, missLabel, ...missGroup, funny, badgeLabel, ...badgeObjs, footer]);
    this.container = c;
  }

  hide() {
    this.container?.setVisible(false);
  }

  getRect() {
    return { ...this.bounds };
  }

  async downloadPng(filename: string) {
    return new Promise<void>((resolve, reject) => {
      const { x, y, w, h } = this.bounds;
      this.scene.game.renderer.snapshotArea(x, y, w, h, (snapshot: any) => {
        try {
          const image = snapshot as HTMLImageElement;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no canvas ctx');
          ctx.drawImage(image, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (!blob) throw new Error('no blob');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async copyLink() {
    const text = this.summary.url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  async nativeShare() {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'طلعة الرافعية',
          text: `${this.summary.funniestLine}\n${this.summary.url}`,
          url: this.summary.url
        });
        return;
      } catch (err) {
        // fallback to copy
      }
    }
    await this.copyLink();
  }
}
