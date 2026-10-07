import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';

const state = vi.hoisted(() => ({ configured: false, rows: [] as unknown[], fail: false }));
vi.mock('@/lib/server/db', () => ({ hasDb: () => state.configured, q: async () => {
  if (state.fail) throw new Error('unavailable');
  return state.rows;
} }));
vi.mock('@/lib/server/ops', () => ({ ensureOpsSchema: async () => {} }));
vi.mock('@/lib/server/microcache', () => ({ cached: async (_key: string, _ttl: number, read: () => Promise<unknown>) => read() }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => '127.0.0.1', PUBLIC_READ_NETWORK_LIMIT: 1000 }));
import { GET } from '@/app/api/site-data/gallery/route';

describe('public gallery source', () => {
  beforeEach(() => { state.configured = false; state.rows = []; state.fail = false; });
  it('uses existing neutral archive images only when no database is configured', async () => {
    const data = await (await GET(new Request('https://example.test/api/site-data/gallery'))).json();
    expect(data.source).toBe('archive');
    expect(data.photos.length).toBeGreaterThan(0);
    for (const photo of data.photos) {
      expect(existsSync(photo.url.replace('/assets/', 'assets/'))).toBe(true);
      expect(photo.category).toBe('From the archive');
      expect(photo.caption).not.toMatch(/school|2026|Nairobi/);
    }
  });
  it('respects an empty configured gallery', async () => {
    state.configured = true;
    const data = await (await GET(new Request('https://example.test/api/site-data/gallery'))).json();
    expect(data.photos).toEqual([]);
    expect(data.source).not.toBe('archive');
  });
  it('does not replace database errors with archived inventory', async () => {
    state.configured = true; state.fail = true;
    const data = await (await GET(new Request('https://example.test/api/site-data/gallery'))).json();
    expect(data.photos).toEqual([]);
    expect(data.source).not.toBe('archive');
  });
});
