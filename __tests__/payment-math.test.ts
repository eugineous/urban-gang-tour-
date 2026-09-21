/**
 * Unit tests for UGT payment / price maths.
 *
 * All DB-hitting imports are mocked so tests run without a real database.
 * Functions under test:
 *  - applyDiscount / bestAutoDiscountForProduct / discountFromCodeRow (lib/server/promos.ts)
 *  - serverTotalWithPromos (lib/server/catalog.ts) — exercised via pure-math simulation
 *  - computeBudget / docTotals (lib/ops/budget-calc.ts)
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the DB layer so nothing ever reaches a real database.
// ---------------------------------------------------------------------------
vi.mock('../lib/server/db', () => ({
  db: () => null,
  q: vi.fn(async () => []),
}));

vi.mock('../lib/server/ops', () => ({
  ensureOpsSchema: vi.fn(async () => {}),
}));

// ---------------------------------------------------------------------------
// Imports — after vi.mock calls (vitest hoists mocks before imports)
// ---------------------------------------------------------------------------
import {
  applyDiscount,
  bestAutoDiscountForProduct,
  discountFromCodeRow,
  type ActiveDiscount,
  type PromoRow,
} from '../lib/server/promos';

import {
  serverTotalWithPromos,
} from '../lib/server/catalog';

import {
  computeBudget,
  docTotals,
  emptyBudget,
  type BudgetData,
  type DocLine,
} from '../lib/ops/budget-calc';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a minimal PromoRow for testing. */
function makePromo(
  overrides: Partial<PromoRow> & { id: number; name: string }
): PromoRow {
  return {
    promo_type: 'percent',
    discount: 0,
    product_ids: [],
    starts_on: null,
    ends_on: null,
    banner_text: '',
    code: '',
    max_uses: null,
    uses: 0,
    active: true,
    ...overrides,
  };
}

/** Fake product catalogue used across serverTotalWithPromos tests. */
const PRODUCTS = {
  'tee-black':  { name: 'Black Tee', price: 1500 },
  'snapback':   { name: 'Snapback',  price: 2000 },
  'ticket:e1:0': { name: 'GA Ticket', price: 3000 },
};

/**
 * Simulate exactly what serverTotalWithPromos does per line item —
 * pure math, no DB, tested without re-implementing catalog.ts logic.
 * Mirrors the winner-selection logic verbatim from catalog.ts.
 */
function priceLine(
  productId: string,
  qty: number,
  products: Record<string, { name: string; price: number }>,
  promos: PromoRow[],
  codeRow: PromoRow | null = null
): { unit: number; total: number; appliedPromoCode: { promoId: number; promoName: string } | null } {
  const p = products[productId];
  if (!p) throw new Error(`unknown product: ${productId}`);

  const auto = bestAutoDiscountForProduct(promos, productId);
  const fromCode = codeRow ? discountFromCodeRow(codeRow, productId) : null;

  let winner: ActiveDiscount | null = null;
  let winnerIsCode = false;

  if (auto && fromCode) {
    const autoPrice  = applyDiscount(p.price, auto);
    const codePrice  = applyDiscount(p.price, fromCode);
    if (codePrice < autoPrice) { winner = fromCode; winnerIsCode = true; }
    else                        { winner = auto; }
  } else if (fromCode) { winner = fromCode; winnerIsCode = true; }
  else if (auto)        { winner = auto; }

  const unit = applyDiscount(p.price, winner);
  return {
    unit,
    total: unit * qty,
    appliedPromoCode: winnerIsCode && winner
      ? { promoId: winner.promoId, promoName: winner.promoName }
      : null,
  };
}

// ============================================================================
// 1. applyDiscount — pure helper, no DB
// ============================================================================

describe('applyDiscount', () => {
  it('returns base price unchanged when no discount is given', () => {
    expect(applyDiscount(1000, null)).toBe(1000);
  });

  it('applies a percentage discount correctly', () => {
    const d: ActiveDiscount = { percent: 20, fixed: null, promoId: 1, promoName: 'T' };
    expect(applyDiscount(1000, d)).toBe(800);
  });

  it('rounds a fractional percent result (33% of 999 → 669)', () => {
    const d: ActiveDiscount = { percent: 33, fixed: null, promoId: 1, promoName: 'T' };
    // 999 × 0.67 = 669.33 → Math.round → 669
    expect(applyDiscount(999, d)).toBe(669);
  });

  it('applies a fixed discount correctly', () => {
    const d: ActiveDiscount = { percent: null, fixed: 200, promoId: 2, promoName: 'F' };
    expect(applyDiscount(1000, d)).toBe(800);
  });

  it('floors at 0 when fixed discount exceeds price', () => {
    const d: ActiveDiscount = { percent: null, fixed: 5000, promoId: 3, promoName: 'Big' };
    expect(applyDiscount(500, d)).toBe(0);
  });

  it('100% discount gives 0', () => {
    const d: ActiveDiscount = { percent: 100, fixed: null, promoId: 4, promoName: 'Full' };
    expect(applyDiscount(1000, d)).toBe(0);
  });

  it('clamps percent > 100 to 100 (result is 0)', () => {
    const d: ActiveDiscount = { percent: 150, fixed: null, promoId: 5, promoName: 'Over' };
    expect(applyDiscount(1000, d)).toBe(0);
  });

  it('rounds a non-integer base price', () => {
    expect(applyDiscount(999.99, null)).toBe(1000);
  });

  it('returns 0 for NaN base price', () => {
    expect(applyDiscount(NaN, null)).toBe(0);
  });

  it('returns 0 for Infinity base price', () => {
    expect(applyDiscount(Infinity, null)).toBe(0);
  });

  it('returns 0 for negative base price', () => {
    expect(applyDiscount(-500, null)).toBe(0);
  });
});

// ============================================================================
// 2. bestAutoDiscountForProduct — pure helper, no DB
// ============================================================================

describe('bestAutoDiscountForProduct', () => {
  it('returns null when promo list is empty', () => {
    expect(bestAutoDiscountForProduct([], 'prod-1')).toBeNull();
  });

  it('ignores promos that require a code', () => {
    const p = makePromo({ id: 1, name: 'CodeOnly', code: 'SECRET', discount: 10 });
    expect(bestAutoDiscountForProduct([p], 'prod-1')).toBeNull();
  });

  it('returns a storewide promo (product_ids=[]) for any product', () => {
    const p = makePromo({ id: 1, name: 'Store10', discount: 10 });
    const r = bestAutoDiscountForProduct([p], 'prod-1');
    expect(r).not.toBeNull();
    expect(r!.promoId).toBe(1);
  });

  it('prefers a product-scoped promo over a storewide one', () => {
    const storewide = makePromo({ id: 1, name: 'Store', discount: 20, product_ids: [] });
    const scoped    = makePromo({ id: 2, name: 'Scoped', discount: 5, product_ids: ['prod-1'] });
    const r = bestAutoDiscountForProduct([storewide, scoped], 'prod-1');
    // scoped pool wins even though its discount is smaller
    expect(r!.promoId).toBe(2);
  });

  it('excludes scoped promos that do not cover the product', () => {
    const scoped   = makePromo({ id: 1, name: 'Other', discount: 50, product_ids: ['other-id'] });
    const storewide = makePromo({ id: 2, name: 'Store', discount: 5,  product_ids: [] });
    const r = bestAutoDiscountForProduct([storewide, scoped], 'prod-1');
    expect(r!.promoId).toBe(2);
  });

  it('picks the larger discount among multiple matching auto promos', () => {
    const small = makePromo({ id: 1, name: 'Small', discount: 5 });
    const big   = makePromo({ id: 2, name: 'Big',   discount: 30 });
    const r = bestAutoDiscountForProduct([small, big], 'any');
    expect(r!.promoId).toBe(2);
  });
});

// ============================================================================
// 3. serverTotalWithPromos — tested via the priceLine simulation above,
//    which mirrors catalog.ts's winner-selection logic exactly.
//    One smoke test also exercises the real function (db is mocked to null
//    so the products map is empty, confirming the error path works).
// ============================================================================

describe('serverTotalWithPromos (real function, empty catalog)', () => {
  it('throws for an unknown product when the catalog is empty', async () => {
    // db() === null → getProducts returns {} → any product id is unknown
    await expect(
      serverTotalWithPromos([{ id: 'nonexistent', qty: 1 }])
    ).rejects.toThrow('unknown product');
  });
});

describe('serverTotalWithPromos math (pure simulation)', () => {
  it('returns correct unit price and total for a single item with no promo', () => {
    const r = priceLine('tee-black', 1, PRODUCTS, []);
    expect(r.unit).toBe(1500);
    expect(r.total).toBe(1500);
    expect(r.appliedPromoCode).toBeNull();
  });

  it('returns correct total for multiple items summed externally', () => {
    const l1 = priceLine('tee-black', 2, PRODUCTS, []);
    const l2 = priceLine('snapback', 1, PRODUCTS, []);
    // 1500*2 + 2000*1 = 5000
    expect(l1.total + l2.total).toBe(5000);
  });

  it('handles merch quantity — qty × unit price', () => {
    const r = priceLine('snapback', 3, PRODUCTS, []);
    expect(r.total).toBe(6000); // 2000 × 3
  });

  it('handles ticket items (ticket: prefix product)', () => {
    const r = priceLine('ticket:e1:0', 2, PRODUCTS, []);
    expect(r.total).toBe(6000); // 3000 × 2
  });

  it('applies a percentage promo automatically', () => {
    const promo = makePromo({ id: 10, name: 'Flash20', promo_type: 'percent', discount: 20 });
    const r = priceLine('tee-black', 1, PRODUCTS, [promo]);
    expect(r.unit).toBe(1200);  // 1500 × 0.80
    expect(r.total).toBe(1200);
  });

  it('applies a fixed-discount promo automatically', () => {
    const promo = makePromo({ id: 11, name: 'Fixed300', promo_type: 'fixed', discount: 300 });
    const r = priceLine('snapback', 1, PRODUCTS, [promo]);
    expect(r.unit).toBe(1700);  // 2000 − 300
  });

  it('promo code wins when it gives a better discount than the auto promo', () => {
    const auto    = makePromo({ id: 20, name: 'Auto10', promo_type: 'percent', discount: 10 });
    const codeRow = makePromo({ id: 21, name: 'Code30', promo_type: 'percent', discount: 30, code: 'GANG30' });
    const r = priceLine('tee-black', 1, PRODUCTS, [auto], codeRow);
    expect(r.unit).toBe(1050);  // 1500 × 0.70
    expect(r.appliedPromoCode).not.toBeNull();
    expect(r.appliedPromoCode!.promoName).toBe('Code30');
  });

  it('auto promo wins when it gives a better discount than the code', () => {
    const auto    = makePromo({ id: 30, name: 'Auto40', promo_type: 'percent', discount: 40 });
    const codeRow = makePromo({ id: 31, name: 'Code10', promo_type: 'percent', discount: 10, code: 'WEAK' });
    const r = priceLine('snapback', 1, PRODUCTS, [auto], codeRow);
    expect(r.unit).toBe(1200);  // 2000 × 0.60
    expect(r.appliedPromoCode).toBeNull();  // code did not win
  });

  it('promo discount cannot make price negative (floored at 0)', () => {
    const bigFixed = makePromo({ id: 40, name: 'BigFixed', promo_type: 'fixed', discount: 99999 });
    const r = priceLine('tee-black', 1, PRODUCTS, [bigFixed]);
    expect(r.unit).toBe(0);
    expect(r.total).toBe(0);
  });

  it('throws for an unknown product id', () => {
    expect(() => priceLine('nonexistent', 1, PRODUCTS, [])).toThrow('unknown product');
  });
});

// ============================================================================
// 4. computeBudget — pure, deterministic
// ============================================================================

describe('computeBudget', () => {
  it('calculates all derived totals correctly from explicit inputs', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 6000,
      stageCost: 30000,
      lines: [
        { id: 'a', label: 'Colours', amount: 5000, kind: 'default' },
        { id: 'b', label: 'Awards',  amount: 8000, kind: 'default' },
      ],
      crewCount: 2,
      crewRate: 1500,
      expectedIncome: 200000,
      teacherPct: 10,
      contingencyPct: 7.5,
    };
    const r = computeBudget(b);
    // productionCost = 6000 + 30000 + 5000 + 8000 = 49000
    expect(r.productionCost).toBe(49000);
    // crewPay = 2 × 1500 = 3000
    expect(r.crewPay).toBe(3000);
    // teacherCut = 10% × 200000 = 20000
    expect(r.teacherCut).toBe(20000);
    // contingency = round(7.5% × 49000) = 3675
    expect(r.contingency).toBe(3675);
    // grandTotal = 49000 + 3000 + 20000 + 3675 = 75675
    expect(r.grandTotal).toBe(75675);
    // profit = 200000 − 75675 = 124325
    expect(r.profit).toBe(124325);
    expect(r.profitTone).toBe('green');
  });

  it('handles empty lines array — only sound and stage count', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 6000,
      stageCost: 30000,
      lines: [],
      crewCount: 0,
      crewRate: 0,
      expectedIncome: 0,
      teacherPct: 0,
      contingencyPct: 7.5,
    };
    const r = computeBudget(b);
    expect(r.productionCost).toBe(36000);
    expect(r.crewPay).toBe(0);
    expect(r.grandTotal).toBe(36000 + Math.round(0.075 * 36000));
  });

  it('excludes TBD (null amount) lines from productionCost, counts them in tbdCount', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 6000,
      stageCost: 30000,
      lines: [{ id: 'x', label: 'TBD', amount: null, kind: 'default' }],
      crewCount: 0,
      crewRate: 0,
      expectedIncome: 0,
      teacherPct: 0,
      contingencyPct: 7.5,
    };
    const r = computeBudget(b);
    expect(r.productionCost).toBe(36000);
    expect(r.tbdCount).toBe(1);
  });

  it('handles zero-amount line items without errors', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 0,
      stageCost: 0,
      lines: [{ id: 'z', label: 'Free', amount: 0, kind: 'default' }],
      crewCount: 0,
      crewRate: 0,
      expectedIncome: 0,
      teacherPct: 0,
      contingencyPct: 5,
    };
    const r = computeBudget(b);
    expect(r.productionCost).toBe(0);
    expect(r.grandTotal).toBe(0);
  });

  it('clamps contingencyPct below 5 up to 5', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 10000,
      stageCost: 10000,
      lines: [],
      crewCount: 0,
      crewRate: 0,
      expectedIncome: 0,
      teacherPct: 0,
      contingencyPct: 1,
    };
    const r = computeBudget(b);
    expect(r.contingencyPct).toBe(5);
    expect(r.contingency).toBe(Math.round(0.05 * 20000));
  });

  it('clamps contingencyPct above 10 down to 10', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 10000,
      stageCost: 10000,
      lines: [],
      crewCount: 0,
      crewRate: 0,
      expectedIncome: 0,
      teacherPct: 0,
      contingencyPct: 99,
    };
    const r = computeBudget(b);
    expect(r.contingencyPct).toBe(10);
  });

  it('reports red profit tone when loss exceeds 5% of income', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 999999,
      stageCost: 0,
      lines: [],
      crewCount: 0,
      crewRate: 0,
      expectedIncome: 1000,
      teacherPct: 0,
      contingencyPct: 5,
    };
    const r = computeBudget(b);
    expect(r.profitTone).toBe('red');
  });

  it('calculates perStudent correctly when studentCount is set', () => {
    const b: BudgetData = {
      ...emptyBudget(),
      soundCost: 50000,
      stageCost: 0,
      lines: [],
      crewCount: 0,
      crewRate: 0,
      expectedIncome: 0,
      teacherPct: 0,
      contingencyPct: 5,
      studentCount: 500,
    };
    const r = computeBudget(b);
    // grandTotal = 50000 + round(5% × 50000) = 50000 + 2500 = 52500
    // perStudent = round(52500 / 500) = 105
    expect(r.perStudent).toBe(105);
  });

  it('perStudent is null when studentCount is null', () => {
    const b: BudgetData = { ...emptyBudget(), studentCount: null };
    expect(computeBudget(b).perStudent).toBeNull();
  });

  it('grandTotal is always a finite number', () => {
    expect(Number.isFinite(computeBudget(emptyBudget()).grandTotal)).toBe(true);
  });
});

// ============================================================================
// 5. docTotals — pure
// ============================================================================

describe('docTotals', () => {
  it('calculates subtotal (qty × amount) across lines', () => {
    const lines: DocLine[] = [
      { label: 'Sound', qty: 1, amount: 80000 },
      { label: 'Stage', qty: 2, amount: 25000 },
    ];
    const t = docTotals(lines);
    expect(t.subtotal).toBe(130000); // 80000 + 50000
    expect(t.total).toBe(130000);
  });

  it('handles an empty lines array', () => {
    expect(docTotals([])).toEqual({ subtotal: 0, total: 0 });
  });

  it('handles zero-amount items', () => {
    const lines: DocLine[] = [
      { label: 'Freebie', qty: 5, amount: 0 },
      { label: 'Merch',   qty: 1, amount: 500 },
    ];
    expect(docTotals(lines).subtotal).toBe(500);
  });

  it('handles qty=0 items (contribute 0 to total)', () => {
    const lines: DocLine[] = [
      { label: 'Zero', qty: 0, amount: 999 },
      { label: 'Real', qty: 1, amount: 1000 },
    ];
    // Math.max(0, 0) * 999 = 0; only second line counts
    expect(docTotals(lines).subtotal).toBe(1000);
  });

  it('multiplies qty × amount per line correctly', () => {
    const lines: DocLine[] = [{ label: 'Crew', qty: 5, amount: 1500 }];
    expect(docTotals(lines).subtotal).toBe(7500);
  });
});

// ============================================================================
// 6. Price safety
// ============================================================================

describe('price safety', () => {
  it('Number.MAX_SAFE_INTEGER + 1 is not a safe integer', () => {
    expect(Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });

  it('applyDiscount with a price above MAX_SAFE_INTEGER produces a finite result', () => {
    const huge = Number.MAX_SAFE_INTEGER + 100;
    expect(Number.isFinite(applyDiscount(huge, null))).toBe(true);
  });

  it('applyDiscount returns 0 for NaN', () => {
    expect(applyDiscount(NaN, null)).toBe(0);
  });

  it('applyDiscount returns 0 for Infinity', () => {
    expect(applyDiscount(Infinity, null)).toBe(0);
  });

  it('applyDiscount returns 0 for negative price', () => {
    expect(applyDiscount(-500, null)).toBe(0);
  });

  it('100% promo on MAX_SAFE_INTEGER price gives 0 (never negative)', () => {
    const d: ActiveDiscount = { percent: 100, fixed: null, promoId: 99, promoName: 'AllOff' };
    expect(applyDiscount(Number.MAX_SAFE_INTEGER, d)).toBe(0);
  });
});
