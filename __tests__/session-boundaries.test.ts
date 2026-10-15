import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentUser, isAdmin, signToken, verifyToken } from '@/lib/server/session';
import { signOrganizerToken, verifyOrganizerToken } from '@/lib/server/organizer-session';

const signingKey = 'fixture-only-session-signing-key';
function signed(payload: unknown, organizer = false) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + createHmac('sha256', signingKey).update((organizer ? 'org:' : '') + body).digest('base64url');
}
beforeEach(() => vi.stubEnv('SESSION_SECRET', signingKey));
afterEach(() => vi.unstubAllEnvs());

describe('session envelope boundaries', () => {
  it.each([undefined, null, 0, -1, '9999999999999', true, 1.5])('rejects missing or invalid expiry %s', exp => {
    expect(verifyToken(signed({ id: 1, exp }))).toBeNull();
    expect(verifyOrganizerToken(signed({ ctx: 'org', id: 'org-1', email: 'crew@example.test', businessName: 'Crew', exp }, true))).toBeNull();
  });
  it('expires at the boundary, not one millisecond later', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    try {
      expect(verifyToken(signed({ exp: 1_000 }))).toBeNull();
      expect(verifyOrganizerToken(signed({ ctx: 'org', exp: 1_000 }, true))).toBeNull();
    } finally { vi.restoreAllMocks(); }
  });
  it('rejects non-object envelopes and oversized tokens', () => {
    for (const payload of [null, [], 'text', 42]) expect(verifyToken(signed(payload))).toBeNull();
    expect(verifyToken(signed({ exp: Date.now() + 60_000, padding: 'a'.repeat(20_000) }))).toBeNull();
  });
  it('rejects non-ASCII signatures without throwing', () => {
    const body = signToken({ id: 1 }).split('.')[0];
    expect(() => verifyToken(body + '.' + 'é'.repeat(43))).not.toThrow();
    expect(verifyToken(body + '.' + 'é'.repeat(43))).toBeNull();
    expect(() => verifyOrganizerToken(body + '.' + 'é'.repeat(43))).not.toThrow();
  });
  it('keeps valid buyer, booking and organizer envelopes working', () => {
    expect(verifyToken<{ id: number }>(signToken({ id: 1 }))?.id).toBe(1);
    expect(verifyToken<{ scope: string }>(signToken({ scope: 'booking_status', bookingId: 'BOOK-TEST' }))?.scope).toBe('booking_status');
    expect(verifyOrganizerToken(signOrganizerToken({ id: 'org-1', email: 'crew@example.test', businessName: 'Crew', pwdv: 2 }))?.pwdv).toBe(2);
    expect(verifyOrganizerToken(signOrganizerToken({ id: 'org-2', email: 'crew@example.test', businessName: '' }))?.id).toBe('org-2');
  });
});

describe('identity type boundaries', () => {
  const request = (name: string, payload: object) => new Request('https://urbangangtour.co.ke/api/account', { headers: { cookie: `${name}=${signToken(payload)}` } });
  it.each([
    { id: 1, email: 'buyer@example.test', role: 'admin' },
    { id: 1, email: 'buyer@example.test', scope: 'booking_status' },
    { id: 0, email: 'buyer@example.test' },
    { id: '1', email: 'buyer@example.test' },
    { id: 1, email: null },
  ])('rejects a non-buyer claim in a buyer cookie', payload => expect(currentUser(request('ugt_user', payload))).toBeNull());
  it('accepts existing buyer sessions and rejects malformed administrator scope', () => {
    expect(currentUser(request('ugt_user', { id: 1, email: 'buyer@example.test', sessionVersion: 2 }))?.id).toBe(1);
    expect(currentUser(request('ugt_user', { id: 1, email: 'buyer@example.test', name: null }))?.id).toBe(1);
    expect(isAdmin(request('ugt_admin', { role: 'admin', scope: 'unexpected' }))).toBe(false);
    expect(isAdmin(request('ugt_admin', { role: 'admin', scope: 'crew_admin', perms: 'all' }))).toBe(false);
  });
  it('preserves Kenyan phone-only accounts without inventing an email', () => {
    expect(currentUser(request('ugt_user', { id: 2, email: null, phone: '0712345678', sessionVersion: 0 }))?.id).toBe(2);
    expect(currentUser(request('ugt_user', { id: 3, email: null, phone: '+254712345678' }))?.id).toBe(3);
    expect(currentUser(request('ugt_user', { id: 4, email: null, phone: 'not-a-phone' }))).toBeNull();
  });
  it.each([{ id: '', email: 'crew@example.test', businessName: 'Crew' }, { id: 'org-1', email: null, businessName: 'Crew' }, { id: 'org-1', email: 'crew@example.test', businessName: 'Crew', pwdv: -1 }])('rejects malformed organizer identity', identity => {
    expect(verifyOrganizerToken(signed({ ...identity, ctx: 'org', exp: Date.now() + 60_000 }, true))).toBeNull();
  });
});
