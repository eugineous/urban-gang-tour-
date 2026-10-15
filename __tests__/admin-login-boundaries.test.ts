import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ account: vi.fn(), password: vi.fn(async () => null), fetch: vi.fn() }));
vi.mock('next/server', async original => ({ ...await original<typeof import('next/server')>(), after: () => {} }));
vi.mock('@/lib/server/db', () => ({ hasDb: () => true }));
vi.mock('@/lib/server/admin-accounts', () => ({ getAdminAccount: state.account, findAdminAccount: vi.fn() }));
vi.mock('@/lib/server/admin-password', () => ({ adminPasswordHash: state.password }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => 'fixture' }));
vi.mock('@/lib/server/notify', () => ({ notifyAdminLogin: vi.fn(), notifyFailedAdminLogin: vi.fn() }));
import { POST as passwordLogin } from '@/app/api/admin/login/route';
import { POST as googleLogin } from '@/app/api/admin/google/route';
const req = (body: string) => new Request('https://urbangangtour.co.ke/api/admin/login', { method: 'POST', headers: { origin: 'https://urbangangtour.co.ke' }, body });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', 'fixture-only-signing-key');
  vi.stubEnv('ADMIN_ACCESS_CODE', 'fixture-only-emergency-password');
  vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'fixture-client');
  vi.stubEnv('ADMIN_GOOGLE_EMAILS', 'owner@example.test');
  vi.stubGlobal('fetch', state.fetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('administrator sign-in boundaries', () => {
  it.each(['null', '[]', '42', '{'])('rejects malformed JSON %s without provider work', async body => {
    expect((await passwordLogin(req(body))).status).toBe(400);
    expect((await googleLogin(req(body))).status).toBe(400);
    expect(state.password).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it('rejects oversized credentials before provider or password lookup', async () => {
    expect((await passwordLogin(req(JSON.stringify({ password: 'x'.repeat(9000) })))).status).toBe(413);
    expect((await googleLogin(req(JSON.stringify({ credential: 'x'.repeat(9000) })))).status).toBe(413);
    expect(state.password).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it('does not promote an environment-allowlisted crew account when its directory is unavailable', async () => {
    state.fetch.mockResolvedValue(new Response(JSON.stringify({ aud: 'fixture-client', iss: 'https://accounts.google.com', exp: Math.floor(Date.now() / 1000) + 600, email: 'owner@example.test', email_verified: true })));
    state.account.mockRejectedValue(new Error('fixture database outage'));
    const response = await googleLogin(req(JSON.stringify({ credential: 'x'.repeat(20) })));
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
  it.each([null, { exp: 'not-a-number' }])('rejects malformed verification output', async info => {
    state.fetch.mockResolvedValue(new Response(JSON.stringify(info)));
    expect((await googleLogin(req(JSON.stringify({ credential: 'x'.repeat(20) })))).status).toBe(401);
    expect(state.account).not.toHaveBeenCalled();
  });
  it('keeps the owner emergency login working', async () => {
    const response = await passwordLogin(req(JSON.stringify({ password: 'fixture-only-emergency-password' })));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toMatch(/ugt_admin=.*HttpOnly; Secure; SameSite=Lax/);
  });
});
