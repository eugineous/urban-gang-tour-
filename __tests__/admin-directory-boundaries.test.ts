import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ q: vi.fn(), schema: vi.fn(async () => {}) }));
vi.mock('@/lib/server/db', () => ({ hasDb: () => true, q: state.q, qSchema: state.schema }));
import { findAdminAccount, getAdminAccount } from '@/lib/server/admin-accounts';
beforeEach(() => state.q.mockReset());
describe('persisted administrator directory', () => {
  it.each(['unexpected', null, undefined, ''])('does not turn an invalid persisted role %s into super-admin', async role => {
    state.q.mockResolvedValue([{ email: 'crew@example.test', role, perms: [], added_at: '' }]);
    await expect(findAdminAccount('crew@example.test')).rejects.toThrow('invalid_admin_role');
    await expect(getAdminAccount('crew@example.test')).rejects.toThrow('invalid_admin_role');
  });
  it('accepts known migrated owner roles and filters unknown crew permissions', async () => {
    state.q.mockResolvedValue([{ email: 'owner@example.test', role: 'super_admin', perms: [], added_at: '' }]);
    expect(await findAdminAccount('owner@example.test')).toMatchObject({ role: 'super_admin' });
    state.q.mockResolvedValue([{ email: 'crew@example.test', role: 'crew_admin', perms: ['gallery', 'invented', 'gallery'], added_at: '' }]);
    expect(await findAdminAccount('crew@example.test')).toMatchObject({ role: 'crew_admin', perms: ['gallery'] });
  });
});
