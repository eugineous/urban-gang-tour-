import { describe, expect, it } from 'vitest';
import { hasPerm, isAdmin, isSuperAdmin, signToken } from '@/lib/server/session';

function adminRequest(payload: object): Request {
  return new Request('http://localhost/api/admin/example', {
    headers: { cookie: `ugt_admin=${signToken(payload)}` },
  });
}

describe('signed admin scope contract', () => {
  it('keeps a crew admin within its assigned module despite its signed permission', () => {
    const request = adminRequest({
      role: 'admin',
      scope: 'crew_admin',
      perms: ['marketplace'],
    });

    expect(isAdmin(request)).toBe(true);
    expect(hasPerm(request, 'marketplace')).toBe(true);
    expect(isSuperAdmin(request)).toBe(false);
  });

  it('recognises an explicit super-admin session as fully authorised', () => {
    const request = adminRequest({ role: 'admin', scope: 'super_admin', perms: [] });

    expect(isAdmin(request)).toBe(true);
    expect(hasPerm(request, 'marketplace')).toBe(true);
    expect(isSuperAdmin(request)).toBe(true);
  });
});
