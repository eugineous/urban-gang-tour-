import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: null as null | { id: number; email: string | null } }));
const writes = vi.hoisted(() => [] as unknown[][]);
vi.mock('@/lib/server/session', () => ({ currentUser: () => state.user }));
vi.mock('@/lib/server/db', () => ({ db: () => ({}), q: async (_sql: string, args: unknown[]) => { writes.push(args); return []; } }));
vi.mock('@/lib/server/origin', () => ({ sameOrigin: () => true }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => '127.0.0.1' }));
vi.mock('@/lib/server/notify', () => ({ notifyNewSubmission: async () => {} }));
vi.mock('next/server', async (original) => ({ ...await original<typeof import('next/server')>(), after: () => {} }));
import { POST } from '@/app/api/submissions/route';

const request = () => new Request('https://urbangangtour.co.ke/api/submissions', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Student', school: 'School', title: 'Story', pitch: 'Our story', email: 'forged@example.test' }),
});
beforeEach(() => { state.user = null; writes.length = 0; });
it('rejects anonymous pitches before writing to the newsroom', async () => {
  const response = await POST(request());
  expect(response.status).toBe(401);
  expect(writes).toEqual([]);
});
it('attributes contact email to the authenticated session rather than the submitted identity', async () => {
  state.user = { id: 1, email: 'student@example.test' };
  expect((await POST(request())).status).toBe(200);
  expect(writes[0]).toEqual(['Student', 'School', 'Story', 'Our story', 'student@example.test']);
});
it('does not substitute a forged address for a phone-only account', async () => {
  state.user = { id: 1, email: null };
  expect((await POST(request())).status).toBe(200);
  expect(writes[0]?.[4]).toBeNull();
});
