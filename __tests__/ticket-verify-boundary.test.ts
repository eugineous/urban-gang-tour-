import { describe, expect, it, vi } from 'vitest';

const q = vi.hoisted(() => vi.fn(async () => []));

vi.mock('@/lib/server/session', () => ({
  verifyAdminSession: vi.fn(async () => true),
  hasPerm: vi.fn(() => true),
  isAdmin: vi.fn(() => true),
}));
vi.mock('@/lib/server/origin', () => ({ requireOrigin: vi.fn(() => true) }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: vi.fn(() => true), clientIp: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/server/db', () => ({ db: () => ({}), q }));
vi.mock('@/lib/server/tickets', () => ({
  codeAuthentic: vi.fn(() => false),
  getTicket: vi.fn(async () => null),
  getEventName: vi.fn(async () => ''),
  getEventMeta: vi.fn(async () => undefined),
}));
vi.mock('@/lib/server/notify', () => ({ notifyTicketScan: vi.fn(async () => {}) }));

import { POST } from '@/app/api/tickets/verify/route';

describe('online ticket validation boundary', () => {
  it('rejects malformed QR data without attempting a ticket-consumption update', async () => {
    q.mockClear();
    const response = await POST(new Request('http://localhost/api/tickets/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ code: 'not-a-ticket' }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: 'invalid', reason: 'bad_code' });
    expect(q.mock.calls.some(([sql]) => String(sql).includes('UPDATE tickets SET used_at'))).toBe(false);
  });
});
