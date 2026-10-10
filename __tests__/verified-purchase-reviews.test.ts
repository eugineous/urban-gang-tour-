import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: null as null | { id: number; email: string },
  purchased: false,
  failLookup: false,
  queries: [] as { sql: string; args: unknown[] }[],
}));
vi.mock('@/lib/server/customer-account', () => ({ validatedCurrentBuyer: async () => state.user }));
vi.mock('@/lib/server/db', () => ({
  hasDb: () => true,
  q: async (sql: string, args: unknown[]) => {
    state.queries.push({ sql, args });
    if (state.failLookup) throw new Error('database password must never leak');
    if (sql.startsWith('SELECT o.id')) {
      if (state.failLookup) throw new Error('database password must never leak');
      return state.purchased ? [{ id: 'ORD-PAID' }] : [];
    }
    return [];
  },
}));
vi.mock('@/lib/server/catalog', () => ({ getProducts: async () => ({ tee: 1500 }) }));
vi.mock('@/lib/server/origin', () => ({ sameOrigin: () => true }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => '127.0.0.1' }));
vi.mock('@/lib/server/notify', () => ({ notifyNewReview: async () => {} }));
vi.mock('next/server', async (original) => ({ ...await original<typeof import('next/server')>(), after: () => {} }));
import { GET, POST } from '@/app/api/reviews/route';

function request(body: unknown = { product_id: 'tee', author: 'Buyer', rating: 5, body: 'Fits well and feels good.' }) {
  return new Request('https://urbangangtour.co.ke/api/reviews', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  state.user = { id: 42, email: 'buyer@example.test' };
  state.purchased = false;
  state.failLookup = false;
  state.queries.length = 0;
});
it('rejects anonymous reviews before accessing order records', async () => {
  state.user = null;
  expect((await POST(request())).status).toBe(401);
  expect(state.queries).toEqual([]);
});
it('rejects reviews when no paid product purchase belongs to the account', async () => {
  const response = await POST(request());
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: 'verified_purchase_required' });
  expect(state.queries).toHaveLength(1);
  const lookup = state.queries[0];
  expect(lookup.args).toEqual([42, 'tee']);
  expect(lookup.sql).toContain('o.user_id = $1');
  expect(lookup.sql).toContain("o.status IN ('paid','fulfilled')");
  expect(lookup.sql).toContain("item->>'id' = $2");
  expect(lookup.sql).not.toMatch(/email/);
});
it('queues a verified purchase for moderation without approving it', async () => {
  state.purchased = true;
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, pending: true });
  expect(state.queries[1].sql).toContain('VALUES ($1,$2,$3,$4,false)');
});
it('rejects client-supplied account and order ownership fields', async () => {
  const response = await POST(request({ product_id: 'tee', author: 'Buyer', rating: 5, body: 'Good product.', user_id: 7 }));
  expect(response.status).toBe(400);
  expect(state.queries).toEqual([]);
});
it('handles null payloads without throwing', async () => {
  expect((await POST(request(null))).status).toBe(400);
});
it('fails closed without exposing database errors', async () => {
  state.failLookup = true;
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'review_unavailable' });
  expect(state.queries).toHaveLength(1);
});
it('keeps approved review discovery public', async () => {
  state.user = null;
  const response = await GET(new Request('https://urbangangtour.co.ke/api/reviews?product=tee'));
  expect(response.status).toBe(200);
  expect(state.queries[0].sql).toContain('AND approved');
});

it('does not expose database errors from public review discovery',async()=>{state.failLookup=true;const response=await GET(new Request('https://urbangangtour.co.ke/api/reviews?product=tee'));expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'reviews_unavailable'});});
