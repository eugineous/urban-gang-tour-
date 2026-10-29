import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPesapalAdapter } from '@/lib/server/pesapal';

vi.mock('server-only', () => ({}));

const env = {
  PESAPAL_ENV: 'sandbox',
  PESAPAL_CONSUMER_KEY: 'fixture-consumer-key',
  PESAPAL_CONSUMER_SECRET: 'fixture-consumer-secret',
  PESAPAL_NOTIFICATION_ID: '84740ab4-3cd9-47da-8a4f-dd1db53494b5',
  PESAPAL_CALLBACK_URL: 'https://merchant.example.invalid/payment-return',
  PESAPAL_IPN_URL: 'https://merchant.example.invalid/payment-notification',
};
const trackingId = 'b945e4af-80a5-4ec1-8706-e03f8332fb04';
const notification = {
  OrderTrackingId: trackingId,
  OrderMerchantReference: 'ORDER-REFERENCE-123',
  OrderNotificationType: 'IPNCHANGE',
};
const binding = {
  orderId: 'ORD-LEDGER-123',
  merchantReference: 'ORDER-REFERENCE-123',
  orderTrackingId: trackingId,
  amountKes: 1200,
  currency: 'KES' as const,
  status: 'pending' as const,
};
const token = {
  token: 'fixture-access-token',
  expiryDate: '2026-10-28T12:05:00.000Z',
  error: null,
  status: '200',
  message: 'Request processed successfully',
};
const completed = {
  payment_method: 'Visa',
  amount: 1200,
  created_date: '2026-10-28T12:00:00.000',
  confirmation_code: '6513008693186320103009',
  payment_status_description: 'Completed',
  description: 'Payment completed',
  message: 'Request processed successfully',
  payment_account: '476173**0010',
  call_back_url: env.PESAPAL_CALLBACK_URL,
  status_code: 1,
  merchant_reference: 'ORDER-REFERENCE-123',
  payment_status_code: '',
  currency: 'KES',
  error: { error_type: null, code: null, message: null, call_back_url: null },
  status: '200',
};

const http = vi.fn<typeof fetch>();
let now = Date.parse('2026-10-28T12:00:00.000Z');
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json' },
});

async function makeAdapter(configuration = env) {
  return createPesapalAdapter({ env: configuration, fetch: http, now: () => now });
}

beforeEach(() => {
  http.mockReset();
  now = Date.parse('2026-10-28T12:00:00.000Z');
  http.mockImplementation(async (url) => String(url).endsWith('/Auth/RequestToken')
    ? json(token) : json(completed));
});

describe('Pesapal authenticated verification adapter (no settlement)', () => {
  it('does not contact the provider when configuration is absent', async () => {
    const adapter = await makeAdapter({} as typeof env);
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'not_configured' });
    expect(http).not.toHaveBeenCalled();
  });

  it('authenticates against the fixed sandbox API and returns only bound payment evidence', async () => {
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({
      ok: true,
      outcome: 'completed',
      evidence: {
        orderId: 'ORD-LEDGER-123',
        merchantReference: 'ORDER-REFERENCE-123',
        orderTrackingId: trackingId,
        amountKes: 1200,
        currency: 'KES',
        confirmationCode: '6513008693186320103009',
      },
    });
    expect(http.mock.calls[0][0]).toBe('https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken');
    expect(JSON.parse(String(http.mock.calls[0][1]?.body))).toEqual({
      consumer_key: 'fixture-consumer-key', consumer_secret: 'fixture-consumer-secret',
    });
    expect(http.mock.calls[1][0]).toBe(`https://cybqa.pesapal.com/pesapalv3/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`);
    expect(http.mock.calls[1][1]).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer fixture-access-token', Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    for (const [, options] of http.mock.calls) {
      expect(options).toMatchObject({ cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal) });
    }
  });

  it('selects the fixed live endpoint only for explicit production configuration', async () => {
    const adapter = await makeAdapter({ ...env, PESAPAL_ENV: 'production' });
    expect((await adapter.verifyNotification(notification, binding)).ok).toBe(true);
    expect(http.mock.calls[0][0]).toBe('https://pay.pesapal.com/v3/api/Auth/RequestToken');
    expect(http.mock.calls[1][0]).toBe(`https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`);
  });

  it('does not query an unbound callback even when its reference looks valid', async () => {
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, null)).toEqual({ ok: false, reason: 'unbound_notification' });
    expect(http).not.toHaveBeenCalled();
  });

  it.each([
    { ...notification, OrderTrackingId: 'a945e4af-80a5-4ec1-8706-e03f8332fb04' },
    { ...notification, OrderMerchantReference: 'OTHER-ORDER' },
  ])('rejects callback references that do not match the separately stored binding', async payload => {
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(payload, binding)).toEqual({ ok: false, reason: 'unbound_notification' });
    expect(http).not.toHaveBeenCalled();
  });

  it.each([
    { ...notification, status: 'COMPLETED' },
    { ...notification, OrderTrackingId: 'https://untrusted.example.invalid/payment' },
    { ...notification, OrderMerchantReference: 'invalid/reference' },
    { ...notification, OrderNotificationType: 'FORGED' },
    null,
  ])('rejects forged or malformed notification fields before provider access', async payload => {
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(payload, binding)).toEqual({ ok: false, reason: 'invalid_notification' });
    expect(http).not.toHaveBeenCalled();
  });

  it.each(['paid', 'fulfilled', 'refunded', 'declined'] as const)('ignores a duplicate or terminal %s binding', async status => {
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, { ...binding, status })).toEqual({ ok: false, reason: 'not_recoverable' });
    expect(http).not.toHaveBeenCalled();
  });

  it.each([
    { amount: 1199 }, { amount: 1200.01 }, { amount: null },
    { currency: 'USD' }, { currency: null },
    { merchant_reference: 'OTHER-ORDER' }, { merchant_reference: null },
  ])('rejects authenticated amount, currency or reference mismatches', async patch => {
    http.mockResolvedValueOnce(json(token)).mockResolvedValueOnce(json({ ...completed, ...patch }));
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'binding_mismatch' });
  });

  it.each([
    { status_code: 0, payment_status_description: 'INVALID' },
    { status_code: 4, payment_status_description: 'PENDING' },
    { status_code: 1, payment_status_description: 'PENDING' },
    { status_code: '1', payment_status_description: 'COMPLETED' },
  ])('keeps incomplete or conflicting provider outcomes uncertain', async patch => {
    http.mockResolvedValueOnce(json(token)).mockResolvedValueOnce(json({ ...completed, ...patch }));
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'provider_uncertain' });
  });

  it.each([
    { status_code: 2, payment_status_description: 'Failed', outcome: 'failed' },
    { status_code: 3, payment_status_description: 'Reversed', outcome: 'reversed' },
  ])('distinguishes an authenticated $outcome outcome from completed payment', async ({ outcome, ...patch }) => {
    http.mockResolvedValueOnce(json(token)).mockResolvedValueOnce(json({ ...completed, ...patch }));
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toMatchObject({ ok: true, outcome });
  });

  it.each(['', '<script>alert(1)</script>', null])('does not return completed evidence without a safe confirmation code', async confirmation_code => {
    http.mockResolvedValueOnce(json(token)).mockResolvedValueOnce(json({ ...completed, confirmation_code }));
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'provider_uncertain' });
  });

  it('reuses an unexpired token but refreshes before its documented expiry', async () => {
    const adapter = await makeAdapter();
    await adapter.verifyNotification(notification, binding);
    await adapter.verifyNotification(notification, binding);
    expect(http.mock.calls.filter(([url]) => String(url).endsWith('/Auth/RequestToken'))).toHaveLength(1);
    now = Date.parse('2026-10-28T12:04:45.000Z');
    http.mockResolvedValueOnce(json({ ...token, token: 'fixture-fresh-token', expiryDate: '2026-10-28T12:09:45.000Z' }));
    expect((await adapter.verifyNotification(notification, binding)).ok).toBe(true);
    expect(http.mock.calls.filter(([url]) => String(url).endsWith('/Auth/RequestToken'))).toHaveLength(2);
    expect(http.mock.calls.at(-1)?.[1]?.headers).toMatchObject({ Authorization: 'Bearer fixture-fresh-token' });
  });

  it.each(['2026-10-28T11:59:59.000Z', 'invalid', '2026-10-28T12:05:00', null])('rejects expired or ambiguous token expiry %s', async expiryDate => {
    http.mockResolvedValueOnce(json({ ...token, expiryDate }));
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'authentication_failed' });
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('never caches a token beyond the documented five minute maximum', async () => {
    http.mockResolvedValueOnce(json({ ...token, expiryDate: '2026-10-29T12:00:00.000Z' }));
    const adapter = await makeAdapter();
    await adapter.verifyNotification(notification, binding);
    now = Date.parse('2026-10-28T12:05:01.000Z');
    http.mockResolvedValueOnce(json({ ...token, expiryDate: '2026-10-28T12:10:01.000Z' }));
    expect((await adapter.verifyNotification(notification, binding)).ok).toBe(true);
    expect(http.mock.calls.filter(([url]) => String(url).endsWith('/Auth/RequestToken'))).toHaveLength(2);
  });

  it('drops a rejected token and authenticates afresh on the next verification without retrying blindly', async () => {
    http.mockResolvedValueOnce(json(token)).mockResolvedValueOnce(json({}, 401));
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'provider_unavailable' });
    expect(http).toHaveBeenCalledTimes(2);
    expect((await adapter.verifyNotification(notification, binding)).ok).toBe(true);
    expect(http.mock.calls.filter(([url]) => String(url).endsWith('/Auth/RequestToken'))).toHaveLength(2);
  });

  it('coalesces concurrent authentication while leaving settlement to a durable caller', async () => {
    const adapter = await makeAdapter();
    const results = await Promise.all([
      adapter.verifyNotification(notification, binding), adapter.verifyNotification(notification, binding),
    ]);
    expect(results.every(result => result.ok)).toBe(true);
    expect(http.mock.calls.filter(([url]) => String(url).endsWith('/Auth/RequestToken'))).toHaveLength(1);
  });

  it.each([
    () => json({}, 503),
    () => new Response('not-json', { status: 200 }),
    () => json({ ...completed, error: { code: 'provider-failure' } }),
    () => json({ ...completed, status: '500' }),
  ])('returns uncertainty for provider/network/protocol failures', async response => {
    http.mockResolvedValueOnce(json(token)).mockResolvedValueOnce(response());
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'provider_unavailable' });
  });

  it('does not expose credentials, tokens or private provider data on transport failure', async () => {
    http.mockRejectedValueOnce(new Error('fixture-consumer-secret fixture-access-token 476173**0010'));
    const adapter = await makeAdapter();
    expect(await adapter.verifyNotification(notification, binding)).toEqual({ ok: false, reason: 'authentication_failed' });
  });
});
