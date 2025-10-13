const CACHE_NAME = 'ta3s-gmc-ultra-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
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
  './src/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request).then(fetchRes => {
        if (!fetchRes || fetchRes.status !== 200 || fetchRes.type !== 'basic') return fetchRes;
        const cloned = fetchRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return fetchRes;
      })
    )
  );
});
