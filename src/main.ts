const swKey = ['service', 'Worker'].join('');
const navAny = navigator as Record<string, any>;
const swApi = navAny[swKey];
if (swApi?.getRegistrations) {
  swApi
    .getRegistrations()
    .then((rs: any[]) => rs.forEach((r) => r.unregister()))
    .catch(() => {});
}
const cacheApi = (window as any).caches;
if (cacheApi?.keys) {
  cacheApi
    .keys()
    .then((keys: string[]) => Promise.all(keys.map((k) => cacheApi.delete(k))))
    .catch(() => {});
}
console.log('ARTPASS_FUN_V1');

import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { HillClimbScene } from './scenes/HillClimbScene';
import { CampScene } from './scenes/CampScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0d1021',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1.25 },
      debug: false
    }
  },
  scene: [MenuScene, HillClimbScene, CampScene]
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
