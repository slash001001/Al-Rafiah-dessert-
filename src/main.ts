import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene';
import RunScene from './scenes/RunScene';
import CampScene from './scenes/CampScene';

const overlay = document.getElementById('error-overlay') as HTMLDivElement | null;
const overlayMessage = (msg: string) => {
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.textContent = msg;
};

const setupOverlay = () => {
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.textContent = 'Loading Rafiah… إذا شفت شاشة سودا ارفع الحافظ الله';
};

setupOverlay();

window.addEventListener('error', (e) => {
  overlayMessage(`window.error: ${e.message || e.error}`);
});

window.addEventListener('unhandledrejection', (e) => {
  overlayMessage(`promise rejection: ${e.reason}`);
});

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#0b0f14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [MenuScene, RunScene, CampScene]
};

const game = new Phaser.Game(config);

game.events.on('ready', () => {
  overlay?.style && (overlay.style.display = 'none');
});
