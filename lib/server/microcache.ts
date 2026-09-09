// Short-lived in-isolate cache with request coalescing, for the public
// read-only endpoints every page load hits.
//
// The problem it solves: booting any page fires four fetches -
// /api/promos, /api/site-data/events, /api/site-data/products and
// /api/site-data/gallery (see app/_components/V25App.tsx). Each one ran
// ensureCatalogSeeded() and a fresh SELECT against Neon on every single
// request. A thousand people arriving at once is four thousand round trips to
// Postgres for four answers that are identical for everybody and change maybe
// twice a week.
//
// The responses already carry `s-maxage=120`, but nothing was honouring it:
// checked against production on 2026-09-09, /api/site-data/products came back
// with no CF-Cache-Status and no Age header at all. Cloudflare does not cache
// Worker responses off Cache-Control alone, so that header was decorative.
//
// Coalescing is the part that matters under load. A plain TTL cache still lets
// a thousand simultaneous misses become a thousand queries - the classic
// stampede when a cache entry expires mid-rush. Storing the in-flight promise
// means concurrent callers all await the same query, so a cold isolate under
// peak load issues exactly one.

interface Entry<T> {
  // The in-flight or settled query. Concurrent callers await this same promise.
  value: Promise<T>;
  // When this entry stops being served fresh.
  expires: number;
  // Last successful result, kept to serve stale if a later refresh fails.
  last?: T;
}

const store = new Map<string, Entry<unknown>>();

/**
 * Run `fn` at most once per `ttlMs` per isolate, coalescing concurrent callers.
 *
 * On a refresh failure the previous value is served rather than propagating the
 * error, so a brief database wobble degrades to slightly stale content instead
 * of an empty shop grid.
 */
export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && now < hit.expires) return hit.value;

  const entry: Entry<T> = {
    expires: now + ttlMs,
    last: hit?.last,
    value: undefined as unknown as Promise<T>,
  };

  entry.value = fn()
    .then((v) => {
      entry.last = v;
      return v;
    })
    .catch((err) => {
      // Serve the previous good answer if we have one; otherwise the caller's
      // own catch decides what an empty result looks like.
      if (entry.last !== undefined) return entry.last;
      // Do not let a failure sit in the cache for the full TTL.
      store.delete(key);
      throw err;
    });

  store.set(key, entry as Entry<unknown>);

  // Keep the map from growing without bound in a long-lived isolate. There are
  // only a handful of keys in practice, so this effectively never fires.
  if (store.size > 100) {
    for (const [k, v] of store) {
      if (now > v.expires) store.delete(k);
    }
  }

  return entry.value;
}

/** Drop a key so the next read refetches. For admin writes that change content. */
export function invalidate(key: string): void {
  store.delete(key);
}
