import Phaser from 'phaser';
import { InputState } from './InputState';

export class KeyboardInput {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: { [k: string]: Phaser.Input.Keyboard.Key };
  private pauseEdge = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      H: Phaser.Input.Keyboard.KeyCodes.H,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC
    }) as any;
    keyboard.on('keydown-ESC', () => (this.pauseEdge = true));
  }

  update(state: InputState) {
    const forward = this.cursors.up?.isDown || this.keys.W.isDown;
    const backward = this.cursors.down?.isDown || this.keys.S.isDown;
    const left = this.cursors.left?.isDown || this.keys.A.isDown;
    const right = this.cursors.right?.isDown || this.keys.D.isDown;

    state.left = !!left;
    state.right = !!right;
    state.accel = !!forward;
    state.brake = !!backward;
    state.nitro = !!this.keys.SPACE.isDown;
    state.honk = !!this.keys.H.isDown;
    if (this.pauseEdge) {
      state.pausePressed = true;
      this.pauseEdge = false;
    }
  }
}
