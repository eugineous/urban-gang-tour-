// Worker-level shared budgets. Credential scopes never use a client cookie.
export const RATE_POLICIES = Object.freeze({
  'buyer-auth': 8, 'buyer-google': 8, 'admin-password': 5, 'admin-google': 5,
  'organizer-login': 8, 'organizer-signup': 5, 'organizer-google': 8,
  'organizer-forgot': 5, 'organizer-reset': 8, 'buyer-recovery': 8,
  purchase: 3000, 'public-read': 60000, 'public-write': 5000,
});

export class SharedRateLimiter {
  constructor(state) { this.state = state; }
  async fetch(request) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const body = await request.json().catch(() => null);
    const limit = body && typeof body.scope === 'string' && Object.hasOwn(RATE_POLICIES, body.scope) ? RATE_POLICIES[body.scope] : undefined;
    if (!limit || Object.keys(body).some(key => key !== 'scope')) return new Response('Invalid scope', { status: 400 });
    const now = Date.now();
    const result = await this.state.storage.transaction(async tx => {
      const previous = await tx.get(body.scope);
      const bucket = previous && previous.reset > now
        ? { count: Math.min(previous.count + 1, limit + 1), reset: previous.reset }
        : { count: 1, reset: now + 60000 };
      await tx.put(body.scope, bucket);
      return { allowed: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.reset - now) / 1000)) };
    });
    await this.state.storage.setAlarm(now + 120000);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  }
  async alarm() {
    const records = await this.state.storage.list();
    const now = Date.now();
    let next = Infinity;
    for (const [key, value] of records) {
      if (value.reset <= now) await this.state.storage.delete(key);
      else next = Math.min(next, value.reset);
    }
    if (Number.isFinite(next)) await this.state.storage.setAlarm(next + 1000);
  }
}

const credentials = new Map([
  ['/api/admin/login', 'admin-password'], ['/api/admin/google', 'admin-google'],
  ['/api/auth/google', 'buyer-google'], ['/api/account/recovery', 'buyer-recovery'],
  ['/api/organizer/login', 'organizer-login'], ['/api/organizer/signup', 'organizer-signup'],
  ['/api/organizer/google', 'organizer-google'], ['/api/organizer/forgot', 'organizer-forgot'],
  ['/api/organizer/reset', 'organizer-reset'],
]);
const purchases = new Set(['/api/orders', '/api/marketplace/checkout', '/api/paystack/checkout', '/api/stripe/checkout']);

export async function sharedRateGuard(request, env) {
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  let scope;
  let strict = true;
  if (request.method === 'POST' && credentials.has(path)) scope = credentials.get(path);
  else if (request.method === 'POST' && path === '/api/auth') {
    // "me" polling and logout are not password attempts. Bound the cloned
    // request before inspecting it, so a large stream cannot evade the guard.
    const { readJsonObject } = await import('./lib/server/json-body.ts');
    const parsed = await readJsonObject(request.clone());
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status, headers: { 'Cache-Control': 'no-store' } });
    if (['login', 'signup'].includes(parsed.value.action)) scope = 'buyer-auth';
  } else if (request.method === 'POST' && purchases.has(path)) scope = 'purchase';
  else if (path.startsWith('/api/') && !/^\/api\/(?:admin|internal|organizer)(?:\/|$)/.test(path) && !/\/(?:webhook|callback)$/.test(path)) {
    if (['GET', 'HEAD'].includes(request.method)) { scope = 'public-read'; strict = false; }
    else scope = 'public-write';
  }
  if (!scope) return null;
  // No network guard is added to ordinary pages/assets or authenticated cron.
  const ip = request.headers.get('cf-connecting-ip');
  if (!env.UGT_RATE_LIMITER || !ip || !env.SESSION_SECRET) return strict
    ? Response.json({ error: 'abuse_protection_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } }) : null;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ugt-network-v1:' + env.SESSION_SECRET + ':' + ip));
    const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const stub = env.UGT_RATE_LIMITER.get(env.UGT_RATE_LIMITER.idFromName(key));
    const response = await stub.fetch('https://limiter.internal/take', {
      method: 'POST', body: JSON.stringify({ scope }), signal: AbortSignal.timeout(3000),
    });
    const result = await response.json();
    if (!response.ok || typeof result.allowed !== 'boolean' || !Number.isSafeInteger(result.retryAfter)) throw new Error('limiter_invalid_response');
    if (!result.allowed) return Response.json({ error: 'too_many_requests' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(result.retryAfter) } });
    return null;
  } catch {
    // Credentials and purchases fail closed. Public cached reads retain their
    // local limits and availability if the shared service briefly fails.
    return strict ? Response.json({ error: 'abuse_protection_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } }) : null;
  }
}
