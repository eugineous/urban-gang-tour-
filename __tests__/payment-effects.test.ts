import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({ q: vi.fn(), qSchema: vi.fn(), hasDb: vi.fn() }));
vi.mock('@/lib/server/db', () => database);
import { processPaymentEffects, settlePaystackOrder, settleMpesaOrder, settleStripeOrder } from '@/lib/server/payment-effects';

const input = { orderId: 'ORD-EFFECT123', reference: 'ORD-EFFECT123', amountKes: 1000 };
beforeEach(() => {
  vi.clearAllMocks();
  database.hasDb.mockReturnValue(true);
  database.qSchema.mockResolvedValue(undefined);
  database.q.mockResolvedValue([]);
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('network forbidden in payment effect tests'); }));
});
afterEach(() => vi.unstubAllGlobals());

describe('durable settlement transition boundary', () => {
  it.each([
    { orderId: '<untrusted>' }, { checkoutRequestId: 'unsafe/reference' }, { amountKes: 0 }, { amountKes: 1.5 }, { receipt: '<unsafe>' },
  ])('rejects unsafe M-Pesa settlement before storage: %j', async change => {
    await expect(settleMpesaOrder({ orderId: input.orderId, checkoutRequestId: 'ws_CO_fixture', amountKes: 1000, ...change })).rejects.toThrow('invalid_mpesa_settlement');
    expect(database.q).not.toHaveBeenCalled();
  });
  it.each([
    { orderId: '<untrusted>' }, { sessionId: 'cs_unsafe<script>' }, { paymentIntentId: '' }, { amountKes: 0 }, { amountKes: 1.5 },
  ])('rejects unsafe Stripe settlement before storage: %j', async change => {
    await expect(settleStripeOrder({ orderId: input.orderId, sessionId: 'cs_fixture', paymentIntentId: 'pi_fixture', amountKes: 1000, ...change })).rejects.toThrow('invalid_stripe_settlement');
    expect(database.q).not.toHaveBeenCalled();
  });
  it.each([
    { orderId: '' }, { orderId: '<untrusted>' }, { reference: '' }, { reference: 'bad/reference' },
    { amountKes: 0 }, { amountKes: -1 }, { amountKes: 1000.01 }, { amountKes: Number.NaN },
    { amountKes: Number.MAX_SAFE_INTEGER },
  ])('rejects malformed settlement input before any database work: %j', async change => {
    await expect(settlePaystackOrder({ ...input, ...change })).rejects.toThrow('invalid_paystack_settlement');
    expect(database.q).not.toHaveBeenCalled();
    expect(database.qSchema).not.toHaveBeenCalled();
  });

  it('refuses settlement when durable storage is not configured', async () => {
    database.hasDb.mockReturnValue(false);
    await expect(settlePaystackOrder(input)).rejects.toThrow('db_not_configured');
    expect(database.q).not.toHaveBeenCalled();
  });

  it('returns only a newly transitioned paid order without sending messages', async () => {
    database.q.mockResolvedValue([{ id: input.orderId, status: 'paid', total: 1000 }]);
    expect(await settlePaystackOrder(input)).toEqual({ id: input.orderId, status: 'paid', total: 1000 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null when the guarded transition does not match', async () => {
    expect(await settlePaystackOrder(input)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('can retry a failed schema initialization instead of caching the rejection', async () => {
    vi.resetModules();
    const cold = await import('@/lib/server/payment-effects');
    database.qSchema.mockRejectedValueOnce(Error('fixture unavailable'));
    await expect(cold.ensurePaymentEffectsSchema()).rejects.toThrow('database_unavailable');
    await expect(cold.ensurePaymentEffectsSchema()).resolves.toBeUndefined();
    expect(database.qSchema).toHaveBeenCalledTimes(2);
  });

  it('normalizes settlement storage failures without exposing database details', async () => {
    database.q.mockRejectedValueOnce(Error('private connection information'));
    await expect(settlePaystackOrder(input)).rejects.toThrow('database_unavailable');
  });

  it('propagates worker storage failures so the cron cannot acknowledge success', async () => {
    database.q.mockRejectedValueOnce(Error('private connection information'));
    await expect(processPaymentEffects()).rejects.toThrow('database_unavailable');
  });
});
