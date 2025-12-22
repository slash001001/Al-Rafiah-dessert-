import Phaser from 'phaser';

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0f1720');

    this.add.text(width / 2, height / 2 - 120, 'Rafiah Sand Dunes', {
      fontSize: 48,
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 60, 'Arrow Keys / WASD to drive', {
      fontSize: 20,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    const startText = this.add.text(width / 2, height / 2 + 20, '▶ Start', {
      fontSize: 32,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startText.on('pointerdown', () => this.startGame());
    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
  }

  startGame() {
    this.scene.start('PlayScene');
  }
}

class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
    this.player = null;
    this.finishZone = null;
    this.cursors = null;
    this.keys = null;
    this.generatedTextures = false;
  }

  preload() {
    if (this.generatedTextures) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x2e86ab, 1);
    g.fillRect(0, 0, 40, 60);
    g.generateTexture('player-box', 40, 60);
    g.clear();
    g.fillStyle(0xf4c27a, 1);
    g.fillRect(0, 0, 80, 140);
    g.generateTexture('finish-flag', 80, 140);
    g.destroy();
    this.generatedTextures = true;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f5e6c5');
    this.physics.world.setBounds(0, 0, 2200, height);

    // Simple rolling dunes made of static bodies
    const ground = this.physics.add.staticGroup();
    const segments = 7;
    for (let i = 0; i < segments; i += 1) {
      const segmentWidth = 360;
      const x = i * segmentWidth + segmentWidth / 2;
      const bump = (i % 2 === 0 ? 0 : 40) + (i === 3 ? 70 : 0);
      const y = height - 80 - bump;
      const rect = this.add.rectangle(x, y, segmentWidth, 80, 0xd2a363).setOrigin(0.5);
      ground.add(rect);
      this.physics.add.existing(rect, true);
    }

    this.player = this.physics.add.sprite(120, height - 200, 'player-box');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(40, 60);
    this.player.body.setMaxVelocity(320, 900);
    this.player.body.setDragX(600);
    this.player.body.setBounce(0.05);

    this.finishZone = this.physics.add.staticSprite(1900, height - 220, 'finish-flag');
    this.finishZone.setAlpha(0.9);
    this.finishZone.body.setSize(80, 140);

    this.physics.add.collider(this.player, ground);
    this.physics.add.overlap(this.player, this.finishZone, () => this.handleFinish(), undefined, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 2200, height);

    this.add.text(24, 18, 'Reach the flag!', {
      fontSize: 20,
      fontFamily: 'system-ui, sans-serif',
      color: '#0f1720',
      backgroundColor: 'rgba(255,255,255,0.6)',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0);
  }

  update() {
    if (!this.player || !this.player.body) return;
    const onGround = this.player.body.blocked.down;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const jump = this.cursors.up.isDown || this.keys.W.isDown;

    if (left) {
      this.player.setAccelerationX(-900);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setAccelerationX(900);
      this.player.setFlipX(false);
    } else {
      this.player.setAccelerationX(0);
    }

    if (jump && onGround) {
      this.player.setVelocityY(-420);
    }
  }

  handleFinish() {
    this.scene.start('WinScene');
  }
}

class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d1821');
    this.add.text(width / 2, height / 2 - 60, 'You Win!', {
      fontSize: 48,
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    const restart = this.add.text(width / 2, height / 2 + 30, '↻ Restart', {
      fontSize: 32,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restart.on('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('MenuScene'));
  }
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#0f1720',
  parent: document.body,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 980 },
      debug: false
    }
  },
  scene: [MenuScene, PlayScene, WinScene]
};

new Phaser.Game(config);
