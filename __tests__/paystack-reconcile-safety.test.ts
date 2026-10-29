import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  q: vi.fn(), verify: vi.fn(), mpesa: vi.fn(), tickets: vi.fn(async () => []),
  inventory: vi.fn(async () => {}), receipt: vi.fn(async () => {}), consume: vi.fn(async () => {}), release: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/db', () => ({ hasDb: () => true, q: state.q }));
vi.mock('@/lib/server/paystack', () => ({ paystackConfigured: () => true, paystackVerify: state.verify }));
vi.mock('@/lib/server/mpesa', () => ({ stkPushQuery: state.mpesa }));
vi.mock('@/lib/server/tickets', () => ({ ensureTickets: state.tickets }));
vi.mock('@/lib/server/inventory', () => ({ recordPaidMerchOrder: state.inventory }));
vi.mock('@/lib/server/receipt-email', () => ({ sendReceiptEmail: state.receipt }));
vi.mock('@/lib/server/ticket-inventory', () => ({ consumeReservation: state.consume, releaseReservation: state.release }));
import { reconcileStuckOrders } from '@/lib/server/reconcile';

const order = { id: 'ORD-SAFE123', total: 1200, status: 'pending', pay_method: 'card', paystack_ref: 'ORD-SAFE123', mpesa_ref: null, email: 'buyer@example.invalid' };
const verified = { ok: true, paid: true, reference: order.paystack_ref, currency: 'KES', status: 'success', amountKes: 1200, amountSubunit: 120000 };
beforeEach(() => {
  vi.clearAllMocks(); state.verify.mockResolvedValue(verified);
  state.q.mockImplementation(async (sql: string) => sql.startsWith('SELECT') ? [order] : sql.includes("status='paid'") ? [{ ...order, status: 'paid' }] : []);
});

describe('Paystack reconciliation settlement predicate', () => {
  it('checks reference, card method and amount again in the durable paid transition', async () => {
    expect((await reconcileStuckOrders()).paid).toEqual([order.id]);
    const [sql, params] = state.q.mock.calls.find(([sql]) => sql.includes("status='paid'"))!;
    expect(sql).toContain("pay_method='card'"); expect(sql).toContain('paystack_ref=$3'); expect(sql).toContain('total=$4');
    expect(params).toEqual([order.id, ['pending', 'unknown', 'reconciling'], order.paystack_ref, 1200]);
    expect(state.inventory).toHaveBeenCalledTimes(1); expect(state.tickets).toHaveBeenCalledTimes(1); expect(state.receipt).toHaveBeenCalledTimes(1);
  });
  it.each(['mpesa', 'stripe', null])('does not verify a stored reference for method %s', async method => {
    state.q.mockResolvedValue([{ ...order, pay_method: method }]);
    expect((await reconcileStuckOrders()).skipped).toEqual([order.id]); expect(state.verify).not.toHaveBeenCalled(); expect(state.tickets).not.toHaveBeenCalled();
  });
  it.each([
    { reference: 'ORD-OTHER123' }, { reference: undefined }, { currency: 'USD' }, { currency: undefined },
    { status: 'pending' }, { status: undefined }, { amountSubunit: undefined }, { amountSubunit: 119999 }, { amountKes: 1199 },
  ])('does not settle malformed or mismatched verification %j', async changes => {
    state.verify.mockResolvedValue({ ...verified, ...changes });
    const result = await reconcileStuckOrders(); expect(result.paid).toEqual([]); expect(result.stillPending).toEqual([order.id]);
    expect(state.q.mock.calls.some(([sql]) => sql.includes("status='paid'"))).toBe(false);
    expect(state.tickets).not.toHaveBeenCalled(); expect(state.receipt).not.toHaveBeenCalled(); expect(state.release).not.toHaveBeenCalled();
  });
  it('does not reopen a concurrent terminal row when flagging an amount mismatch', async () => {
    state.verify.mockResolvedValue({ ...verified, amountKes: 1199, amountSubunit: 119900 });
    await reconcileStuckOrders();
    const [sql, params] = state.q.mock.calls.find(([sql]) => sql.includes("status='reconciling'"))!;
    expect(sql).toContain('status = ANY($2)'); expect(sql).toContain("pay_method='card'"); expect(sql).toContain('paystack_ref=$3'); expect(sql).toContain('total=$4');
    expect(params).toEqual([order.id, ['pending', 'unknown', 'reconciling'], order.paystack_ref, 1200]);
  });
  it('does not fulfil an order another callback settled first', async () => {
    state.q.mockImplementation(async (sql: string) => sql.startsWith('SELECT') ? [order] : []);
    expect((await reconcileStuckOrders()).paid).toEqual([]); expect(state.tickets).not.toHaveBeenCalled(); expect(state.receipt).not.toHaveBeenCalled();
  });
});
