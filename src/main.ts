import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene';
import RunScene from './scenes/RunScene';
import CampScene from './scenes/CampScene';

const COLORS = {
  bg: 0x0b0f14
};

const overlay = document.getElementById('error-overlay') as HTMLElement | null;
if (overlay) {
  overlay.textContent = 'Loading Rafiah…';
  overlay.style.display = 'block';
}

function showOverlay(msg: string) {
  if (!overlay) return;
  overlay.textContent = msg;
  overlay.style.display = 'block';
}

window.addEventListener('error', ev => showOverlay(`window.error: ${ev.message}`));
window.addEventListener('unhandledrejection', ev => showOverlay(`unhandled: ${String(ev.reason)}`));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: COLORS.bg,
  parent: 'app',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scene: [MenuScene, RunScene, CampScene]
});

if (overlay) {
  overlay.textContent = '';
  overlay.style.display = 'none';
}

export default game;
