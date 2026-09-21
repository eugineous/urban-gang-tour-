// Server-side price catalog — the ONLY source of truth for amounts.
// Never trust prices sent from the browser.
//
// Products and ticketed events now live in the `products` / `tour_events`
// tables (lib/server/ops.ts OPS_SCHEMA) so the owner can add/edit/retire them
// from the admin Control Room without a code deploy. This file is the single
// cached read layer every checkout route (M-Pesa, Paystack, Stripe) and every
// ticket page goes through — a short in-memory cache (TTL below) means an
// admin price change is live within ~45s, no deploy needed, while checkout
// still never round-trips the DB on every request.
//
// Runtime reads and new checkout must never use an offline price or event
// fallback. Staff maintain the catalogue in the Control Room. A database
// outage therefore serves only a recently cached live value, or refuses the
// requested sale.
import {
  getActivePromos,
  bestAutoDiscountForProduct,
  applyDiscount,
  validatePromoCode,
  discountFromCodeRow,
} from './promos';
import { q, db } from './db';

// ---------------------------------------------------------------------------
// Cached read layer. 45s TTL: an admin price/event edit goes live within
// under a minute, while checkout (high traffic, payment-critical) never
// round-trips the DB on every single request.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 45_000;

interface ProductCacheRow { name: string; price: number }
let productsCache: { at: number; data: Record<string, ProductCacheRow> } | null = null;

export async function getProducts(): Promise<Record<string, ProductCacheRow>> {
  if (productsCache && Date.now() - productsCache.at < CACHE_TTL_MS) return productsCache.data;
  if (!db()) return productsCache?.data || {};
  try {
    const rows = await q<{ id: string; name: string; price: number }>(
      `SELECT id, name, price FROM products WHERE active ORDER BY id`
    );
    if (!rows.length) return productsCache?.data || {};
    const map: Record<string, ProductCacheRow> = {};
    for (const r of rows) map[r.id] = { name: r.name, price: Number(r.price) };
    productsCache = { at: Date.now(), data: map };
    return map;
  } catch {
    return productsCache?.data || {};
  }
}

export async function getProductPrice(id: string): Promise<ProductCacheRow | null> {
  const map = await getProducts();
  return map[id] || null;
}

export interface CatalogEvent {
  id: string; name: string; tagline: string; date: string; time: string;
  venue: string; city: string; image: string; accent: string;
  tiers: { name: string; price: number }[];
}

// "Sat 16 Aug 2026" from a DATE column value (already a 'YYYY-MM-DD' string
// or a pg-parsed Date at local midnight — normalized to a string first).
export function formatEventDate(v: unknown): string {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'TBA';
  const dt = new Date(s + 'T00:00:00Z');
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const day = dt.getUTCDate();
  const month = dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = dt.getUTCFullYear();
  return `${weekday} ${day} ${month} ${year}`;
}

let ticketedCache: { at: number; data: CatalogEvent[] } | null = null;

// Drop both in-memory catalogs so the next checkout prices from the fresh DB
// rows. Called by lib/server/public-cache.ts after any commercial mutation.
export function invalidateCatalogCaches(): void {
  productsCache = null;
  ticketedCache = null;
}

// Cached list of published ticketed events (kind='ticketed', status='published'),
// ordered priority DESC then event_date — the single source both
// getTicketTiers()/getTicketTier() (pricing) and lib/server/tickets.ts's
// getEventMeta()/getEventName() (display) read from.
export async function getTicketedEvents(): Promise<CatalogEvent[]> {
  if (ticketedCache && Date.now() - ticketedCache.at < CACHE_TTL_MS) return ticketedCache.data;
  if (!db()) return ticketedCache?.data || [];
  try {
    // event_date::text — see lib/server/db.ts's note on pg's DATE parser: cast
    // to text at the SQL level so the value is a plain 'YYYY-MM-DD' string,
    // never a local-midnight Date object whose re-serialization shifts by a
    // day off the server process's timezone.
    const rows = await q<any>(
      `SELECT id, kind, name, event_date::text AS event_date, date_label, event_time, venue, city, accent, image, description, tiers
       FROM tour_events WHERE kind='ticketed' AND status='published'
       ORDER BY priority DESC, event_date ASC NULLS LAST`
    );
    if (!rows.length) return ticketedCache?.data || [];
    const list: CatalogEvent[] = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      tagline: r.description || '',
      date: formatEventDate(r.event_date),
      time: r.event_time || '',
      venue: r.venue || '',
      city: r.city || '',
      image: r.image || '',
      accent: r.accent || '',
      tiers: (typeof r.tiers === 'string' ? JSON.parse(r.tiers) : r.tiers || []).map((t: any) => ({ name: String(t.name), price: Number(t.price) || 0 })),
    }));
    ticketedCache = { at: Date.now(), data: list };
    return list;
  } catch {
    return ticketedCache?.data || [];
  }
}

export async function getTicketTiers(): Promise<Record<string, { name: string; tiers: { name: string; price: number }[] }>> {
  const events = await getTicketedEvents();
  const map: Record<string, { name: string; tiers: { name: string; price: number }[] }> = {};
  for (const e of events) map[e.id] = { name: e.name, tiers: e.tiers };
  return map;
}

export async function getTicketTier(eventId: string, tierIndex: number): Promise<{ name: string; price: number } | null> {
  const tiers = await getTicketTiers();
  return tiers[eventId]?.tiers[tierIndex] || null;
}

export interface PricedLine {
  id: string;
  qty: number;
  name: string;
  unit: number; // final per-unit KES actually charged (after any promo)
  basePrice: number; // catalog price before any promo, for reference/receipts
  promoId: number | null;
}

export interface PromoTotalResult {
  total: number;
  lines: PricedLine[];
  // Set only when a buyer-supplied promoCode actually won the discount on at
  // least one line — the checkout route uses this to call
  // recordPromoCodeUse() once the order is durably created.
  appliedPromoCode: { promoId: number; promoName: string } | null;
}

// Promo-aware pricing — the ONE function every checkout route (M-Pesa/STK,
// Paystack, Stripe) calls, so active promos (and an
// optional buyer-supplied promo code) are honoured automatically with zero
// per-route pricing logic. Every line is repriced from getProducts() (the DB
// catalog, cached) here — the browser's cart only ever supplies {id, qty},
// never a price.
//
// Stacking rule: a promo code never stacks on top of an automatic (no-code)
// promo. Per line item, whichever discount is better for the buyer wins —
// the automatic storewide/product promo, or the supplied code — never both
// applied together. This is a deliberate simplification to avoid compounding
// discounts; revisit if the business wants codes to stack with flash sales.
export async function serverTotalWithPromos(
  items: { id: string; qty: number }[],
  promoCode?: string | null
): Promise<PromoTotalResult> {
  const [prices, promos, codeRow] = await Promise.all([
    getProducts(),
    getActivePromos(),
    promoCode ? validatePromoCode(promoCode) : Promise.resolve(null),
  ]);

  const lines: PricedLine[] = [];
  let total = 0;
  let appliedPromoCode: { promoId: number; promoName: string } | null = null;

  for (const it of items) {
    const p = prices[it.id];
    if (!p) throw new Error(`unknown product: ${it.id}`);
    const auto = bestAutoDiscountForProduct(promos, it.id);
    const fromCode = codeRow ? discountFromCodeRow(codeRow, it.id) : null;

    let winner: typeof auto = null;
    let winnerIsCode = false;
    if (auto && fromCode) {
      const autoPrice = applyDiscount(p.price, auto);
      const codePrice = applyDiscount(p.price, fromCode);
      if (codePrice < autoPrice) { winner = fromCode; winnerIsCode = true; }
      else { winner = auto; }
    } else if (fromCode) { winner = fromCode; winnerIsCode = true; }
    else if (auto) { winner = auto; }

    const unit = applyDiscount(p.price, winner);
    if (winnerIsCode && winner) appliedPromoCode = { promoId: winner.promoId, promoName: winner.promoName };
    lines.push({ id: it.id, qty: it.qty, name: p.name, unit, basePrice: p.price, promoId: winner ? winner.promoId : null });
    total += unit * it.qty;
  }

  return { total, lines, appliedPromoCode };
}

// Resolve a stored order row's items JSONB into displayable receipt lines.
// This is DISPLAY-ONLY formatting of an already-placed order, never a
// pricing decision. Every order created after the promo engine landed stores
// its own `unit` per line (see serverTotalWithPromos), so that stored price
// wins and a later catalog edit can never retroactively change a receipt.
// Older incomplete records deliberately show a generic name and KES 0 rather
// than borrowing a current or historical sample catalogue price.
export function orderLines(
  items: { id: string; qty: number; name?: string; unit?: number }[]
): { name: string; qty: number; unit: number; total: number }[] {
  return (Array.isArray(items) ? items : []).map((it) => {
    const qty = Number(it?.qty) || 0;
    const id = typeof it?.id === 'string' ? it.id : '';
    const storedUnit = typeof it?.unit === 'number' && Number.isFinite(it.unit) ? it.unit : null;
    if (id.startsWith('ticket:')) {
      const unit = storedUnit ?? 0;
      const name = it.name || 'Event ticket';
      return { name, qty, unit, total: unit * qty };
    }
    const unit = storedUnit ?? 0;
    return { name: it?.name || id || 'Item', qty, unit, total: unit * qty };
  });
}
