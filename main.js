const CONFIG_URL = './config.json';
const I18N_MAP = {
  ar: './i18n/ar.json',
  en: './i18n/en.json'
};

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function bootstrap(preloadSceneClass) {
  const [{ LevelScene }, { UIScene }] = await Promise.all([
    import('./scenes/LevelScene.js'),
    import('./scenes/UIScene.js')
  ]);

  const PreloadScene = preloadSceneClass ?? (await import('./scenes/PreloadScene.js')).PreloadScene;
  const [config, ar, en] = await Promise.all([
    loadJSON(CONFIG_URL),
    loadJSON(I18N_MAP.ar),
    loadJSON(I18N_MAP.en)
  ]);

  const shared = {
    config,
    i18n: { ar, en },
    language: 'ar',
    reducedMotion: false,
    unlockedVehicles: new Set(config.vehicle === 'prado' ? ['gmc', 'prado'] : ['gmc'])
  };

  window.RAFIAH_SHARED = shared;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: 1280,
    height: 720,
    backgroundColor: '#F8E9D2',
    transparent: false,
    physics: {
      default: 'matter',
      matter: {
        gravity: { y: 1.0 },
        enableSleep: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    dom: {
      createContainer: false
    },
    audio: {
      disableWebAudio: false
    },
    scene: [PreloadScene, LevelScene, UIScene]
  });

  game.registry.set('shared', shared);

  const eventBus = new Phaser.Events.EventEmitter();
  shared.events = eventBus;
  game.events.emit('rafiah-shared-ready', shared);

  game.events.on('language-change', lang => {
    shared.language = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  });

  game.events.on('reduced-motion', enabled => {
    shared.reducedMotion = !!enabled;
  });
  return game;
}

function reportBootFailure(error) {
  const node = document.createElement('div');
  node.style.position = 'absolute';
  node.style.top = '12px';
  node.style.left = '12px';
  node.style.background = '#8b1a1a';
  node.style.color = '#fff';
  node.style.padding = '12px 16px';
  node.style.borderRadius = '8px';
  node.style.fontFamily = 'monospace';
  node.style.maxWidth = '360px';
  node.textContent = `Failed to boot Rafiah Dune Adventure: ${error.message}`;
  document.body.appendChild(node);
  console.error('Boot failed:', error);
}

bootstrap()
  .then(() => console.log('✅ Boot OK'))
  .catch(reportBootFailure);
