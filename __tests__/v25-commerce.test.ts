import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, afterEach } from 'vitest';

function runtime() {
  const html = readFileSync('public/v25-template.html', 'utf8');
  const source = html.slice(html.indexOf('class Component extends DCLogic'), html.lastIndexOf('</script>'));
  class Logic {
    state: any;
    setState(patch: any) { this.state = { ...this.state, ...(typeof patch === 'function' ? patch(this.state) : patch) }; }
  }
  vi.stubGlobal('window', { location: { assign: vi.fn() } });
  vi.stubGlobal('location', { pathname: '/', search: '' });
  return new (new Function('DCLogic', source + '; return Component;')(Logic))({});
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('original V25 commerce runtime', () => {
  it('ignores a paid response after checkout is closed', async () => {
    vi.useFakeTimers();
    const app = runtime();
    app.state.cart = [{ id: 'test', qty: 1 }];
    app.state.checkout = { ...app.state.checkout, stage: 'stk', orderId: 'old' };
    let resolve: any;
    (window as any).__UGT_ORDER_STATUS = () => new Promise(r => { resolve = r; });
    app.beginPoll('co', 'old');
    await vi.advanceTimersByTimeAsync(500);
    app.closeCheckout();
    resolve({ status: 'paid', total: 100 });
    await Promise.resolve();
    expect(app.state.checkout.stage).toBeNull();
    expect(app.state.cart).toHaveLength(1);
  });
  it('navigates work audiences to a real route with a persistent tab', () => {
    const app = runtime();
    app.goWork('schools');
    expect(window.location.assign).toHaveBeenCalledWith('/work-with-us?tab=schools');
  });

  it('includes option adjustments in checkout line totals', () => {
    const app = runtime();
    app.PRODUCTS = [{ id: 'test', price: 100, name: 'Test', variants: [{label: 'XL', priceAdjustment: 50}] }];
    app.state.cart = [{ id: 'test', qty: 2, size: 'XL' }];
    expect(app.renderVals().coLines[0].totalFmt).toBe('KES 300');
  });

  it('limits repeated quick additions to twenty per variant', () => {
    const app = runtime();
    app.PRODUCTS = [{ id: 'test', price: 100, name: 'Test' }];
    app.state.cart = [{ id: 'test', qty: 20, size: null }];
    app.state.quickId = 'test';
    app.addQuick();
    expect(app.state.cart[0].qty).toBe(20);
  });

  it('recovers ticket input when the payment network fails', async () => {
    const app = runtime();
    app.state.ticket = { ...app.state.ticket, name: 'Buyer', phone: '0712345678' };
    (window as any).__UGT_MPESA_PAY = async () => { throw new Error('offline'); };
    await app.confirmTicket();
    expect(app.state.ticket.busy).toBe(false);
    expect(app.state.ticket.err).toBeTruthy();
  });

  it('keeps cart increments within the server quantity limit', () => {
    const app = runtime();
    app.state.cart = [{ id: 'test', qty: 20 }];
    app.incAt(0);
    expect(app.state.cart[0].qty).toBe(20);
  });

  it('recovers the checkout fields when starting payment rejects', async () => {
    const app = runtime();
    app.PRODUCTS = [{ id: 'test', price: 100, name: 'Test' }];
    app.state.cart = [{ id: 'test', qty: 1 }];
    app.state.checkout = { ...app.state.checkout, name: 'Buyer', phone: '0712345678' };
    (window as any).__UGT_MPESA_PAY = async () => { throw new Error('offline'); };
    await app.confirmOrder();
    expect(app.state.checkout.busy).toBe(false);
    expect(app.state.checkout.err).toBeTruthy();
    expect(app.state.checkout.name).toBe('Buyer');
  });
});
