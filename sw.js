const CLEANUP_VERSION = 'taees-desert-reset';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      try {
        await self.registration.unregister();
      } catch (err) {
        // Ignore if unregister fails; pages will simply use network.
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
