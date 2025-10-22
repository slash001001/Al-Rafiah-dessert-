import PreloadScene from './scenes/PreloadScene.js';
import LevelScene from './scenes/LevelScene.js';
import UIScene from './scenes/UIScene.js';

const SHARED = window.RAFIAH_SHARED ?? {
  config: null,
  i18n: { ar: {}, en: {} },
  language: 'ar',
  reducedMotion: false,
  unlockedVehicles: new Set(['gmc'])
};
window.RAFIAH_SHARED = SHARED;

const { Game, AUTO, Scale, Events } = Phaser;

const gameConfig = {
  type: AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#101418',
  parent: document.body,
  pixelArt: true,
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.0 },
      debug: false
    }
  },
  scene: [PreloadScene, LevelScene, UIScene]
};

const game = new Game(gameConfig);
window.__RAFIAH_GAME = game;
console.log('✅ Phaser.Game created');

SHARED.game = game;
SHARED.events = SHARED.events || new Events.EventEmitter();
game.registry.set('shared', SHARED);

game.events.on('language-change', lang => {
  SHARED.language = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
});

game.events.on('reduced-motion', enabled => {
  SHARED.reducedMotion = !!enabled;
});

setTimeout(() => {
  const canvas = document.querySelector('canvas');
  if (canvas) {
    console.log(`✅ Canvas detected (${canvas.width}×${canvas.height})`);
  } else {
    console.warn('⚠️ Canvas not found yet');
  }
}, 300);

bootstrapAsync().catch(err => {
  console.warn('⚠️ bootstrapAsync encountered error', err);
});

async function bootstrapAsync() {
  console.log('⏳ Fetching configuration & translations');
  const [config, ar, en] = await Promise.all([
    fetchJSON('./config.json'),
    fetchJSON('./i18n/ar.json'),
    fetchJSON('./i18n/en.json')
  ]).catch(err => {
    console.warn('⚠️ config fallback used', err);
    return [
      { audio: { music: true, sfx: true }, mode: { familySafe: true }, vehicle: 'gmc' },
      {},
      {}
    ];
  });

  SHARED.config = config;
  SHARED.i18n = { ar, en };
  SHARED.language = SHARED.language || 'ar';
  SHARED.unlockedVehicles = new Set(config.vehicle === 'prado' ? ['gmc', 'prado'] : ['gmc']);

  game.registry.set('config', config);
  game.registry.set('lang', SHARED.language);
  game.registry.set('language', SHARED.language);
  game.registry.set('level-data', null);
  game.events.emit('rafiah-shared-ready', SHARED);

  console.log('✅ config loaded');
  document.dispatchEvent(new CustomEvent('rafiah:config-loaded', { detail: config }));
  document.documentElement.lang = SHARED.language;
  document.documentElement.dir = SHARED.language === 'ar' ? 'rtl' : 'ltr';
}

async function fetchJSON(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} ${response.status} ${response.statusText}`);
  }
  return response.json();
}

window.addEventListener('rafiah-level-ready', () => {
  console.log('✅ Level visible (canvas present)');
  console.log('✅ Boot OK');
});
