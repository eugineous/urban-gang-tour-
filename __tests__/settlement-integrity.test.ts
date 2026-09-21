/**
 * Settlement-integrity tests: the pure rules that keep money truthful.
 * All DB-hitting imports are mocked; functions under test are pure.
 *  - canAdminSetOrderStatus / amountsMatch (lib/server/payment-status.ts)
 *  - canSellQty / remainingCapacity (lib/server/ticket-inventory.ts)
 *  - isEventSellable (lib/server/event-lifecycle.ts)
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/server/db', () => ({
  db: () => null,
  hasDb: () => false,
  q: vi.fn(async () => []),
}));

import { canAdminSetOrderStatus, amountsMatch } from '../lib/server/payment-status';
import { canSellQty, remainingCapacity, parseTierInventory } from '../lib/server/ticket-inventory';
import { isEventSellable } from '../lib/server/event-lifecycle';
import { decideMpesaOutcome } from '../lib/server/reconcile';

describe('admin order transitions', () => {
  it('allows pending -> paid (callback path mirrored by staff)', () => {
    expect(canAdminSetOrderStatus('pending', 'paid')).toBe(true);
  });
  it('blocks paid -> pending (no reopening settled money)', () => {
    expect(canAdminSetOrderStatus('paid', 'pending')).toBe(false);
  });
  it('blocks pending -> refunded (must go through paid first)', () => {
    expect(canAdminSetOrderStatus('pending', 'refunded')).toBe(false);
  });
  it('rejects unknown strings', () => {
    expect(canAdminSetOrderStatus('pending', 'free_money')).toBe(false);
  });
});

describe('amount matching', () => {
  it('matches equal KES integers', () => {
    expect(amountsMatch(1200, 1200)).toBe(true);
  });
  it('rejects mismatch (callback for a different total)', () => {
    expect(amountsMatch(1200, 800)).toBe(false);
  });
  it('rejects non-positive', () => {
    expect(amountsMatch(0, 0)).toBe(false);
  });
});

describe('inventory', () => {
  it('remaining = capacity - sold - reserved', () => {
    expect(remainingCapacity({ capacity: 100, sold: 60, reserved: 10 })).toBe(30);
  });
  it('null capacity means untracked (sell without count)', () => {
    expect(canSellQty({ capacity: null, sold: 999, reserved: 999, qty: 2, per_order_min: 1, per_order_max: 20 })).toEqual({ ok: true });
  });
  it('blocks oversell', () => {
    expect(canSellQty({ capacity: 10, sold: 9, reserved: 0, qty: 2, per_order_min: 1, per_order_max: 20 }).ok).toBe(false);
  });
  it('sold out reason when nothing left', () => {
    expect(canSellQty({ capacity: 10, sold: 10, reserved: 0, qty: 1, per_order_min: 1, per_order_max: 20 })).toEqual({ ok: false, reason: 'sold_out' });
  });
  it('parseTierInventory keeps capacity optional, never invents one', () => {
    const tiers = parseTierInventory([{ name: 'Regular', price: 500 }]);
    expect(tiers[0].capacity).toBeNull();
  });
});

describe('Daraja result mapping', () => {
  it('0 -> paid', () => {
    expect(decideMpesaOutcome(0)).toBe('paid');
  });
  it('1032/1 -> declined', () => {
    expect(decideMpesaOutcome(1032)).toBe('declined');
    expect(decideMpesaOutcome(1)).toBe('declined');
  });
  it('2001/1037/1025 -> timed_out', () => {
    expect(decideMpesaOutcome(2001)).toBe('timed_out');
    expect(decideMpesaOutcome(1037)).toBe('timed_out');
  });
  it('anything else -> unknown, never invent success', () => {
    expect(decideMpesaOutcome(9999)).toBe('unknown');
  });
});
describe('sellable gate', () => {
  it('published ticketed with tiers is sellable', () => {
    expect(isEventSellable({ status: 'published', kind: 'ticketed', tiers: [{ name: 'Regular', price: 500 }] })).toBe(true);
  });
  it('published school stop is NOT sellable', () => {
    expect(isEventSellable({ status: 'published', kind: 'school', tiers: [] })).toBe(false);
  });
  it('cancelled ticketed is NOT sellable', () => {
    expect(isEventSellable({ status: 'cancelled', kind: 'ticketed', tiers: [{ name: 'VIP', price: 1 }] })).toBe(false);
  });
  it('published ticketed with no tiers is NOT sellable', () => {
    expect(isEventSellable({ status: 'published', kind: 'ticketed', tiers: [] })).toBe(false);
  });
});
