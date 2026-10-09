import app from './.open-next/worker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (/^\/(?:_design-pages|_design\/_next|fonts\/v25-)(?:\/|$)/.test(url.pathname) || url.pathname.startsWith('/fonts/v25-')) return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
    if (url.pathname === '/v25-template' || url.pathname === '/v25-template.html') return Response.redirect(new URL('/', url).href, 301);
    const response = await app.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    if (request.headers.get('RSC') === '1' || url.pathname === '/sw.js' || url.pathname === '/release-client.js' || url.pathname === '/manifest.json' || (response.headers.get('content-type') || '').includes('text/html')) {
      headers.set('Cache-Control', 'no-store');
      headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    }
    headers.set('X-UGT-Release', 'mobile-events-20261010-v3');
    const csp = headers.get('Content-Security-Policy');
    if (csp) headers.set('Content-Security-Policy', csp.replace(/(connect-src[^;]*)/, '$1 https://urban-gang-tour-events.euginemicah.workers.dev').replace(/(frame-src[^;]*)/, '$1 https://www.youtube-nocookie.com'));
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  },
  async scheduled(_controller, env, ctx) {
    // Use the existing self-service binding. No public bearer token travels
    // through a browser, URL, log line, or third-party scheduler.
    if (!env.UGT_CRON_SECRET || !env.WORKER_SELF_REFERENCE) return;
    const request = new Request('https://urbangangtour.co.ke/api/internal/cron/content-announcements', {
      method: 'POST',
      headers: { 'x-ugt-cron': env.UGT_CRON_SECRET },
    });
    ctx.waitUntil(env.WORKER_SELF_REFERENCE.fetch(request));
    // Release abandoned checkout holds so capped tiers free their seats even
    // when no payment callback ever arrives. Same secret, same self-call —
    // a second endpoint, not a second trust model.
    const sweep = new Request('https://urbangangtour.co.ke/api/internal/cron/ticket-sweeper', {
      method: 'POST',
      headers: { 'x-ugt-cron': env.UGT_CRON_SECRET },
    });
    ctx.waitUntil(env.WORKER_SELF_REFERENCE.fetch(sweep));
    // Recover orders stuck in pending when a provider callback never
    // arrives (Daraja stkpushquery / Paystack verify, idempotent writes).
    const recon = new Request('https://urbangangtour.co.ke/api/internal/cron/payment-reconcile', {
      method: 'POST',
      headers: { 'x-ugt-cron': env.UGT_CRON_SECRET },
    });
    ctx.waitUntil(env.WORKER_SELF_REFERENCE.fetch(recon));
  },
};
