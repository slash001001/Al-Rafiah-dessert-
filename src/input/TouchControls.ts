import Phaser from 'phaser';
import { InputState } from './InputState';

interface Btn {
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  key: keyof InputState;
  pointerId: number | null;
  w: number;
  h: number;
}

export class TouchControls {
  private scene: Phaser.Scene;
  private buttons: Btn[] = [];
  private visible = false;
  private shownOnce = false;
  private forceShow: boolean;

  constructor(scene: Phaser.Scene, opts?: { forceShow?: boolean }) {
    this.scene = scene;
    this.forceShow = !!opts?.forceShow;
    this.build();
    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.visible) this.setVisible(true);
    });
  }

  private build() {
    const { width, height } = this.scene.scale;
    const baseAlpha = 0.35;
    const stroke = 0xfcd34d;
    const font = { fontSize: '18px', color: '#f8fafc', fontFamily: 'system-ui' };

    const makeBtn = (x: number, y: number, w: number, h: number, text: string, key: keyof InputState) => {
      const rect = this.scene.add.rectangle(x, y, w, h, 0x0f172a, baseAlpha).setScrollFactor(0).setDepth(1000).setStrokeStyle(2, stroke);
      const label = this.scene.add.text(x, y, text, font).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
      const btn: Btn = { rect, label, key, pointerId: null, w, h };
      rect.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => this.press(btn, p));
      rect.on('pointerup', (p: Phaser.Input.Pointer) => this.release(btn, p));
      rect.on('pointerout', (p: Phaser.Input.Pointer) => this.release(btn, p));
      rect.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.release(btn, p));
      rect.on('pointercancel', (p: Phaser.Input.Pointer) => this.release(btn, p));
      this.buttons.push(btn);
    };

    const leftX = 90;
    const rightX = 190;
    const bottomY = height - 80;
    makeBtn(leftX, bottomY, 90, 90, '◀', 'left');
    makeBtn(rightX, bottomY, 90, 90, '▶', 'right');

    const accelX = width - 100;
    const accelY = height - 90;
    makeBtn(accelX, accelY, 110, 110, '▲', 'accel');
    makeBtn(accelX - 120, accelY - 40, 80, 60, '▼', 'brake');
    makeBtn(accelX - 40, accelY - 140, 90, 60, 'NITRO', 'nitro');
    makeBtn(accelX - 180, accelY - 140, 90, 60, 'زمور', 'honk');
  }

  private press(btn: Btn, p: Phaser.Input.Pointer) {
    btn.pointerId = p.id;
    btn.rect.setAlpha(0.55);
  }

  private release(btn: Btn, p: Phaser.Input.Pointer) {
    if (btn.pointerId === p.id) {
      btn.pointerId = null;
      btn.rect.setAlpha(0.35);
    }
  }

  update(state: InputState) {
    const shouldShow = this.forceShow || this.scene.sys.game.device.os.android || this.scene.sys.game.device.os.iOS;
    if (shouldShow && !this.visible) this.setVisible(true);
    if (!this.visible) return;
    this.buttons.forEach((b) => {
      const pressed = b.pointerId !== null;
      (state as any)[b.key] = (state as any)[b.key] || pressed;
    });
  }

  setVisible(v: boolean) {
    if (this.visible === v) return;
    this.visible = v;
    this.buttons.forEach((b) => {
      b.rect.setVisible(v);
      b.label.setVisible(v);
    });
    if (v && !this.shownOnce) {
      this.shownOnce = true;
      this.scene.tweens.add({ targets: this.buttons.map((b) => b.rect), alpha: '+=0.1', duration: 220, yoyo: true });
    }
  }

  isVisible() {
    return this.visible;
  }
}
