import Phaser from 'phaser';

export class ToastManager {
  private scene: Phaser.Scene;
  private queue: { text: string; ms: number }[] = [];
  private active = false;
  private box!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width } = scene.scale;
    this.box = scene.add
      .rectangle(width / 2, scene.scale.height - 80, 420, 48, 0x111827, 0.82)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xfcd34d)
      .setDepth(50)
      .setAlpha(0);
    this.label = scene.add
      .text(width / 2, scene.scale.height - 80, '', {
        fontSize: '18px',
        color: '#e5e7eb',
        fontFamily: 'system-ui'
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setAlpha(0);
  }

  show(text: string, ms = 1400) {
    this.queue.push({ text, ms });
    this.tryNext();
  }

  private tryNext() {
    if (this.active || !this.queue.length) return;
    const { text, ms } = this.queue.shift()!;
    this.active = true;
    this.label.setText(text);
    this.scene.tweens.add({
      targets: [this.box, this.label],
      alpha: 1,
      duration: 150,
      onComplete: () => {
        this.scene.time.delayedCall(ms, () => {
          this.scene.tweens.add({
            targets: [this.box, this.label],
            alpha: 0,
            duration: 160,
            onComplete: () => {
              this.active = false;
              this.tryNext();
            }
          });
        });
      }
    });
  }
}
