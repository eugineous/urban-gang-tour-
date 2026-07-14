import { SITE } from '@/lib/site';

// IndexNow lets us push changed URLs straight to Bing/Yandex/Seznam (and any
// other participating engine) instead of waiting for their next crawl. Not a
// Google-specific mechanism — Google's old /ping?sitemap= endpoint was
// deprecated and isn't relied on here. The key below isn't a secret: it only
// proves domain ownership by also being hosted at /{key}.txt (IndexNow spec).
const INDEXNOW_KEY = 'db2a35cb019b2d7ae6e257a25e899f96';
const INDEXNOW_KEY_LOCATION = `${SITE.domain}/${INDEXNOW_KEY}.txt`;

// Fire-and-forget: a search-engine ping must never block or fail an admin
// mutation. Swallow all errors, cap wait time so a slow/unreachable endpoint
// can't hang the request.
export function pingIndexNow(paths: string[]): void {
  if (!paths.length) return;
  const urlList = paths.map((p) => SITE.domain + (p.startsWith('/') ? p : `/${p}`));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE.domain).host,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList,
    }),
    signal: controller.signal,
  })
    .catch((e) => console.warn('[indexnow] ping failed (non-fatal):', String(e?.message || e)))
    .finally(() => clearTimeout(timeout));
}
