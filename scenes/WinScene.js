import Phaser from 'phaser';

export class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
    this.result = { score: 0, rank: 'C' };
  }

  init(data) {
    this.result = {
      score: data?.score ?? 0,
      rank: data?.rank ?? 'C'
    };
  }

  create() {
    const { width, height } = this.scale;
    this.scene.stop('UIScene');

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d0d, 0.65);
    this.add.text(width / 2, height / 2 - 140, 'You conquered the dunes!', {
      fontSize: 42,
      fontFamily: 'system-ui, sans-serif',
      color: '#f8f8f8'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 60, `Score: ${this.result.score}`, {
      fontSize: 30,
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Rank: ${this.result.rank}`, {
      fontSize: 28,
      fontFamily: 'system-ui, sans-serif',
      color: '#2e86ab'
    }).setOrigin(0.5);

    const restart = this.createButton(width / 2, height / 2 + 90, 'Restart', () => this.restartRun());
    const toMenu = this.createButton(width / 2, height / 2 + 170, 'Back to Menu', () => this.backToMenu());

    this.tweens.add({
      targets: restart,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      duration: 650,
      repeat: -1
    });

    this.input.keyboard.once('keydown-SPACE', () => this.restartRun());
    this.input.keyboard.once('keydown-ENTER', () => this.restartRun());
  }

  createButton(x, y, label, handler) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 240, 64, 0x2e86ab, 0.95)
      .setStrokeStyle(6, 0x000000, 0.4)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontSize: 26,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);
    bg.on('pointerdown', handler);
    container.add([bg, text]);
    return container;
  }

  restartRun() {
    this.scene.stop('LevelScene');
    this.scene.stop();
    this.scene.launch('LevelScene', { autoStart: true });
    this.scene.launch('UIScene', { autoStart: true });
  }

  backToMenu() {
    this.scene.stop('LevelScene');
    this.scene.start('MenuScene');
  }
}

export default WinScene;
