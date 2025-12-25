import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MenuScene from './scenes/MenuScene';
import RunScene from './scenes/RunScene';
import CampScene from './scenes/CampScene';
import { createOverlay, setOverlayStatus } from './ui/overlay';

createOverlay();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 540,
  backgroundColor: '#0b0f14',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [PreloadScene, MenuScene, RunScene, CampScene]
};

const game = new Phaser.Game(config);

game.events.once('ready', () => setOverlayStatus('جاهز'));
