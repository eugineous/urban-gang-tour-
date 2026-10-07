import { beforeEach, expect, it, vi } from 'vitest';
const seed = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache', () => ({ default: { name: 'cf-static-assets-incremental-cache', get: seed.get } }));
import cache from '../lib/cloudflare/incremental-cache';
let entries: Map<string, Response>;
beforeEach(() => {
  entries = new Map(); seed.get.mockReset(); seed.get.mockResolvedValue(null);
  vi.stubEnv('OPEN_NEXT_BUILD_ID', 'build-a');
  vi.stubGlobal('caches', { open: async () => ({ match: async (key: string) => entries.get(key)?.clone(), put: async (key: string, response: Response) => entries.set(key, response.clone()) }) });
});
it('seeds cold edge caches from static assets and serves regenerated values', async () => {
  seed.get.mockResolvedValue({ value: { type: 'app', html: 'seed' }, lastModified: 1 });
  expect((await cache.get('/about'))?.value).toMatchObject({ html: 'seed' });
  await cache.set('/about', { type: 'app', html: 'fresh', rsc: '', revalidate: 300 });
  expect((await cache.get('/about'))?.value).toMatchObject({ html: 'fresh' });
  expect(seed.get).toHaveBeenCalledTimes(1);
});
it('does not reuse an earlier deployment or another cache type', async () => {
  await cache.set('/about', { type: 'app', html: 'old', rsc: '' });
  expect(await cache.get('/about', 'fetch')).toBeNull();
  vi.stubEnv('OPEN_NEXT_BUILD_ID', 'build-b');
  expect(await cache.get('/about')).toBeNull();
});
it('invalidates an entry without falling back to an obsolete static seed', async () => {
  seed.get.mockResolvedValue({ value: { type: 'app', html: 'seed' }, lastModified: 1 });
  await cache.delete('/about');
  expect(await cache.get('/about')).toBeNull();
  expect(seed.get).not.toHaveBeenCalled();
});
it('keeps server rendering available if the Cache API is unavailable', async () => {
  vi.stubGlobal('caches', { open: async () => { throw new Error('unavailable'); } });
  seed.get.mockResolvedValue({ value: { type: 'app', html: 'seed' }, lastModified: 1 });
  await expect(cache.set('/about', { type: 'app', html: 'fresh', rsc: '' })).resolves.toBeUndefined();
  expect((await cache.get('/about'))?.value).toMatchObject({ html: 'seed' });
});
