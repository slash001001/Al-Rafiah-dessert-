import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.createBackground();

    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 80, 'Hill-Climb Rally', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#fefefe'
    }).setOrigin(0.5);

    const subtitle = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Powered by Phaser 3 + Matter (yandeu ref)', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#a0c7ff'
    }).setOrigin(0.5);

    const hint = this.add.text(this.scale.width / 2, this.scale.height / 2 + 80, 'Press SPACE / click to start', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffd166'
    }).setOrigin(0.5);

    this.tweens.add({ targets: hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 900 });

    const startGame = () => this.scene.start('HillClimbScene');
    this.input.keyboard?.once('keydown-SPACE', startGame);
    this.input.on('pointerdown', startGame);
  }

  private createBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x102040, 0x13244d, 0xf7b733, 0xf79d65, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
  }
}
