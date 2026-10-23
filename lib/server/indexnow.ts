import { ROUTES, SITE } from '@/lib/site';
import publicRoutes from '@/data/public-page-routes.json';

// IndexNow lets us push changed URLs straight to Bing/Yandex/Seznam (and any
// other participating engine) instead of waiting for their next crawl. Not a
// Google-specific mechanism — Google's old /ping?sitemap= endpoint was
// deprecated and isn't relied on here. The key below isn't a secret: it only
// proves domain ownership by also being hosted at /{key}.txt (IndexNow spec).
const INDEXNOW_KEY = 'db2a35cb019b2d7ae6e257a25e899f96';
const INDEXNOW_KEY_LOCATION = `${SITE.domain}/${INDEXNOW_KEY}.txt`;
const origin = new URL(SITE.domain).origin;
const privateOrRetired = new Set(['/admin', '/account', '/the-gang', '/shop/available']);
const publicPaths = new Set([
  ...ROUTES.map(route => route.path), ...publicRoutes,
  '/ticketing', '/marketplace', '/shop/lookbook',
  '/sitemap.xml', '/news-sitemap.xml', '/image-sitemap.xml', '/feed.xml',
].filter(path => !privateOrRetired.has(path)));

/** Canonical public route shapes only. Callers must verify each record's visibility. */
function canonicalPublicUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\s\\%?#\x00-\x1f\x7f]/.test(value)) return;
  if (value.startsWith('//') || /(?:^|\/)\.{1,2}(?:\/|$)/.test(value)) return;
  try {
    const url = new URL(value.startsWith('/') || value.startsWith('https:') ? value : '/' + value, origin);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash) return;
    const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '');
    const publicDetail = /^\/(?:blog|events|gallery)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) && path.length <= 246;
    const welcome = /^\/welcome\/(?:en|sw|fr|zh-Hans|ru|es)$/.test(path);
    if (!publicPaths.has(path) && !publicDetail && !welcome) return;
    return origin + path;
  } catch { return; }
}

// Called through Next's after() hook by publishing routes. Return the promise
// so the Worker keeps this background request alive after sending its response.
// Errors remain non-fatal and the timeout bounds the background task.
export async function pingIndexNow(paths: string[]): Promise<void> {
  const urlList = [...new Set(paths.slice(0, 10_000).map(canonicalPublicUrl).filter((url): url is string => !!url))];
  if (!urlList.length) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE.domain).host,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
      signal: controller.signal,
      redirect: 'error',
    });
    // Fetch resolves on rejected HTTP statuses too. Record only the bounded
    // status, never provider bodies, submitted URLs or exception contents.
    if (!response.ok) console.warn('[indexnow] delivery rejected (non-fatal)', { status: response.status });
  } catch {
    console.warn('[indexnow] delivery failed (non-fatal)', { code: controller.signal.aborted ? 'timeout' : 'transport_error' });
  } finally { clearTimeout(timeout); }
}
