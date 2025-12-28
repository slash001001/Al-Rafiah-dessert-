import Phaser from 'phaser';

type CampData = {
  result: 'win' | 'fail';
  distance: number;
  coins: number;
  fuel: number;
};

export class CampScene extends Phaser.Scene {
  constructor() {
    super('CampScene');
  }

  create(data: CampData) {
    this.cameras.main.setBackgroundColor('#0c1024');
    const resultText = data.result === 'win' ? 'VICTORY! Reached the ridge.' : 'Night fell. Try again!';

    this.add.text(this.scale.width / 2, this.scale.height / 2 - 60, resultText, {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#ffd166'
    }).setOrigin(0.5);

    const stats = `Distance: ${data.distance.toFixed(0)} m\nCoins: ${data.coins}\nFuel left: ${data.fuel.toFixed(0)}%`;
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 10, stats, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#a0c7ff',
      align: 'center'
    }).setOrigin(0.5);

    const hint = this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, 'Press SPACE / click to restart', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });

    const restart = () => this.scene.start('HillClimbScene');
    this.input.keyboard?.once('keydown-SPACE', restart);
    this.input.on('pointerdown', restart);
  }
}
