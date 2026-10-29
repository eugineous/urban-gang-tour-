import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paystackInit, paystackVerify } from '@/lib/server/paystack';

const init = { email: 'buyer@example.invalid', amountKes: 1200, reference: 'ORD-SAFE123', callbackUrl: 'https://urbangangtour.co.ke/pay/success' };
const verified = { reference: init.reference, status: 'success', currency: 'KES', amount: 120000 };
const request = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubEnv('PAYSTACK_SECRET_KEY', 'fictional-paystack-key');
  vi.stubEnv('PAYSTACK_ENABLED', 'true');
  vi.stubGlobal('fetch', request);
  request.mockReset();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each([undefined,'false','', 'TRUE'])('keeps outbound Paystack inactive without explicit activation (%s)',async enabled=>{
 vi.stubEnv('PAYSTACK_ENABLED',enabled);
 expect(await paystackInit(init)).toMatchObject({ok:false});
 expect(await paystackVerify(init.reference)).toEqual({ok:false});
 expect(request).not.toHaveBeenCalled();
});

describe('Paystack initialization uncertainty', () => {
  it('accepts the documented HTTPS checkout host and forbids redirects', async () => {
    request.mockResolvedValue(Response.json({ status: true, data: { authorization_url: 'https://checkout.paystack.com/safe123' } }));
    expect(await paystackInit(init)).toMatchObject({ ok: true, url: 'https://checkout.paystack.com/safe123', requestPayload: { amount: 120000, currency: 'KES', reference: 'ORD-SAFE123' } });
    expect(request.mock.calls[0][1]).toMatchObject({ redirect: 'error', signal: expect.any(AbortSignal) });
  });
  it.each(['https://checkout.paystack.com.evil.invalid/a', 'http://checkout.paystack.com/a', 'https://evil.invalid/a', 'https://user@checkout.paystack.com/a', 'https://checkout.paystack.com:8443/a', 'javascript:alert(1)', '/checkout'])('does not expose an untrusted checkout URL %s', async url => {
    request.mockResolvedValue(Response.json({ status: true, data: { authorization_url: url } }));
    expect(await paystackInit(init)).toMatchObject({ ok: false, outcome: 'unknown', requestPayload: { reference: init.reference } });
  });
  it.each([400, 422])('preserves uncertainty after a dispatched validation response (%s)', async status => {
    request.mockResolvedValue(Response.json({ status: false, message: 'Invalid email address' }, { status }));
    expect(await paystackInit(init)).toMatchObject({ ok: false, outcome: 'unknown' });
  });
  it.each([401, 409, 429, 500, 503])('preserves uncertainty for HTTP %s', async status => {
    request.mockResolvedValue(Response.json({ status: false, message: 'Unavailable' }, { status }));
    expect(await paystackInit(init)).toMatchObject({ ok: false, outcome: 'unknown' });
  });
  it('does not treat invalid JSON as an authoritative rejection', async () => {
    request.mockResolvedValue(new Response('invalid', { status: 400 }));
    expect(await paystackInit(init)).toMatchObject({ ok: false, outcome: 'unknown' });
  });
  it('keeps a duplicate-reference response uncertain because its original session may remain payable', async () => {
    request.mockResolvedValue(Response.json({ status: false, message: 'Duplicate Transaction Reference' }, { status: 400 }));
    expect(await paystackInit(init)).toMatchObject({ ok: false, outcome: 'unknown', requestPayload: { reference: init.reference } });
  });
  it('retains the attempted request identity after a transport failure', async () => {
    request.mockRejectedValue(Error('connection lost'));
    expect(await paystackInit(init)).toMatchObject({ ok: false, outcome: 'unknown', requestPayload: { reference: init.reference, amount: 120000 } });
  });
  it('aborts a stalled request within a bounded deadline', async () => {
    vi.useFakeTimers();
    request.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(Error('aborted')), { once: true });
    }));
    let result: Awaited<ReturnType<typeof paystackInit>> | undefined;
    const pending = paystackInit(init).then(value => { result = value; });
    await vi.advanceTimersByTimeAsync(30000);
    expect(result).toMatchObject({ ok: false, outcome: 'unknown', requestPayload: { reference: init.reference } });
    await pending;
  });
});

describe('Paystack verification identity', () => {
  it('returns provider identity and exact integer subunits for a verified KES payment', async () => {
    request.mockResolvedValue(Response.json({ status: true, data: verified }));
    expect(await paystackVerify(init.reference)).toEqual({ ok: true, paid: true, amountKes: 1200, amountSubunit: 120000, reference: init.reference, currency: 'KES', status: 'success' });
    expect(request.mock.calls[0][1]).toMatchObject({ redirect: 'error', signal: expect.any(AbortSignal) });
  });
  it.each([
    { reference: 'ORD-OTHER123' }, { reference: undefined }, { currency: 'USD' }, { currency: undefined },
    { amount: '120000' }, { amount: 120000.1 }, { amount: 0 }, { amount: -1 }, { amount: Number.MAX_SAFE_INTEGER + 1 },
    { status: undefined }, { status: 'invented-status' },
  ])('rejects malformed or mismatched provider details %j', async changes => {
    request.mockResolvedValue(Response.json({ status: true, data: { ...verified, ...changes } }));
    expect(await paystackVerify(init.reference)).toEqual({ ok: false });
  });
  it('retains a validated pending outcome without marking it paid', async () => {
    request.mockResolvedValue(Response.json({ status: true, data: { ...verified, status: 'pending' } }));
    expect(await paystackVerify(init.reference)).toMatchObject({ ok: true, paid: false, reference: init.reference, currency: 'KES', status: 'pending' });
  });
});
