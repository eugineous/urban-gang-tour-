import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Worker source is bundled as an ES module.
import { SharedRateLimiter, sharedRateGuard } from '../shared-rate-limit.mjs';
function storage() {
  const data = new Map<string, { count: number; reset: number }>();
  let serial = Promise.resolve();
  const store = {
    get: async (key: string) => data.get(key), put: async (key: string, value: { count: number; reset: number }) => { data.set(key, value); },
    delete: async (key: string) => data.delete(key), list: async () => data, setAlarm: vi.fn(async () => {}),
    transaction: (fn: (tx: unknown) => Promise<unknown>) => { const result = serial.then(() => fn(store)); serial = result.then(() => undefined, () => undefined); return result; },
  };
  return { store, data };
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const req = (path: string, headers: Record<string, string> = {}, body?: object) => new Request('https://urbangangtour.co.ke' + path, { method: body ? 'POST' : 'GET', headers: { 'cf-connecting-ip': '192.0.2.1', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
describe('shared network enforcement', () => {
  it('serializes concurrent credential requests and persists budgets across instances', async () => {
    const { store } = storage();
    const first = new SharedRateLimiter({ storage: store }), second = new SharedRateLimiter({ storage: store });
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => (index % 2 ? first : second).fetch(req('/take', {}, { scope: 'admin-password' })).then((r: Response) => r.json())));
    expect(results.filter(r => r.allowed)).toHaveLength(5);
    expect(results.filter(r => !r.allowed)).toHaveLength(15);
  });
  it('does not accept caller-defined budgets or prototype scopes', async () => {
    const { store } = storage(); const limiter = new SharedRateLimiter({ storage: store });
    for (const body of [{ scope: 'toString' }, { scope: 'admin-password', limit: 999 }, { scope: 'invented' }]) expect((await limiter.fetch(req('/take', {}, body))).status).toBe(400);
  });
  it('preserves venue-scale purchase and status budgets and expires counters', async () => {
    const { store, data } = storage(); const limiter = new SharedRateLimiter({ storage: store });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
    for (let n = 0; n < 1000; n++) expect((await (await limiter.fetch(req('/take', {}, { scope: 'purchase' }))).json()).allowed).toBe(true);
    data.set('public-read', { count: 35999, reset: 61000 });
    expect((await (await limiter.fetch(req('/take', {}, { scope: 'public-read' }))).json()).allowed).toBe(true);
    clock.mockReturnValue(61000); await limiter.alarm(); expect(data.size).toBe(0);
  });
  it('ignores rotating device and forwarded-IP headers on password endpoints', async () => {
    const ids: string[] = [], fetcher = vi.fn(async () => Response.json({ allowed: false, retryAfter: 42 }));
    const env = { SESSION_SECRET: 'fixture-only-key', UGT_RATE_LIMITER: { idFromName: (key: string) => { ids.push(key); return key; }, get: () => ({ fetch: fetcher }) } };
    for (const cookie of ['ugt_did=aaaaaaaa', 'ugt_did=bbbbbbbb']) expect((await sharedRateGuard(req('/api/admin/login', { cookie, 'x-forwarded-for': cookie }, {}), env))?.status).toBe(429);
    expect(ids[0]).toBe(ids[1]); expect(ids[0]).not.toContain('192.0.2.1');
  });
  it('does not budget buyer session polling as a password attempt', async () => {
    expect(await sharedRateGuard(req('/api/auth', {}, { action: 'me' }), {})).toBeNull();
    expect(await sharedRateGuard(req('/api/auth', {}, { action: 'logout' }), {})).toBeNull();
    expect((await sharedRateGuard(req('/api/auth', {}, { action: 'login' }), {}))?.status).toBe(503);
  });
  it('fails closed for credentials/payments while retaining public read availability', async () => {
    expect((await sharedRateGuard(req('/api/orders', {}, {}), {}))?.status).toBe(503);
    expect(await sharedRateGuard(req('/api/site-data/products'), {})).toBeNull();
    expect(await sharedRateGuard(req('/shop'), {})).toBeNull();
    expect(await sharedRateGuard(req('/api/mpesa/callback', {}, {}), {})).toBeNull();
  });
  it('covers contact submissions with the existing shared public-write backstop', async () => {
    const fetcher=vi.fn(async(_url:string,_init:RequestInit)=>Response.json({allowed:true,retryAfter:60}));
    const env={SESSION_SECRET:'fixture-only-key',UGT_RATE_LIMITER:{idFromName:(key:string)=>key,get:()=>({fetch:fetcher})}};
    expect(await sharedRateGuard(req('/api/contact',{},{}),env)).toBeNull();
    expect(JSON.parse(String(fetcher.mock.calls[0][1].body))).toEqual({scope:'public-write'});
    expect((await sharedRateGuard(req('/api/contact',{},{}),{}))?.status).toBe(503);
  });
});
