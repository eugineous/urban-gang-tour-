const CACHE = 'ugt-approved-interface-20261009';
const OFFLINE = '/offline';
const PRECACHE = [OFFLINE, '/manifest.json', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || /^\/(admin|organizer|account|verify|t|tickets|receipt|checkout)(\/|$)/.test(url.pathname)) return;
  // Unhashed application files change between deployments. Never pin a
  // visitor to the runtime from their first install. Keep an offline copy,
  // but always ask the network for the current version when connected.
  if (['/sw.js', '/manifest.json'].includes(url.pathname)) {
    event.respondWith(
      fetch(request).then((res) => {
        if (res.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, res.clone())));
        return res;
      }).catch(() => caches.match(request).then((res) => res || new Response('Unavailable offline', { status: 503 })))
    );
    return;
  }
  // Immutable compiled assets: cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/assets/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(request, clone)); }
        return res;
      }))
    );
    return;
  }
  // Navigation: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE).then((r) => r || new Response('Offline', { status: 503 })))
    );
    return;
  }
  // Everything else: network only
  event.respondWith(fetch(request));
});
