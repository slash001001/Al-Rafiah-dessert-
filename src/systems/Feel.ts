import Phaser from 'phaser';

export const Feel = {
  hitStop(scene: Phaser.Scene, ms = 60) {
    (scene as any)._freezeUntil = scene.time.now + ms;
  },
  shake(scene: Phaser.Scene, durationMs = 120, intensity = 0.004) {
    scene.cameras.main.shake(durationMs, intensity);
  },
  pop(scene: Phaser.Scene, obj: Phaser.GameObjects.GameObject & { setScale: (v: number) => void }) {
    const start = (obj as any).scale || 1;
    scene.tweens.add({
      targets: obj,
      scale: start * 1.12,
      yoyo: true,
      duration: 80,
      ease: 'Quad.easeOut'
    });
  },
  flash(scene: Phaser.Scene, duration = 120, color = 0xffffff) {
    const rect = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, color, 0.25).setOrigin(0);
    rect.setScrollFactor(0).setDepth(1000);
    scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration,
      onComplete: () => rect.destroy()
    });
  }
};
