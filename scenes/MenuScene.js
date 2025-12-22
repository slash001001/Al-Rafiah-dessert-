export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.started = false;
    this.shared = null;
  }

  init() {
    this.shared = window.RAFIAH_SHARED || this.game.registry.get('shared') || {};
  }

  create() {
    const { width, height } = this.scale;

    this.scene.stop('LevelScene');
    this.scene.stop('UIScene');
    this.scene.stop('WinScene');

    this.buildBackdrop(width, height);

    const title = this.add.text(width / 2, height / 2 - 120, 'Rafiah Sand Dunes', {
      fontSize: 48,
      fontFamily: 'system-ui, sans-serif',
      color: '#f8f8f8',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height / 2 - 50, 'Desert run — reach the finish arch', {
      fontSize: 22,
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    const startButton = this.createButton(width / 2, height / 2 + 40, 'Start', () => this.startGame());
    const controls = this.add.text(width / 2, height / 2 + 130, 'Controls: arrows or WASD, Space for brake, Shift for nitro', {
      fontSize: 18,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 780 }
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
    this.tweens.add({
      targets: startButton,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      duration: 750,
      repeat: -1
    });
  }

  buildBackdrop(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, 0x101418).setDepth(-10);
    this.add.tileSprite(0, 0, width * 1.2, height * 1.2, 'sky-gradient').setOrigin(0, 0).setScrollFactor(0).setDepth(-9);
    this.add.tileSprite(0, height * 0.25, width * 1.2, 256, 'mountains-back').setOrigin(0, 0.5).setScrollFactor(0).setDepth(-8);
    this.add.tileSprite(0, height * 0.55, width * 1.2, 256, 'dunes-mid').setOrigin(0, 0.5).setScrollFactor(0).setDepth(-7);
    this.add.tileSprite(0, height * 0.75, width * 1.2, 256, 'foreground-details').setOrigin(0, 0.5).setScrollFactor(0).setDepth(-6);

    const archX = width / 2;
    const archY = height / 2 + 220;
    const arch = this.add.graphics().setDepth(-5);
    arch.lineStyle(14, 0x5e3116, 1);
    arch.strokeRoundedRect(archX - 120, archY - 200, 240, 220, 30);
    arch.fillStyle(0xf4c27a, 0.3);
    arch.fillRoundedRect(archX - 120, archY - 200, 240, 220, 30);
  }

  createButton(x, y, label, handler) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 260, 68, 0x2e86ab, 0.95)
      .setStrokeStyle(6, 0x000000, 0.4)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontSize: 28,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);
    bg.on('pointerdown', handler);
    container.add([bg, text]);
    return container;
  }

  startGame() {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.launch('LevelScene', { autoStart: true });
      this.scene.launch('UIScene', { autoStart: true });
      this.scene.stop();
    });
  }
}

export default MenuScene;
