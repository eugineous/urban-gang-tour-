import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: false, perm: true, rows: [] as any[], organizer: null as any }));
vi.mock('../lib/server/session', () => ({ verifyAdminSession: async () => mocks.admin, hasPerm: () => mocks.perm }));
vi.mock('../lib/server/organizer-session', () => ({ currentApprovedOrganizer: async () => ({ organizer: mocks.organizer }) }));
vi.mock('../lib/server/db', () => ({ hasDb: () => true, q: async () => mocks.rows }));
vi.mock('../lib/server/microcache', () => ({ cached: (_key: string, _ttl: number, fn: () => unknown) => fn() }));
vi.mock('../lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => 'local' }));
vi.mock('../lib/server/media', async original => ({ ...await original<any>(), mediaGet: async () => ({ value: new Uint8Array([1, 2, 3]).buffer, metadata: { contentType: 'image/png', size: 3 } }) }));
import { GET, HEAD } from '../app/media/[...path]/route';
const hash = 'a'.repeat(64);
const request = (scope: string, headers: Record<string, string> = {}) => {
  const path = `${scope}/${hash}/image.png`;
  return [new Request('https://urbangangtour.co.ke/media/' + path, { headers }), { params: Promise.resolve({ path: path.split('/') }) }] as const;
};
beforeEach(() => { mocks.admin = false; mocks.perm = true; mocks.rows = []; mocks.organizer = null; });
it('keeps private documents behind the existing documents permission', async () => {
  expect((await GET(...request('documents'))).status).toBe(401);
  mocks.admin = true; mocks.perm = false;
  expect((await GET(...request('documents'))).status).toBe(401);
  mocks.perm = true;
  const response = await GET(...request('documents'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('allows published gallery photos and authenticated preparation, never anonymous drafts', async () => {
  expect((await GET(...request('gallery'))).status).toBe(404);
  mocks.admin = true; expect((await GET(...request('gallery'))).status).toBe(200);
  mocks.admin = false; mocks.rows = [{}];
  const response = await GET(...request('gallery'));
  expect(await response.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
  expect(response.headers.get('content-type')).toBe('image/png');
});
it('checks draft event image ownership without changing published event images', async () => {
  mocks.organizer = { id: 'someone-else' };
  expect((await GET(...request('organizer-events/owner'))).status).toBe(404);
  mocks.organizer = { id: 'owner' };
  expect((await GET(...request('organizer-events/owner'))).status).toBe(200);
  mocks.organizer = null; mocks.rows = [{}];
  expect((await GET(...request('organizer-events/owner'))).status).toBe(200);
});
it('supports HEAD and conditional requests without disclosing private files', async () => {
  const response = await HEAD(...request('promo-hero'));
  expect(response.status).toBe(200); expect(await response.text()).toBe('');
  expect((await GET(...request('promo-hero', { 'if-none-match': '"' + hash + '"' }))).status).toBe(304);
  expect((await GET(...request('documents', { 'if-none-match': '"' + hash + '"' }))).status).toBe(401);
});
