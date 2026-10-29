import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  q: vi.fn(), hasDb: vi.fn(), work: [] as (() => Promise<void>)[],
  tickets: vi.fn(async () => []), inventory: vi.fn(async () => {}), consume: vi.fn(async () => {}), release: vi.fn(async () => {}),
  success: vi.fn(async () => {}), failure: vi.fn(async () => {}), receipt: vi.fn(async () => {}), alert: vi.fn(async () => {}),
}));
vi.mock('next/server', async () => ({ ...await vi.importActual<typeof import('next/server')>('next/server'), after: (task: () => Promise<void>) => state.work.push(task) }));
vi.mock('@/lib/server/db', () => ({ hasDb: state.hasDb, db: state.hasDb, q: state.q }));
vi.mock('@/lib/server/alert', () => ({ alertCritical: state.alert }));
vi.mock('@/lib/server/receipt-email', () => ({ sendReceiptEmail: state.receipt }));
vi.mock('@/lib/server/tickets', () => ({ ensureTickets: state.tickets }));
vi.mock('@/lib/server/inventory', () => ({ recordPaidMerchOrder: state.inventory }));
vi.mock('@/lib/server/notify', () => ({ notifyPaymentSuccess: state.success, notifyPaymentFailure: state.failure }));
vi.mock('@/lib/server/ticket-inventory', () => ({ consumeReservation: state.consume, releaseReservation: state.release }));
import { POST } from '@/app/api/paystack/webhook/route';

const ref = 'ORD-SAFE123';
const order = { id: ref, total: 1200, status: 'pending', pay_method: 'card', paystack_ref: ref, email: 'buyer@example.invalid' };
const details = { id: 123, reference: ref, amount: 120000, currency: 'KES', status: 'success', channel: 'card' };
function signed(event = 'charge.success', data: Record<string, unknown> = details) {
  const body = JSON.stringify({ event, data });
  return new Request('https://urbangangtour.co.ke/api/paystack/webhook', { method: 'POST', body,
    headers: { 'x-paystack-signature': crypto.createHmac('sha512', 'fictional-paystack-key').update(body).digest('hex') } });
}
async function finish() { await Promise.all(state.work.map(task => task())); }
beforeEach(() => {
  vi.clearAllMocks(); state.work = [];
  state.alert.mockReset().mockResolvedValue(undefined);
  vi.stubEnv('PAYSTACK_SECRET_KEY', 'fictional-paystack-key');
  state.hasDb.mockReturnValue(true);
  state.q.mockImplementation(async (sql: string) => sql.startsWith('UPDATE orders') ? [{ ...order, status: sql.includes("status='paid'") ? 'paid' : 'failed' }] : []);
});
afterEach(() => vi.unstubAllEnvs());

describe('signed Paystack settlement', () => {
  it('settles only the stored card reference, exact amount and recoverable state', async () => {
    expect((await POST(signed())).status).toBe(200);
    const [sql, params] = state.q.mock.calls.find(([sql]) => sql.startsWith('UPDATE orders'))!;
    expect(sql).toContain("pay_method='card'");
    expect(sql).toMatch(/paystack_ref\s*=\s*\$1/);
    expect(sql).toContain('total=$2');
    expect(params).toEqual([ref, 1200, ['pending', 'unknown', 'reconciling']]);
    await finish(); expect(state.tickets).toHaveBeenCalledTimes(1); expect(state.receipt).toHaveBeenCalledTimes(1);
  });
  it.each([
    { currency: 'USD' }, { currency: undefined }, { reference: '<unsafe>' }, { reference: 123 },
    { amount: '120000' }, { amount: 120000.1 }, { amount: 120001 }, { amount: 0 }, { status: 'failed' },
  ])('ignores malformed success details %j without touching ledger or holds', async changes => {
    expect((await POST(signed('charge.success', { ...details, ...changes }))).status).toBe(200);
    expect(state.q).not.toHaveBeenCalled(); await finish(); expect(state.tickets).not.toHaveBeenCalled(); expect(state.release).not.toHaveBeenCalled();
  });
  it('keeps raw-body signature checks before ledger access', async () => {
    const request = signed(); request.headers.set('x-paystack-signature', 'bad');
    expect((await POST(request)).status).toBe(400); expect(state.q).not.toHaveBeenCalled();
  });
  it('schedules fulfilment even when the audit insert fails', async () => {
    state.q.mockImplementation(async (sql: string) => {
      if (sql.startsWith('INSERT INTO audit_log')) throw Error('audit unavailable');
      return [{ ...order, status: 'paid' }];
    });
    expect((await POST(signed())).status).toBe(200); await finish();
    expect(state.inventory).toHaveBeenCalledTimes(1); expect(state.tickets).toHaveBeenCalledTimes(1); expect(state.receipt).toHaveBeenCalledTimes(1);
  });
  it('acknowledges and fulfils without waiting for a stalled audit query', async () => {
    state.q.mockImplementation(async (sql: string) => {
      if (sql.startsWith('INSERT INTO audit_log')) return new Promise(() => {});
      return [{ ...order, status: 'paid' }];
    });
    let status: number | undefined;
    void POST(signed()).then(response => { status = response.status; });
    await vi.waitFor(() => expect(status).toBe(200), { timeout: 80, interval: 5 });
    void state.work[0]();
    await vi.waitFor(() => expect(state.receipt).toHaveBeenCalledTimes(1), { timeout: 80, interval: 5 });
  });
  it('returns a retryable failure response before a stalled critical alert', async () => {
    state.q.mockRejectedValueOnce(Error('ledger unavailable'));
    state.alert.mockImplementationOnce(() => new Promise(() => {}));
    let status: number | undefined;
    void POST(signed()).then(response => { status = response.status; });
    await vi.waitFor(() => expect(status).toBe(503), { timeout: 80, interval: 5 });
  });
  it.each(['charge.success', 'charge.failed'])('returns retryable 503 if %s cannot reach a ledger', async event => {
    state.hasDb.mockReturnValue(false);
    expect((await POST(signed(event, { ...details, status: event === 'charge.failed' ? 'failed' : 'success' }))).status).toBe(503);
    expect(state.q).not.toHaveBeenCalled(); expect(state.work).toHaveLength(0);
  });
  it.each(['charge.success', 'charge.failed'])('returns retryable 503 on the %s ledger write failing', async event => {
    state.q.mockRejectedValueOnce(Error('ledger unavailable'));
    expect((await POST(signed(event, { ...details, status: event === 'charge.failed' ? 'failed' : 'success' }))).status).toBe(503);
    await finish(); expect(state.tickets).not.toHaveBeenCalled(); expect(state.receipt).not.toHaveBeenCalled();
  });
  it('retries the same signed event after a failed ledger write', async () => {
    state.q.mockRejectedValueOnce(Error('ledger unavailable'));
    expect((await POST(signed())).status).toBe(503);
    expect((await POST(signed())).status).toBe(200); await finish(); expect(state.tickets).toHaveBeenCalledTimes(1);
  });
  it('does not replay customer consequences or owner notifications for an already settled row', async () => {
    state.q.mockResolvedValue([]); expect((await POST(signed())).status).toBe(200); await finish();
    expect(state.tickets).not.toHaveBeenCalled(); expect(state.receipt).not.toHaveBeenCalled(); expect(state.success).not.toHaveBeenCalled();
  });
  it('does not suppress a second order using a reused provider event id', async () => {
    await POST(signed()); await finish(); state.work = [];
    await POST(signed('charge.success', { ...details, reference: 'ORD-SECOND123' })); await finish();
    expect(state.tickets).toHaveBeenCalledTimes(2);
  });
  it('guards an uncertain failure against another method/reference and retains its hold', async () => {
    state.q.mockResolvedValue([]);
    expect((await POST(signed('charge.failed', { ...details, status: 'failed' }))).status).toBe(200);
    const [sql, params] = state.q.mock.calls[0];
    expect(sql).toContain("status='reconciling'"); expect(sql).toContain("pay_method='card'"); expect(sql).toMatch(/paystack_ref\s*=\s*\$1/); expect(sql).toContain('total=$2');
    expect(params).toEqual([ref, 1200, ['pending', 'unknown', 'reconciling']]);
    await finish(); expect(state.release).not.toHaveBeenCalled(); expect(state.failure).not.toHaveBeenCalled();
  });
  it('keeps a matched failed event recoverable without releasing inventory or claiming permanent failure', async () => {
    await POST(signed('charge.failed', { ...details, status: 'failed' })); await finish();
    expect(state.q.mock.calls[0][0]).toContain("status='reconciling'");
    expect(state.release).not.toHaveBeenCalled(); expect(state.failure).not.toHaveBeenCalled(); expect(state.work).toHaveLength(0);
  });
  it.each([{ currency: 'USD' }, { amount: '120000' }, { amount: undefined }])('ignores an unverifiable signed failure %j', async changes => {
    await POST(signed('charge.failed', { ...details, status: 'failed', ...changes })); expect(state.q).not.toHaveBeenCalled();
  });
});
