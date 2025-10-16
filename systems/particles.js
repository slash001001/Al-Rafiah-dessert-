function ensureTexture(scene, key, builder) {
  if (scene.textures.exists(key)) return;
  builder();
}

export function createDustSystem(scene) {
  ensureTexture(scene, 'dust-pixel', () => {
    const g = scene.add.graphics();
    g.fillStyle(0xE7C590, 0.9);
    g.fillCircle(4, 4, 4);
    g.generateTexture('dust-pixel', 8, 8);
    g.destroy();
  });

  const manager = scene.add.particles('dust-pixel');
  manager.setDepth(18);
  const emitter = manager.createEmitter({
    speed: { min: 40, max: 120 },
    angle: { min: 200, max: 340 },
    gravityY: 200,
    lifespan: { min: 300, max: 600 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.8, end: 0 },
    quantity: 5,
    on: false
  });

  return {
    manager,
    emitter,
    emit(x, y, intensity = 1) {
      emitter.explode(Math.max(4, Math.floor(6 * intensity)), x, y);
    },
    destroy() {
      manager.destroy();
    }
  };
}

export function createBoostBurst(scene) {
  ensureTexture(scene, 'boost-puff', () => {
    const g = scene.add.graphics();
    g.fillStyle(0xFAD97C, 0.9);
    g.fillCircle(12, 12, 12);
    g.generateTexture('boost-puff', 24, 24);
    g.destroy();
  });
  const manager = scene.add.particles('boost-puff');
  manager.setDepth(25);
  const emitter = manager.createEmitter({
    speed: { min: 120, max: 200 },
    angle: { min: 160, max: 380 },
    lifespan: { min: 200, max: 420 },
    scale: { start: 1.4, end: 0 },
    alpha: { start: 1, end: 0 },
    on: false
  });

  return {
    fire(x, y) {
      emitter.explode(24, x, y);
    },
    destroy() {
      manager.destroy();
    }
  };
}

export function createConfettiSystem(scene) {
  ensureTexture(scene, 'confetti-chip', () => {
    const g = scene.add.graphics();
    const colors = [0x2E86AB, 0xF4C27A, 0xE7C590, 0xA86B38];
    colors.forEach((color, idx) => {
      g.fillStyle(color, 1);
      g.fillRect(idx * 6, 0, 6, 12);
    });
    g.generateTexture('confetti-chip', colors.length * 6, 12);
    g.destroy();
  });

  const manager = scene.add.particles('confetti-chip');
  manager.setDepth(200);
  const emitter = manager.createEmitter({
    speedY: { min: 140, max: 260 },
    speedX: { min: -80, max: 80 },
    lifespan: 1200,
    gravityY: 320,
    scale: { start: 1, end: 0.1 },
    rotate: { min: -280, max: 280 },
    quantity: 12,
    on: false
  });

  return {
    celebrate(x, y) {
      emitter.explode(120, x, y);
    },
    destroy() {
      manager.destroy();
    }
  };
}

export function createSandstormOverlay(scene) {
  const { width, height } = scene.scale;
  const overlay = scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, 0xE7C590, 0.0);
  overlay.setDepth(190);
  overlay.setScrollFactor(0);

  const noise = scene.add.graphics();
  noise.setDepth(191);
  noise.setScrollFactor(0);
  noise.setAlpha(0);

  const updateNoise = () => {
    noise.clear();
    noise.fillStyle(0x2E3116, 0.08);
    for (let i = 0; i < 90; i += 1) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      noise.fillCircle(x, y, Phaser.Math.Between(4, 12));
    }
  };

  const timerEvent = scene.time.addEvent({
    delay: 120,
    loop: true,
    callback: updateNoise,
    paused: true
  });

  return {
    activate() {
      scene.tweens.add({ targets: overlay, alpha: 0.55, duration: 500, ease: 'Sine.easeOut' });
      scene.tweens.add({ targets: noise, alpha: 0.36, duration: 500, ease: 'Sine.easeOut' });
      timerEvent.paused = false;
    },
    deactivate() {
      scene.tweens.add({ targets: overlay, alpha: 0, duration: 700, ease: 'Sine.easeIn' });
      scene.tweens.add({ targets: noise, alpha: 0, duration: 700, ease: 'Sine.easeIn' });
      timerEvent.paused = true;
    },
    destroy() {
      overlay.destroy();
      noise.destroy();
      timerEvent.destroy();
    }
  };
}
