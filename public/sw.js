const CACHE = 'ugt-app-operations-20261028-v2';
const RUNTIME = `${CACHE}-runtime`;
const MAX_RUNTIME_ENTRIES = 80;
// A standalone document cannot fail hydration when route chunks are unavailable.
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/manifest.json', '/icon-192.png'];
let pendingWrite = Promise.resolve();

// Cache only explicitly public assets, and honour response privacy directives.
function storePublic(request, response) {
  if (!response.ok || response.type === 'opaque' || response.redirected || /(?:private|no-store)/i.test(response.headers.get('Cache-Control') || '') || /(?:cookie|authorization|\*)/i.test(response.headers.get('Vary') || '')) return Promise.resolve();
  const copy = response.clone();
  pendingWrite = pendingWrite.then(async () => {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, copy);
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES)).map(key => cache.delete(key)));
  }).catch(() => {}); // Storage denial/quota must not break a successful network response.
  return pendingWrite;
}

const cached = (request) => caches.match(request).catch(() => undefined);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
});

// Existing installations wait for the visitor's explicit update action.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('ugt-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)))
    ).catch(() => {}).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('Authorization') || request.headers.get('RSC') === '1' || /^\/(api|admin|organizer|account|verify|t|tickets|receipt|checkout|orders|pay|cart)(\/|$)/.test(url.pathname)) return;
  // Unhashed application files change between deployments. Never pin a
  // visitor to the runtime from their first install. Keep an offline copy,
  // but always ask the network for the current version when connected.
  if (['/sw.js', '/release-client.js', '/manifest.json'].includes(url.pathname)) {
    event.respondWith(
      fetch(request).then((res) => {
        event.waitUntil(storePublic(request, res));
        return res;
      }).catch(() => cached(request).then((res) => res || new Response('Unavailable offline', { status: 503 })))
    );
    return;
  }
  // Immutable compiled assets: cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      cached(request).then((hit) => hit || fetch(request).then((res) => {
        event.waitUntil(storePublic(request, res));
        return res;
      }))
    );
    return;
  }
  // Navigation: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => cached(OFFLINE).then((r) => r || new Response('Offline', { status: 503 })))
    );
    return;
  }
  if (!/^\/(assets|design-assets|fonts|media-library)\//.test(url.pathname) && !/^\/(icon-\d+\.png|favicon\.ico)$/.test(url.pathname)) return;
  // Unversioned media/styles must revalidate after a release.
  event.respondWith(fetch(request).then((res) => {
    event.waitUntil(storePublic(request, res));
    return res;
  }).catch(() => cached(request).then((res) => res || new Response('Unavailable offline', {status:503}))));
});
