import { expect, it, vi } from 'vitest';
const query = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/db', () => ({ q: query, db: () => true }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => 'test' }));
vi.mock('@/lib/server/origin', () => ({ sameOrigin: () => true }));
import { POST } from '@/app/api/auth/route';
it.each([
  [{}, 'age_confirmation_required'],
  [{ adultConfirmed: false, termsAccepted: true }, 'age_confirmation_required'],
  [{ adultConfirmed: 'true', termsAccepted: true }, 'age_confirmation_required'],
  [{ adultConfirmed: true, termsAccepted: false }, 'terms_required'],
])('rejects signup without valid confirmations before querying account data', async (confirmation, error) => {
  query.mockClear();
  const response = await POST(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', email: 'test@example.com', password: 'test-password', ...confirmation }) }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error });
  expect(query).not.toHaveBeenCalled();
});
it('allows existing logins without new signup confirmations', async () => {
  query.mockResolvedValueOnce([]);
  const response = await POST(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: 'test@example.com', password: 'test-password' }) }));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: 'wrong_credentials' });
});

import { POST as organizerSignup } from '@/app/api/organizer/signup/route';
it.each([
  [{}, 'age_confirmation_required'],
  [{ adultConfirmed: 'true', termsAccepted: true }, 'age_confirmation_required'],
  [{ adultConfirmed: true }, 'terms_required'],
])('rejects organizer applications without adult/terms confirmation before any write', async (confirmation, error) => {
  query.mockClear();
  const response = await organizerSignup(new Request('http://localhost/api/organizer/signup', { method: 'POST', body: JSON.stringify(confirmation) }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error });
  expect(query).not.toHaveBeenCalled();
});
