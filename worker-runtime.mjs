import { canCachePublicPage, mustNotStoreResponse } from './public-cache-policy.mjs';
import { sharedRateGuard } from './shared-rate-limit.mjs';

const release = 'partner-event-listings-20261015-v1';

// Keep the edge runtime independently testable without generated Next bundles.
export function createWorker(app) {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const limited = await sharedRateGuard(request, env);
      if (limited) {
        const headers = new Headers(limited.headers);
        headers.set('X-UGT-Release',release);
        headers.set('Cloudflare-CDN-Cache-Control','no-store');
        headers.set('X-Content-Type-Options','nosniff');
        return new Response(limited.body,{status:limited.status,headers});
      }
      if (/^\/(?:_design-pages|_design\/_next|fonts\/v25-)(?:\/|$)/.test(url.pathname) || url.pathname.startsWith('/fonts/v25-')) return new Response('Not found', {status:404,headers:{'X-Robots-Tag':'noindex'}});
      if (url.pathname === '/v25-template' || url.pathname === '/v25-template.html') return Response.redirect(new URL('/',url).href,301);
      const cacheable = canCachePublicPage(request);
      const cacheUrl = new URL(url);
      cacheUrl.searchParams.set('__ugt_release', release);
      const cacheKey = new Request(cacheUrl.toString(), {method:'GET'});
      if (cacheable) {
        try { const hit = await caches.default.match(cacheKey); if (hit) return hit; }
        catch (error) { console.error('[public-cache-read]',error); }
      }
      const response = await app.fetch(request,env,ctx);
      const headers = new Headers(response.headers);
      if (mustNotStoreResponse(request, response) || request.headers.get('RSC') === '1' || ['/sw.js','/release-client.js','/manifest.json'].includes(url.pathname) || (headers.get('content-type') || '').includes('text/html')) {
        headers.set('Cache-Control','no-store');
        headers.set('Cloudflare-CDN-Cache-Control','no-store');
      }
      headers.set('X-UGT-Release',release);
      const safeToStore = cacheable && response.status === 200 &&
        (headers.get('content-type') || '').includes('text/html') && !headers.has('Set-Cookie');
      if (safeToStore) {
        headers.set('Cache-Control','public, max-age=0, s-maxage=60, must-revalidate');
        headers.set('Cloudflare-CDN-Cache-Control','public, max-age=60');
      }
      const result = new Response(response.body,{status:response.status,statusText:response.statusText,headers});
      if (safeToStore) {
        try { ctx.waitUntil(caches.default.put(cacheKey,result.clone()).catch(error=>console.error('[public-cache-write]',error))); }
        catch (error) { console.error('[public-cache-write]',error); }
      }
      return result;
    },
    async scheduled(_controller,env,ctx) {
      // Preserve the existing authenticated self-service cron jobs and bindings.
      if (!env.UGT_CRON_SECRET || !env.WORKER_SELF_REFERENCE) return;
      for (const job of ['content-announcements','ticket-sweeper','payment-reconcile','email-delivery']) {
        ctx.waitUntil(env.WORKER_SELF_REFERENCE.fetch(new Request('https://urbangangtour.co.ke/api/internal/cron/'+job,{
          method:'POST',headers:{'x-ugt-cron':env.UGT_CRON_SECRET},
        })));
      }
    },
  };
}
