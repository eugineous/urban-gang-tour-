import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ available: true, find: vi.fn() }));
vi.mock('@/lib/server/db', () => ({ hasDb: () => state.available, q: async () => [] }));
vi.mock('@/lib/server/admin-accounts', () => ({ findAdminAccount: state.find }));
import { hasPerm, isAdmin, isSuperAdmin, signToken, verifyAdminSession } from '@/lib/server/session';
const email = 'crew@example.test';
function request(payload: object = {}) {
  return new Request('https://urbangangtour.co.ke/api/admin/ops', { headers: { cookie: 'ugt_admin=' + signToken({ role: 'admin', email, scope: 'super_admin', authSource: 'google_db', ...payload }) } });
}
beforeEach(() => { state.available = true; state.find.mockReset(); vi.stubEnv('SESSION_SECRET', 'fixture-only-signing-key'); vi.stubEnv('ADMIN_GOOGLE_EMAILS', email); });
afterEach(() => vi.unstubAllEnvs());
describe('current administrator authority', () => {
  it('rejects deleted DB admins without falling back to the environment allowlist', async () => {
    state.find.mockResolvedValue(null);
    const req = request();
    expect(await verifyAdminSession(req)).toBe(false);
    expect(isAdmin(req)).toBe(false);
  });
  it('uses present permissions instead of a previously privileged cookie', async () => {
    state.find.mockResolvedValue({ email, role: 'crew_admin', perms: ['gallery'] });
    const req = request({ perms: ['orders'] });
    expect(await verifyAdminSession(req)).toBe(true);
    expect(isSuperAdmin(req)).toBe(false);
    expect(hasPerm(req, 'orders')).toBe(false);
    expect(hasPerm(req, 'gallery')).toBe(true);
  });
  it('rejects when current authority is unavailable', async () => {
    state.find.mockRejectedValue(new Error('fixture outage'));
    expect(await verifyAdminSession(request())).toBe(false);
    state.available = false;
    expect(await verifyAdminSession(request())).toBe(false);
  });
  it('does not authorize Google cookies on a route that forgot current verification', () => {
    expect(isAdmin(request())).toBe(false);
    expect(hasPerm(request(), 'orders')).toBe(false);
  });
  it('takes environment owner removal into account on the next request', async () => {
    expect(await verifyAdminSession(request({ authSource: 'google_env' }))).toBe(true);
    vi.stubEnv('ADMIN_GOOGLE_EMAILS', '');
    expect(await verifyAdminSession(request({ authSource: 'google_env' }))).toBe(false);
  });
  it('retains the signed owner emergency login', async () => {
    const req = new Request('https://urbangangtour.co.ke/api/admin/ops', { headers: { cookie: 'ugt_admin=' + signToken({ role: 'admin', scope: 'super_admin', authSource: 'access_code' }) } });
    expect(await verifyAdminSession(req)).toBe(true);
    expect(isSuperAdmin(req)).toBe(true);
  });
});
