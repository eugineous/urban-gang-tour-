// Kill-switch service worker: replaces any previously-registered SW from the
// old static site, wipes all its caches, unregisters itself, and reloads open
// tabs so every visitor immediately sees the new deployment.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {}
      try {
        await self.registration.unregister();
      } catch (e) {}
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((c) => c.navigate(c.url));
      } catch (e) {}
    })()
  );
});
// No fetch handler: the browser goes straight to the network.
