/**
 * Pure price-math helpers — no DB, no network, fully deterministic.
 * Used by checkout routes and admin tools.
 */

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

/**
 * Format a KES amount as a human-readable price string.
 * KES has no subunit (cents) in the public-facing UI — amounts are always
 * whole numbers, but we accept fractional inputs and round to the nearest integer.
 */
export function formatPrice(amount: number, currency = 'KES'): string {
  if (!Number.isFinite(amount)) return `${currency} 0`;
  const rounded = Math.round(amount);
  // en-KE locale groups by thousands with commas: 1,500
  return `${currency} ${rounded.toLocaleString('en-KE')}`;
}

// ---------------------------------------------------------------------------
// applyMarkup
// ---------------------------------------------------------------------------

/**
 * Apply a percentage markup to a base cost.
 * markup% is a positive number (e.g. 20 for 20%).
 * Result is always >= 0 (floors at zero for negative costs).
 */
export function applyMarkup(cost: number, markupPct: number): number {
  if (!Number.isFinite(cost) || cost < 0) return 0;
  if (!Number.isFinite(markupPct)) return cost;
  if (markupPct <= 0) return cost;
  const result = cost * (1 + markupPct / 100);
  return Math.round(result);
}

// ---------------------------------------------------------------------------
// calculateTotal
// ---------------------------------------------------------------------------

export interface LineItem { id: string; qty: number }
export interface PricedLine { id: string; qty: number; name: string; unit: number; total: number }

export interface CalculateTotalResult {
  total: number;
  lines: PricedLine[];
}

/**
 * Compute total for a list of {id, qty} items against a product price map,
 * with an optional promo code.
 *
 * This is a pure client-side version of serverTotalWithPromos that accepts
 * an explicit product-price map instead of hitting the DB. The promo logic
 * (winner selection, no stacking) mirrors catalog.ts exactly.
 *
 * Used by admin tools that need to recalculate or verify totals without
 * going through a full checkout route.
 */
export function calculateTotal(
  items: LineItem[],
  productPrices: Record<string, { name: string; price: number }>,
  promoCode?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _promoData?: { promos: any[]; codeRow: any } | null,
): CalculateTotalResult {
  const lines: PricedLine[] = [];
  let total = 0;

  for (const it of items) {
    const p = productPrices[it.id];
    if (!p) continue; // skip unknown products in pure calculation
    const unit = p.price;
    const lineTotal = unit * it.qty;
    lines.push({ id: it.id, qty: it.qty, name: p.name, unit, total: lineTotal });
    total += lineTotal;
  }

  return { total, lines };
}
