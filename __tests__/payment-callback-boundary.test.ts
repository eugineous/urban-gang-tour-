import { describe, expect, it, vi } from 'vitest';

const q = vi.hoisted(() => vi.fn(async () => []));

vi.mock('@/lib/server/db', () => ({ hasDb: () => true, q }));
vi.mock('@/lib/server/alert', () => ({ alertCritical: vi.fn(async () => {}) }));
vi.mock('@/lib/server/receipt-email', () => ({ sendReceiptEmail: vi.fn(async () => {}) }));
vi.mock('@/lib/server/tickets', () => ({ ensureTickets: vi.fn(async () => []) }));
vi.mock('@/lib/server/notify', () => ({
  notifyPaymentSuccess: vi.fn(async () => {}),
  notifyPaymentFailure: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/inventory', () => ({ recordPaidMerchOrder: vi.fn(async () => {}) }));
vi.mock('@/lib/server/ticket-inventory', () => ({
  consumeReservation: vi.fn(async () => {}),
  releaseReservation: vi.fn(async () => {}),
}));

import { POST } from '@/app/api/mpesa/callback/route';

function callback(resultCode: number, items: unknown[] = []): Request {
  return new Request('http://localhost/api/mpesa/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      Body: {
        stkCallback: {
          CheckoutRequestID: 'ws_CO_123',
          ResultCode: resultCode,
          ResultDesc: 'test outcome',
          CallbackMetadata: { Item: items },
        },
      },
    }),
  });
}

describe('M-Pesa callback payment boundary', () => {
  it('binds the exact callback amount and shared recoverable states before marking paid', async () => {
    await POST(callback(0, [
      { Name: 'MpesaReceiptNumber', Value: 'RCP123' },
      { Name: 'Amount', Value: 1200 },
    ]));

    expect(q).toHaveBeenCalledTimes(1);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain("UPDATE orders SET status='paid'");
    expect(sql).toContain('status = ANY($3)');
    expect(sql).toContain('total=$4');
    expect(params).toEqual([
      'ws_CO_123',
      'RCP123',
      ['pending', 'unknown', 'reconciling'],
      1200,
    ]);
  });

  it('uses the same recoverable boundary for a provider-declared failure', async () => {
    q.mockClear();

    await POST(callback(1032));

    expect(q).toHaveBeenCalledTimes(1);
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain("UPDATE orders SET status='failed'");
    expect(sql).toContain('status = ANY($2)');
    expect(params).toEqual(['ws_CO_123', ['pending', 'unknown', 'reconciling']]);
  });
});
