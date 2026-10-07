import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ configured: true, database: true, query: vi.fn() }));
vi.mock('@/lib/server/media', () => ({ mediaConfigured: () => state.configured }));
vi.mock('@/lib/server/db', () => ({ hasDb: () => state.database, q: state.query }));
vi.mock('@/lib/server/microcache', () => ({ cached: (_key: string, _ttl: number, fn: () => unknown) => fn() }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => 'test' }));
import { GET } from '@/app/api/health/media/route';
beforeEach(() => { state.database = true; state.configured = true; state.query.mockReset(); });
it('reports aggregate inventory without exposing URLs, payloads or credentials', async () => {
  state.query.mockResolvedValueOnce([
    { table_name: 'gallery_photos', column_name: 'url' },
    { table_name: 'ug_documents', column_name: 'payload' },
    { table_name: 'ug_documents', column_name: 'created_by' },
  ]).mockResolvedValueOnce([{ references: '12', legacy: '0', external: '2' }]);
  const response = await GET(new Request('https://urbangangtour.co.ke/api/health/media'));
  expect(await response.json()).toEqual({ configured: true, storage: 'workers-kv', inventory: { references: 12, legacyBucketReferences: 0, externalReferences: 2 } });
  const sql = state.query.mock.calls[1][0];
  expect(sql).toContain('heroImages');
  expect(sql).not.toContain('created_by');
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('does not mistake an unavailable database for an empty legacy inventory', async () => {
  state.database = false;
  expect((await GET(new Request('https://urbangangtour.co.ke/api/health/media'))).status).toBe(503);
  expect(state.query).not.toHaveBeenCalled();
});
it('does not return query details on a database failure', async () => {
  state.query.mockRejectedValue(new Error('private connection information'));
  const response = await GET(new Request('https://urbangangtour.co.ke/api/health/media'));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private');
});
