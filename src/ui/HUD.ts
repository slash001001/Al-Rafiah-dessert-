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

  constructor(private scene: Phaser.Scene) {
    this.text = scene.add.text(16, 16, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff'
    }).setScrollFactor(0);

    this.banner = scene.add.text(scene.scale.width / 2, 20, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffd166'
    }).setOrigin(0.5, 0).setScrollFactor(0);
  }

  update(stats: HudStats) {
    const fuel = Math.max(0, stats.fuel);
    const dist = Math.max(0, stats.distance);
    const t = Math.max(0, stats.timeLeft);
    this.text.setText(
      `Fuel: ${fuel.toFixed(0)}%\nDistance: ${dist.toFixed(0)} / ${stats.target.toFixed(0)} m\nCoins: ${stats.coins}\nSunset: ${t.toFixed(1)}s`
    );
  }

  showBanner(msg: string) {
    this.banner.setText(msg);
    this.banner.alpha = 1;
    this.scene.tweens.add({ targets: this.banner, alpha: 0.3, yoyo: true, duration: 500, repeat: -1 });
  }
}
