import Phaser from 'phaser';

type VehicleType = 'gmc' | 'prado';

export default class MenuScene extends Phaser.Scene {
  private selected: VehicleType = 'gmc';

  constructor() {
    super('MenuScene');
  }

  create() {
    const overlay = document.getElementById('error-overlay');
    if (overlay) {
      overlay.innerHTML = '';
      (overlay as HTMLDivElement).style.display = 'none';
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0b0f14);
    this.cameras.main.fadeIn(180, 0, 0, 0);

    this.add.text(width / 2, height / 2 - 140, 'الرافعية', {
      fontSize: '52px',
      fontFamily: 'system-ui, sans-serif',
      color: '#f4c27a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 70, 'طلعة بر – اجمع الأغراض قبل تغيب الشمس', {
      fontSize: '18px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e0e7ff'
    }).setOrigin(0.5);

    const btnGmc = this.button(width / 2 - 140, height / 2 + 20, 'GMC (أسود)', () => this.pick('gmc'));
    const btnPrado = this.button(width / 2 + 140, height / 2 + 20, 'Prado (بني)', () => this.pick('prado'));
    const startBtn = this.button(width / 2, height / 2 + 110, 'ابدأ الرحلة', () => this.startRun(), 32);

    this.pick('gmc');

    this.input.keyboard?.on('keydown-ENTER', () => startBtn.emit('pointerdown'));
    this.input.keyboard?.on('keydown-SPACE', () => startBtn.emit('pointerdown'));

    btnGmc.on('pointerdown', () => this.pick('gmc'));
    btnPrado.on('pointerdown', () => this.pick('prado'));
  }

  button(x: number, y: number, text: string, cb: () => void, size = 26) {
    const btn = this.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      backgroundColor: '#2e86ab',
      padding: { x: 14, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', cb);
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    return btn;
  }

  pick(v: VehicleType) {
    this.selected = v;
  }

  startRun() {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('RunScene', { vehicle: this.selected });
    });
  }
}
