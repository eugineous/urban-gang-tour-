import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  owner: true, perm: true, auth: true,
  q: vi.fn(), trash: vi.fn(), ping: vi.fn(), path: vi.fn(), invalidate: vi.fn(),
  background: [] as Array<() => unknown>,
}));
vi.mock('@/lib/server/db', () => ({ hasDb: () => true, q: state.q }));
vi.mock('@/lib/server/session', () => ({ verifyAdminSession: async () => state.auth, hasPerm: () => state.perm, isAdmin: () => true, isSuperAdmin: () => state.owner, adminActor: () => 'writer@example.test' }));
vi.mock('@/lib/server/content-workflow', () => ({ ensureContentWorkflowSchema: async () => {} }));
vi.mock('@/lib/server/story-workspace', () => ({ trashStory: state.trash }));
vi.mock('@/lib/server/content-automation', () => ({ ensureContentAutomationSchema: async () => {}, contentAutomationReady: () => false, dispatchArticleAnnouncement: vi.fn() }));
vi.mock('@/lib/server/notify', () => ({ notifyPostPublished: vi.fn() }));
vi.mock('@/lib/server/indexnow', () => ({ pingIndexNow: state.ping }));
vi.mock('@/lib/server/microcache', () => ({ invalidate: state.invalidate }));
vi.mock('next/cache', () => ({ revalidatePath: state.path, revalidateTag: vi.fn() }));
vi.mock('next/server', async original => ({ ...await original<object>(), after: (fn: () => unknown) => { state.background.push(fn); } }));
import { POST } from '@/app/api/admin/save/route';
import { PUBLIC_POST_PREDICATE } from '@/lib/server/editorial-publication';

const version = '2026-10-23 00:00:00.123456+00';
const req = (origin = 'https://urbangangtour.co.ke') => new Request('https://urbangangtour.co.ke/api/admin/save', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ kind: 'deletePost', data: { slug: 'sample-story', expectedVersion: version } }),
});
const flush = async () => { for (const task of state.background) await task(); };
beforeEach(() => {
  vi.clearAllMocks(); state.owner = true; state.perm = true; state.auth = true; state.background.length = 0;
  state.q.mockReset().mockResolvedValue([{ published: false, submitted_by: 'writer@example.test', managed: 'false', was_public: false }]);
  state.trash.mockReset().mockResolvedValue([{ slug: 'sample-story' }]);
});

describe('private story deletion indexing boundary', () => {
  it.each([false, true])('does not reveal non-public deletion when published=%s', async published => {
    // true/false covers scheduled future rows as well as plain unpublished drafts.
    state.q.mockResolvedValue([{ published, submitted_by: 'writer@example.test', managed: 'false', was_public: false }]);
    const response = await POST(req());
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ ok: true, recoverable: true });
    await flush(); expect(state.ping).not.toHaveBeenCalled(); expect(state.background).toHaveLength(0);
    expect(state.trash).toHaveBeenCalledWith('sample-story', 'writer@example.test', true, version);
    expect(state.path).toHaveBeenCalledWith('/blog/sample-story');
  });
  it('uses the same SQL visibility predicate as the public feed', async () => {
    await POST(req());
    expect(state.q.mock.calls[0][0]).toContain(`(${PUBLIC_POST_PREDICATE}) AS was_public`);
    expect(state.q.mock.calls[0][0]).toContain("now() AT TIME ZONE 'Africa/Nairobi'");
    expect(state.q.mock.calls[0][1]).toEqual(['sample-story']);
  });
  it('notifies a successfully removed public URL after its recoverable save', async () => {
    state.q.mockResolvedValue([{ published: true, submitted_by: 'writer@example.test', managed: 'false', was_public: true }]);
    expect((await POST(req())).status).toBe(200); expect(state.background).toHaveLength(1);
    expect(state.ping).not.toHaveBeenCalled(); await flush();
    expect(state.ping).toHaveBeenCalledOnce(); expect(state.ping).toHaveBeenCalledWith(['/blog/sample-story', '/blog']);
  });
  it('fails closed when visibility is unavailable rather than assuming published means public', async () => {
    state.q.mockResolvedValue([{ published: true, submitted_by: 'writer@example.test', managed: 'false' }]);
    expect((await POST(req())).status).toBe(200); await flush(); expect(state.ping).not.toHaveBeenCalled();
  });
  it('does not notify on a concurrent trash conflict', async () => {
    state.q.mockResolvedValue([{ published: true, submitted_by: 'writer@example.test', managed: 'false', was_public: true }]);
    state.trash.mockResolvedValue([]);
    expect((await POST(req())).status).toBe(409); await flush(); expect(state.ping).not.toHaveBeenCalled();
    expect(state.invalidate).not.toHaveBeenCalled();
  });
  it('preserves managed-record and crew ownership gates', async () => {
    state.q.mockResolvedValue([{ published: true, submitted_by: 'writer@example.test', managed: 'true', was_public: true }]);
    expect((await POST(req())).status).toBe(409); expect(state.trash).not.toHaveBeenCalled();
    state.owner = false;
    state.q.mockResolvedValue([{ published: false, submitted_by: 'other@example.test', managed: 'false', was_public: false }]);
    expect((await POST(req())).status).toBe(403); await flush(); expect(state.ping).not.toHaveBeenCalled(); expect(state.trash).not.toHaveBeenCalled();
  });
  it('keeps authentication, module permissions and origin before any lookup', async () => {
    state.auth = false; expect((await POST(req())).status).toBe(401);
    state.auth = true; state.perm = false; expect((await POST(req())).status).toBe(403);
    state.perm = true; expect((await POST(req('https://evil.example'))).status).toBe(403);
    expect(state.q).not.toHaveBeenCalled(); expect(state.trash).not.toHaveBeenCalled(); expect(state.ping).not.toHaveBeenCalled();
  });
});
