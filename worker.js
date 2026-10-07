import app from './.open-next/worker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if ((url.pathname === '/v25-template' || url.pathname === '/v25-template.html') && request.headers.get('sec-fetch-dest') === 'document') {
      return Response.redirect(new URL('/', url).href, 302);
    }
    const response = await app.fetch(request, env, ctx);
    if (url.pathname === '/v25-template.html') {
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      headers.set('Cache-Control', 'no-cache, must-revalidate');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
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
