import { canCachePublicPage, mustNotStoreResponse } from './public-cache-policy.mjs';
import { sharedRateGuard } from './shared-rate-limit.mjs';

const release = 'home-energy-20261024-v1';
const welcomeLanguages = ['en','sw','fr','zh-Hans','ru','es'];
const storyNotFound='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Story not available — Urban News</title><link rel="icon" href="/favicon.ico"><style>body{margin:0;background:#f4f4f4;color:#151515;font:18px/1.6 Arial,sans-serif}main{max-width:680px;margin:auto;padding:48px 24px}h1{line-height:1.2}a{color:inherit;display:inline-flex;align-items:center;min-height:44px;margin-right:24px}a:focus-visible{outline:3px solid currentColor;outline-offset:4px}</style></head><body><main id="main-content"><a href="/" aria-label="Urban Gang Tour home"><img src="/assets/ugt-logo.png" width="96" height="72" alt="Urban Gang Tour"></a><h1>This story isn’t available.</h1><p>It may be unpublished, moved or removed.</p><nav aria-label="Next steps"><a href="/blog">Read Urban News</a><a href="/">Home</a></nav></main></body></html>';
const languageNotFound = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Language not available — Urban Gang Tour</title><link rel="icon" href="/favicon.ico"><style>body{margin:0;background:#f4f4f4;color:#151515;font:18px/1.6 Arial,sans-serif}main{max-width:680px;margin:auto;padding:48px 24px}img{object-fit:contain}h1{line-height:1.2}nav{display:flex;flex-wrap:wrap;gap:12px 24px}a{color:inherit;display:inline-flex;align-items:center;min-height:44px}a:focus-visible{outline:3px solid currentColor;outline-offset:4px}</style></head><body><main id="main-content"><a href="/" aria-label="Urban Gang Tour home"><img src="/assets/ugt-logo.png" width="96" height="72" alt="Urban Gang Tour"></a><h1>This language page isn’t available.</h1><p>Choose an available welcome page. Booking, checkout and legal pages are currently in English.</p><nav aria-label="Available languages"><a href="/welcome/en" lang="en">English</a><a href="/welcome/sw" lang="sw">Kiswahili</a><a href="/welcome/fr" lang="fr">Français</a><a href="/welcome/zh-Hans" lang="zh-Hans">简体中文</a><a href="/welcome/ru" lang="ru">Русский</a><a href="/welcome/es" lang="es">Español</a></nav><p><a href="/contact-us">Contact the team</a></p></main></body></html>`;

// Keep the edge runtime independently testable without generated Next bundles.
export function createWorker(app) {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      // A first plain-HTTP visit has not learned HSTS yet. Upgrade browser
      // navigation before rendering secure-context features or touching cache.
      // Keep the host: moving www sessions/OAuth state to apex is not harmless.
      // API requests and mutations retain their existing origin/auth semantics.
      if (url.protocol === 'http:' && ['GET','HEAD'].includes(request.method) &&
          ['urbangangtour.co.ke','www.urbangangtour.co.ke'].includes(url.hostname) &&
          url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
        url.protocol = 'https:';
        url.port = '';
        return new Response(null,{status:308,headers:{
          Location:url.href,'Cache-Control':'no-store',
          'Cloudflare-CDN-Cache-Control':'no-store','X-UGT-Release':release,
        }});
      }
      const limited = await sharedRateGuard(request, env);
      if (limited) {
        const headers = new Headers(limited.headers);
        headers.set('X-UGT-Release',release);
        headers.set('Cloudflare-CDN-Cache-Control','no-store');
        headers.set('X-Content-Type-Options','nosniff');
        return new Response(limited.body,{status:limited.status,headers});
      }
      // Root loading boundaries can turn Next notFound() into an HTTP 200
      // stream, even when metadata throws. Check the SAME public feed before
      // starting a leaf response. No private preview/auth bypass is introduced.
      const story=/^\/blog\/([^/]+)\/?$/.exec(url.pathname);
      if(story&&['GET','HEAD'].includes(request.method)){
        let available=false,unavailable=false;
        try{
          const slug=decodeURIComponent(story[1]);
          if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=240){
            const headers=new Headers(request.headers);headers.set('Accept','application/json');
            for(const key of ['RSC','Next-Router-State-Tree','Next-Router-Prefetch','Next-Url'])headers.delete(key);
            const feed=await app.fetch(new Request(new URL('/api/site-data/posts',url),{headers}),env,ctx);
            if(!feed.ok)unavailable=true;
            else{const data=await feed.json();if(data.ok!==true||!Array.isArray(data.posts))unavailable=true;else available=data.posts.some(post=>post.id===slug)}
          }
        }catch{unavailable=true}
        if(!available){
          const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','X-UGT-Release':release,'X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
          if(unavailable)return new Response(request.method==='HEAD'?null:'<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Urban News temporarily unavailable</title><main><h1>Please try again shortly.</h1><p>We couldn’t check this story right now.</p><a href="/blog">Back to Urban News</a></main></html>',{status:503,headers:{...headers,'Retry-After':'5'}});
          return new Response(request.method==='HEAD'?null:storyNotFound,{status:404,headers});
        }
      }
      // A finite public namespace, checked before Next starts a streaming
      // response. dynamicParams=false makes valid prerendered locales 404 in
      // the production OpenNext adapter; do not use it as this boundary.
      if (url.pathname === '/welcome' || url.pathname === '/welcome/') return new Response(null,{status:308,headers:{Location:new URL('/welcome/en',url).href,'X-UGT-Release':release,'Cache-Control':'no-store'}});
      if (url.pathname.startsWith('/welcome/') && !welcomeLanguages.includes(url.pathname.slice(9).replace(/\/$/,''))) return new Response(languageNotFound,{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','X-UGT-Release':release,'X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
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
      for (const job of ['content-announcements','ticket-sweeper','payment-reconcile','email-delivery','editorial']) {
        ctx.waitUntil(env.WORKER_SELF_REFERENCE.fetch(new Request('https://urbangangtour.co.ke/api/internal/cron/'+job,{
          method:'POST',headers:{'x-ugt-cron':env.UGT_CRON_SECRET},
        })));
      }
    },
  };
}
