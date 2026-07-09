// This service worker previously cache-first'd every page under a cache
// name that never changed across deploys, so any browser that installed it
// once would stay frozen on a stale snapshot forever. Nothing in the current
// codebase registers a service worker anymore, so the correct fix is for
// this file to unregister itself and wipe its caches on every already
// -installed client, then get out of the way.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
