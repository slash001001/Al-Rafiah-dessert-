import Phaser from 'phaser';

type PedalState = { throttle: boolean; brake: boolean };

type PointerState = {
  id: number;
  side: 'left' | 'right';
};

export class Pedals {
  private leftZone: Phaser.GameObjects.Rectangle;
  private rightZone: Phaser.GameObjects.Rectangle;
  private pointers: PointerState[] = [];

  constructor(private scene: Phaser.Scene) {
    const size = 160;
    const margin = 24;
    const bottom = scene.scale.height - size / 2 - margin;

    this.leftZone = scene.add.rectangle(size / 2 + margin, bottom, size, size, 0x000000, 0.2)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30)
      .setStrokeStyle(3, 0xf4c95d, 0.7)
      .setInteractive({ draggable: false, useHandCursor: true });

    this.rightZone = scene.add.rectangle(scene.scale.width - size / 2 - margin, bottom, size, size, 0x000000, 0.2)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30)
      .setStrokeStyle(3, 0xf4c95d, 0.7)
      .setInteractive({ draggable: false, useHandCursor: true });

    const makeLabel = (zone: Phaser.GameObjects.Rectangle, text: string) =>
      scene.add.text(zone.x, zone.y, text, { fontFamily: 'monospace', fontSize: '36px', color: '#ffd166' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(31)
        .setInteractive({ useHandCursor: true });

    const leftLabel = makeLabel(this.leftZone, '◀');
    const rightLabel = makeLabel(this.rightZone, '▶');

    const bind = (zone: Phaser.GameObjects.Rectangle, side: 'left' | 'right', label: Phaser.GameObjects.Text) => {
      const onDown = (pointer: Phaser.Input.Pointer) => this.press(side, pointer);
      const onUp = (pointer: Phaser.Input.Pointer) => this.release(pointer);
      zone.on('pointerdown', onDown);
      zone.on('pointerup', onUp);
      zone.on('pointerupoutside', onUp);
      zone.on('pointerout', onUp);
      label.on('pointerdown', onDown);
      label.on('pointerup', onUp);
      label.on('pointerupoutside', onUp);
      label.on('pointerout', onUp);
    };

    bind(this.leftZone, 'left', leftLabel);
    bind(this.rightZone, 'right', rightLabel);
  }

  private press(side: 'left' | 'right', pointer: Phaser.Input.Pointer) {
    if (this.pointers.find((p) => p.id === pointer.id)) return;
    this.pointers.push({ id: pointer.id, side });
    this.setZoneAlpha(side, 0.45);
  }

  private release(pointer: Phaser.Input.Pointer) {
    const before = this.pointers.length;
    this.pointers = this.pointers.filter((p) => p.id !== pointer.id);
    if (before !== this.pointers.length) {
      this.setZoneAlpha('left', this.isActive('left') ? 0.45 : 0.2);
      this.setZoneAlpha('right', this.isActive('right') ? 0.45 : 0.2);
    }
  }

  private setZoneAlpha(side: 'left' | 'right', alpha: number) {
    const zone = side === 'left' ? this.leftZone : this.rightZone;
    zone.setAlpha(alpha);
  }

  private isActive(side: 'left' | 'right') {
    return this.pointers.some((p) => p.side === side);
  }

  getInput(): PedalState {
    return { brake: this.isActive('left'), throttle: this.isActive('right') };
  }
}
