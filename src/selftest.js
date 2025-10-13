import { sampleGround } from './world.js';

export const selfTestFitAndGround = (canvas, cam) => {
  const width = canvas.width;
  if (!width) return true;
  for (let x = 0; x < width; x += 120) {
    const y = sampleGround(cam.x + x);
    if (!Number.isFinite(y)) return false;
    if (y > canvas.height + 200 || y < -200) return false;
  }
  return true;
};

export const updateDebugOverlay = (overlay, info) => {
  overlay.textContent = `FPS: ${info.fps.toFixed(1)}\nKM/H: ${info.speed.toFixed(0)}\nScore: ${Math.round(info.score)}\nCombo: x${info.combo.toFixed(2)}\nPhase: ${info.phase}\nCamX: ${info.camX.toFixed(1)}\nBoss: ${info.bossActive ? 'ACTIVE' : 'idle'}`;
};
