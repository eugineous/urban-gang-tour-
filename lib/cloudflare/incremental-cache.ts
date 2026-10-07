import type { IncrementalCache } from '@opennextjs/aws/types/overrides';
import seeds from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// OpenNext packages prerendered entries into ASSETS for a cold edge. Mutable
// ISR entries use the Workers Cache API, scoped by build and cache type.
// Eviction costs a fresh render; it never loses application data.
const cacheKey = (key: string, type = 'cache') =>
  `https://cache.ugt.invalid/${encodeURIComponent(process.env.OPEN_NEXT_BUILD_ID || 'development')}/${type}/${encodeURIComponent(key)}`;
const edge = () => caches.open('ugt-incremental-v1');
const cache: IncrementalCache = {
  // Select OpenNext's static seed packaging, with no remote bucket warm-up.
  name: seeds.name,
  async get(key, type) {
    try {
      const response = await (await edge()).match(cacheKey(key, type));
      if (response) return await response.json(); // null is an invalidation tombstone
    } catch { /* an unavailable cache must not block SSR */ }
    return seeds.get(key, type);
  },
  async set(key, value, type) {
    try {
      const interval = 'revalidate' in value && typeof value.revalidate === 'number' ? value.revalidate : 1800;
      const ttl = Math.max(60, Math.min(86400, interval * 2));
      await (await edge()).put(cacheKey(key, type), new Response(JSON.stringify({ value, lastModified: Date.now() }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
      }));
    } catch { /* Next can serve its response even if the cache cannot store it */ }
  },
  async delete(key) {
    try {
      const storage = await edge();
      await Promise.all(['cache', 'fetch', 'composable'].map(type => storage.put(cacheKey(key, type), new Response('null', {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      }))));
    } catch { /* expiry remains the fallback */ }
  },
};
export default cache;
