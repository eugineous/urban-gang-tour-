// Server-side promo engine — the ONLY place that decides whether a discount
// applies and how big it is. lib/server/catalog.ts's serverTotalWithPromos()
// is the sole caller checkout routes should use; never trust a price or
// discount the browser claims.
import { q, db } from './db';
import { ensureOpsSchema } from './ops';

export interface PromoRow {
  id: number;
  name: string;
  promo_type: 'percent' | 'fixed';
  discount: number;
  product_ids: string[];
  starts_on: string | null;
  ends_on: string | null;
  banner_text: string;
  code: string;
  max_uses: number | null;
  uses: number;
  active: boolean;
}

// Shape mirrors the brief: {percent, fixed, promoId}. Exactly one of
// percent/fixed is set, matching the promo's own promo_type.
export interface ActiveDiscount {
  percent: number | null;
  fixed: number | null;
  promoId: number;
  promoName: string;
}

function parseProductIds(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map((x) => String(x)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

// node-postgres parses a DATE column into a JS Date (local midnight), not a
// string — String(date) gives "Sat Jul 11 2026 ..." (toString()), not ISO.
// Only NextResponse.json() calls toJSON()/toISOString() for us; this file
// deals with the raw pg row before that, so it must do it explicitly.
function normalizeDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function normalizeRow(r: any): PromoRow {
  return {
    id: Number(r.id),
    name: String(r.name || ''),
    promo_type: r.promo_type === 'fixed' ? 'fixed' : 'percent',
    discount: Number(r.discount) || 0,
    product_ids: parseProductIds(r.product_ids),
    starts_on: normalizeDate(r.starts_on),
    ends_on: normalizeDate(r.ends_on),
    banner_text: String(r.banner_text || ''),
    code: String(r.code || ''),
    max_uses: r.max_uses === null || r.max_uses === undefined ? null : Number(r.max_uses),
    uses: Number(r.uses) || 0,
    active: !!r.active,
  };
}

function toActiveDiscount(p: PromoRow): ActiveDiscount {
  return {
    percent: p.promo_type === 'percent' ? p.discount : null,
    fixed: p.promo_type === 'fixed' ? p.discount : null,
    promoId: p.id,
    promoName: p.name,
  };
}

// All promos run on a date-only window (matches the admin UI's <input
// type="date"> and the ops dashboard's existing "activePromo" query) — a
// promo is live for its whole end date, through 23:59:59 local time.
// db()==null (no DATABASE_URL) resolves to "no promos" rather than throwing,
// so every caller (public API, checkout routes) degrades gracefully.
export async function getActivePromos(): Promise<PromoRow[]> {
  if (!db()) return [];
  await ensureOpsSchema();
  const rows = await q(`
    SELECT * FROM ops_promos
    WHERE active
      AND (starts_on IS NULL OR starts_on <= CURRENT_DATE)
      AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
    ORDER BY id DESC
  `);
  return rows.map(normalizeRow);
}

// Pure helper over an already-fetched promo list — used by
// serverTotalWithPromos() so pricing N line items costs one DB round trip,
// not N. Only considers AUTOMATIC promos (no code set): a promo with a code
// is only ever applied when the buyer supplies that exact code (see
// validatePromoCode/discountFromCodeRow) — that is the whole point of a
// promo code. Among matching automatic promos, a product-scoped promo always
// beats a storewide one ("most specific wins"); ties break toward the larger
// discount to the buyer.
export function bestAutoDiscountForProduct(promos: PromoRow[], productId: string): ActiveDiscount | null {
  const eligible = promos.filter(
    (p) => !p.code && (p.product_ids.length === 0 || p.product_ids.includes(productId))
  );
  if (!eligible.length) return null;
  const scoped = eligible.filter((p) => p.product_ids.length > 0);
  const pool = scoped.length ? scoped : eligible;
  let best: PromoRow | null = null;
  let bestOff = -1;
  for (const p of pool) {
    // Compare percent vs fixed on a common notional basis so "best for the
    // buyer" is well defined even when discount types differ.
    const off = p.promo_type === 'percent' ? Math.min(100, Math.max(0, p.discount)) * 10 : Math.max(0, p.discount);
    if (off > bestOff) {
      bestOff = off;
      best = p;
    }
  }
  return best ? toActiveDiscount(best) : null;
}

// Convenience single-item lookup (one DB round trip). Prefer
// bestAutoDiscountForProduct() + a shared getActivePromos() call when pricing
// multiple line items.
export async function activeDiscountForProduct(productId: string): Promise<ActiveDiscount | null> {
  const promos = await getActivePromos();
  return bestAutoDiscountForProduct(promos, productId);
}

// basePrice -> discounted integer KES. Percent rounds sensibly; fixed floors
// at 0. Never negative, never non-integer, never above basePrice.
export function applyDiscount(basePrice: number, discount: ActiveDiscount | null): number {
  const base = Number.isFinite(basePrice) ? Math.max(0, basePrice) : 0;
  if (!discount) return Math.round(base);
  if (discount.percent != null) {
    const pct = Math.min(100, Math.max(0, discount.percent));
    return Math.max(0, Math.round(base * (1 - pct / 100)));
  }
  if (discount.fixed != null) {
    return Math.max(0, Math.round(base - Math.max(0, discount.fixed)));
  }
  return Math.round(base);
}

// Buyer-supplied promo code. Case-insensitive, must be active, active-by-time
// and under max_uses. Returns the full row (product scope is enforced per
// line item by discountFromCodeRow) or null for any invalid/expired/exhausted
// code — callers must treat null as "ignore the code", never as an error
// that blocks checkout.
export async function validatePromoCode(code: string): Promise<PromoRow | null> {
  const clean = String(code || '').trim().slice(0, 60);
  if (!clean || !db()) return null;
  await ensureOpsSchema();
  const rows = await q(
    `SELECT * FROM ops_promos
     WHERE active AND code IS NOT NULL AND code <> ''
       AND UPPER(code) = UPPER($1)
       AND (starts_on IS NULL OR starts_on <= CURRENT_DATE)
       AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
       AND (max_uses IS NULL OR uses < max_uses)
     LIMIT 1`,
    [clean]
  );
  return rows.length ? normalizeRow(rows[0]) : null;
}

// Discount from an already-validated code row, scoped to one product line
// (null if the code's product_ids don't cover this product).
export function discountFromCodeRow(row: PromoRow, productId: string): ActiveDiscount | null {
  if (row.product_ids.length > 0 && !row.product_ids.includes(productId)) return null;
  return toActiveDiscount(row);
}

// Called ONLY after the order is durably created — never on a failed/aborted
// checkout attempt — so max_uses tracks real redemptions, not attempts.
export async function recordPromoCodeUse(promoId: number): Promise<void> {
  try {
    await q(`UPDATE ops_promos SET uses = uses + 1 WHERE id=$1`, [promoId]);
  } catch {
    // non-fatal — a missed usage-counter increment must never fail an order
  }
}
