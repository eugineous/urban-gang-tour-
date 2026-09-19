import app from './.open-next/worker.js';

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    // Use the existing self-service binding. No public bearer token travels
    // through a browser, URL, log line, or third-party scheduler.
    if (!env.UGT_CRON_SECRET || !env.WORKER_SELF_REFERENCE) return;
    const request = new Request('https://urbangangtour.co.ke/api/internal/cron/content-announcements', {
      method: 'POST',
      headers: { 'x-ugt-cron': env.UGT_CRON_SECRET },
    });
    ctx.waitUntil(env.WORKER_SELF_REFERENCE.fetch(request));
  },
};
