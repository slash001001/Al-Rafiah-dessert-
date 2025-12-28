import Phaser from 'phaser';

export type HudStats = {
  fuel: number;
  distance: number;
  target: number;
  coins: number;
  timeLeft: number;
};

export class HUD {
  private text: Phaser.GameObjects.Text;
  private banner: Phaser.GameObjects.Text;
  private panel: Phaser.GameObjects.Rectangle;
  private rightPanel: Phaser.GameObjects.Rectangle;
  private rightText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.panel = scene.add.rectangle(14, 14, 300, 120, 0x0b0f1e, 0.65)
      .setOrigin(0)
      .setStrokeStyle(2, 0xf4c95d, 0.6)
      .setScrollFactor(0)
      .setDepth(50);

    this.text = scene.add.text(26, 22, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e9f2ff'
    }).setScrollFactor(0).setDepth(51);

    this.rightPanel = scene.add.rectangle(scene.scale.width - 200, 14, 186, 64, 0x0b0f1e, 0.65)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffd166, 0.6)
      .setScrollFactor(0)
      .setDepth(50);
    this.rightText = scene.add.text(scene.scale.width - 190, 22, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffdf9e'
    }).setScrollFactor(0).setDepth(51);

    this.banner = scene.add.text(scene.scale.width / 2, 20, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffd166'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51);
  }

  update(stats: HudStats) {
    const fuel = Math.max(0, stats.fuel);
    const dist = Math.max(0, stats.distance);
    const t = Math.max(0, stats.timeLeft);
    this.text.setText(
      `Fuel: ${fuel.toFixed(0)}%\nDistance: ${dist.toFixed(0)} / ${stats.target.toFixed(0)} m\nCoins: ${stats.coins}\nNight in: ${t.toFixed(1)}s`
    );
    this.rightText.setText(`ARTPASS_FUN_V1\nPLAY: ◀ / ▶ or touch pedals`);
  }

  showBanner(msg: string) {
    this.banner.setText(msg);
    this.banner.alpha = 1;
    this.scene.tweens.add({ targets: this.banner, alpha: 0.3, yoyo: true, duration: 500, repeat: -1 });
  }
}
