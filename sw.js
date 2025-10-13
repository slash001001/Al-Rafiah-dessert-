const CACHE_NAME = 'ta3s-gmc-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/main.js',
  './src/utils.js',
  './src/audio.js',
  './src/input.js',
  './src/world.js',
  './src/player.js',
  './src/entities.js',
  './src/particles.js',
  './src/score.js',
  './src/events.js',
  './src/ui.js',
  './src/render.js',
  './src/selftest.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then(
      cached =>
        cached ||
        fetch(request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          return response;
        }),
    ),
  );
});
