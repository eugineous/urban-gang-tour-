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
// FALLBACK_* below are frozen literals of the tour's real content at the time
// this migration shipped. They serve two purposes: (1) the one-time seed
// inserted into the DB tables (idempotent — see ensureCatalogSeeded), and
// (2) an offline fallback so a DB hiccup degrades to "today's real prices"
// rather than breaking checkout.
import {
  getActivePromos,
  bestAutoDiscountForProduct,
  applyDiscount,
  validatePromoCode,
  discountFromCodeRow,
} from './promos';
import { q, db } from './db';
import { ensureOpsSchema } from './ops';

export const FALLBACK_PRICES: Record<string, { name: string; price: number }> = {
  p1: { name: 'Magenta Oversized Tee', price: 2500 },
  p2: { name: 'Black Crewneck Sweatshirt', price: 3800 },
  p3: { name: 'Structured Snapback', price: 1800 },
  p4: { name: 'Bucket Hat', price: 1600 },
  p5: { name: 'Canvas Tote', price: 1200 },
  p6: { name: 'Cuffed Beanie', price: 1400 },
  p7: { name: 'Insulated Bottle', price: 2200 },
  p8: { name: 'Wristband Pack', price: 500 },
  p9: { name: 'Drawstring Gym Sack', price: 1500 },
  p10: { name: 'Cropped Baby Tee', price: 2200 },
  p11: { name: 'Football Jersey', price: 3200 },
  p12: { name: 'Crossbody Waist Bag', price: 2000 },
  p13: { name: 'Woven Lanyard', price: 400 },
  p14: { name: 'Sticker Sheet', price: 300 },
};

// Full seed rows for `products` — id, name, price, image, category, description.
const SEED_PRODUCTS: { id: string; name: string; price: number; image: string; category: string; description: string }[] = [
  { id: 'p1', name: 'Magenta Oversized Tee', price: 2500, image: '/assets/merch/magenta-tee.png', category: 'Apparel', description: 'Heavyweight oversized tee in signature magenta. Boxy fit, drop shoulder, tour print. You wore this when it happened.' },
  { id: 'p2', name: 'Black Crewneck Sweatshirt', price: 3800, image: '/assets/merch/crewneck.png', category: 'Apparel', description: 'Heavyweight brushed-fleece crewneck. Warm, boxy, built for late load-outs and cold campus mornings.' },
  { id: 'p3', name: 'Structured Snapback', price: 1800, image: '/assets/merch/snapback.png', category: 'Headwear', description: 'Six-panel structured snapback, flat brim, embroidered mark. Adjustable, one size.' },
  { id: 'p4', name: 'Bucket Hat', price: 1600, image: '/assets/merch/bucket-hat.png', category: 'Headwear', description: 'All-day festival bucket hat. Shade for the field, statement for the feed.' },
  { id: 'p5', name: 'Canvas Tote', price: 1200, image: '/assets/merch/tote.png', category: 'Accessories', description: 'Heavy cotton canvas tote. Carries merch, books, and the whole vibe.' },
  { id: 'p6', name: 'Cuffed Beanie', price: 1400, image: '/assets/merch/beanie.png', category: 'Headwear', description: 'Ribbed cuffed knit beanie with woven tab. Crew-approved.' },
  { id: 'p7', name: 'Insulated Bottle', price: 2200, image: '/assets/merch/bottle.png', category: 'Accessories', description: 'Matte-black double-wall insulated steel bottle. Cold all day on the road.' },
  { id: 'p8', name: 'Wristband Pack', price: 500, image: '/assets/merch/wristbands.png', category: 'Accessories', description: 'Silicone wristband pack. The cheapest way to rep the gang.' },
  { id: 'p9', name: 'Drawstring Gym Sack', price: 1500, image: '/assets/merch/gym-sack.png', category: 'Accessories', description: 'Lightweight drawstring sack for kit, shoes, and merch runs.' },
  { id: 'p10', name: 'Cropped Baby Tee', price: 2200, image: '/assets/merch/baby-tee.png', category: 'Apparel', description: 'Fitted cropped baby tee. Clean, cropped, loud on the timeline.' },
  { id: 'p11', name: 'Football Jersey', price: 3200, image: '/assets/merch/jersey.png', category: 'Apparel', description: 'Breathable football-style jersey. Team colours, tour badge.' },
  { id: 'p12', name: 'Crossbody Waist Bag', price: 2000, image: '/assets/merch/waist-bag.png', category: 'Accessories', description: 'Crossbody waist bag for phone, cards, and backstage passes.' },
  { id: 'p13', name: 'Woven Lanyard', price: 400, image: '/assets/merch/lanyard.png', category: 'Accessories', description: 'Black woven lanyard for passes, keys and backstage energy.' },
  { id: 'p14', name: 'Sticker Sheet', price: 300, image: '/assets/merch/stickers.png', category: 'Accessories', description: 'Die-cut vinyl sticker sheet. Laptops, bottles, matatu windows.' },
];

// Ticket tiers per event - mirrors the seed data below exactly.
// The server never trusts tier prices from the browser.
export const FALLBACK_TICKET_TIERS: Record<string, { name: string; tiers: { name: string; price: number }[] }> = {
  'xp-dance': {
    name: 'The Experience Hub Dance Event',
    tiers: [
      { name: 'Regular', price: 500 },
      { name: 'VIP', price: 1500 },
      { name: 'VVIP Table', price: 5000 },
    ],
  },
  'festival-colours': {
    name: 'Urban Festival Of Colours',
    tiers: [
      { name: 'Early Bird', price: 800 },
      { name: 'Regular', price: 1200 },
      { name: 'VIP', price: 3000 },
    ],
  },
  'campus-rave': {
    name: 'Campus Rave — Nairobi Edition',
    tiers: [
      { name: 'Regular', price: 1000 },
      { name: 'VIP', price: 2500 },
      { name: 'VVIP', price: 6000 },
    ],
  },
};

export const FALLBACK_EVENT_META: Record<
  string,
  { date: string; time: string; venue: string; city: string; accent: string }
> = {
  'xp-dance': { date: 'Sat 16 Aug 2026', time: '2:00 PM', venue: 'KICC Grounds', city: 'Nairobi', accent: '#E6218C' },
  'festival-colours': { date: 'Sat 20 Sep 2026', time: '11:00 AM', venue: 'Uhuru Gardens', city: 'Nairobi', accent: '#21C7E6' },
  'campus-rave': { date: 'Fri 3 Oct 2026', time: '4:00 PM', venue: 'Carnivore Grounds', city: 'Nairobi', accent: '#FFD400' },
};

// Full seed rows for `tour_events` — priority is seeded in strictly descending
// order matching the exact display order the site shipped with, so ORDER BY
// priority DESC reproduces today's order until an admin re-prioritises.
interface SeedTourEvent {
  id: string; kind: 'ticketed' | 'school' | 'past'; name: string;
  event_date: string | null; date_label: string; event_time: string;
  venue: string; city: string; accent: string; status: string; priority: number;
  image: string; description: string; tiers: { name: string; price: number }[];
  logo: string; testimonial: string;
}
const SEED_TOUR_EVENTS: SeedTourEvent[] = [
  // ---- ticketed (MAIN_EVENTS) ----
  { id: 'xp-dance', kind: 'ticketed', name: 'The Experience Hub Dance Event', event_date: '2026-08-16', date_label: '', event_time: '2:00 PM', venue: 'KICC Grounds', city: 'Nairobi', accent: '#E6218C', status: 'published', priority: 300, image: '/assets/gal/xp-dance.jpg', description: 'The dance takeover — crews, cyphers, hype sets and celebrity performances.', tiers: [{ name: 'Regular', price: 500 }, { name: 'VIP', price: 1500 }, { name: 'VVIP Table', price: 5000 }], logo: '', testimonial: '' },
  { id: 'festival-colours', kind: 'ticketed', name: 'Urban Festival Of Colours', event_date: '2026-09-20', date_label: '', event_time: '11:00 AM', venue: 'Uhuru Gardens', city: 'Nairobi', accent: '#21C7E6', status: 'published', priority: 290, image: '/assets/gal/festival-colours.jpg', description: 'One field, a thousand colours, dancers, DJs and non-stop hype.', tiers: [{ name: 'Early Bird', price: 800 }, { name: 'Regular', price: 1200 }, { name: 'VIP', price: 3000 }], logo: '', testimonial: '' },
  { id: 'campus-rave', kind: 'ticketed', name: 'Campus Rave — Nairobi Edition', event_date: '2026-10-03', date_label: '', event_time: '4:00 PM', venue: 'Carnivore Grounds', city: 'Nairobi', accent: '#FFD400', status: 'published', priority: 280, image: '/assets/gal/campus-rave.jpg', description: 'The tour, fully grown. Bigger stage, bigger sound, broadcast-ready.', tiers: [{ name: 'Regular', price: 1000 }, { name: 'VIP', price: 2500 }, { name: 'VVIP', price: 6000 }], logo: '', testimonial: '' },
  // ---- school (STOPS) ----
  { id: 'koinange', kind: 'school', name: 'Senior Chief Koinange Girls', event_date: '2026-05-30', date_label: '', event_time: '', venue: 'Kiambu County', city: '', accent: '', status: 'published', priority: 200, image: '/assets/gal/koinange.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'loreto', kind: 'school', name: 'Loreto Kiambu Girls High', event_date: '2026-06-01', date_label: '', event_time: '', venue: 'Kiambu County', city: '', accent: '', status: 'published', priority: 190, image: '/assets/gal/loreto.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'gituamba', kind: 'school', name: 'Gituamba Girls High School', event_date: '2026-06-07', date_label: '', event_time: '', venue: 'Kiambu County', city: '', accent: '', status: 'published', priority: 180, image: '/assets/gal/gituamba.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'lari', kind: 'school', name: 'Lari Boys High School', event_date: '2026-07-19', date_label: '', event_time: '', venue: 'Kimende, Lari, Kiambu County', city: '', accent: '', status: 'published', priority: 170, image: '/assets/gal/lari.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'ngeya', kind: 'school', name: 'Ngeya Girls’ Secondary School', event_date: '2026-07-24', date_label: '', event_time: '', venue: 'Naivasha, Nakuru County', city: '', accent: '', status: 'published', priority: 160, image: '/assets/gal/ngeya.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'staugustine', kind: 'school', name: 'St. Augustine Secondary School', event_date: '2026-07-28', date_label: '', event_time: '', venue: 'Mlolongo, Machakos County', city: '', accent: '', status: 'published', priority: 150, image: '/assets/gal/staugustine.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'maimahiu-boys', kind: 'school', name: 'Maai Mahiu Boys High School', event_date: null, date_label: 'TBA · JUL 2026', event_time: '', venue: 'Maai Mahiu, Nakuru County', city: '', accent: '', status: 'published', priority: 140, image: '/assets/gal/maimahiu-boys.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'maimahiu-girls', kind: 'school', name: 'Maai Mahiu Girls High School', event_date: null, date_label: 'TBA · AUG 2026', event_time: '', venue: 'Maai Mahiu, Nakuru County', city: '', accent: '', status: 'published', priority: 130, image: '/assets/gal/maimahiu-girls.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'drkiano', kind: 'school', name: 'Dr. Kiano Boys High School', event_date: null, date_label: 'TBA · AUG 2026', event_time: '', venue: 'Githiga, Kangema, Murang’a County', city: '', accent: '', status: 'published', priority: 120, image: '/assets/gal/drkiano.jpg', description: '', tiers: [], logo: '', testimonial: '' },
  // ---- past (WORKS) ----
  { id: 'goshen', kind: 'past', name: 'Goshen Group of Schools', event_date: null, date_label: '', event_time: '', venue: 'Nakuru', city: '', accent: '', status: 'completed', priority: 100, image: '', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'achego', kind: 'past', name: 'Achego Girls High School', event_date: null, date_label: '', event_time: '', venue: 'Muhoroni, Kisumu County', city: '', accent: '', status: 'completed', priority: 90, image: '', description: '', tiers: [], logo: '', testimonial: '' },
  { id: 'campus-rave-editions', kind: 'past', name: 'Campus Rave Editions', event_date: null, date_label: '', event_time: '', venue: 'Nairobi Region', city: '', accent: '', status: 'completed', priority: 80, image: '', description: '', tiers: [], logo: '', testimonial: '' },
];

// Idempotent one-time seed: inserts the reconciled real content above with
// ON CONFLICT DO NOTHING, so re-running never duplicates or clobbers an
// admin's later edits. Called lazily by the cached getters below and by the
// public site-data routes on their first hit against an empty table.
let seeded = false;
export async function ensureCatalogSeeded(): Promise<void> {
  if (seeded || !db()) return;
  await ensureOpsSchema();
  const [pCount, eCount] = await Promise.all([
    q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM products`),
    q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM tour_events`),
  ]);
  if (Number(pCount[0]?.n) === 0) {
    for (const p of SEED_PRODUCTS) {
      await q(
        `INSERT INTO products (id, name, price, image, category, description) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.price, p.image, p.category, p.description]
      );
    }
  }
  if (Number(eCount[0]?.n) === 0) {
    for (const e of SEED_TOUR_EVENTS) {
      await q(
        `INSERT INTO tour_events (id, kind, name, slug, event_date, date_label, event_time, venue, city, accent, status, priority, image, description, tiers, logo, testimonial)
         VALUES ($1,$2,$3,$1,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.kind, e.name, e.event_date, e.date_label, e.event_time, e.venue, e.city, e.accent, e.status, e.priority, e.image, e.description, JSON.stringify(e.tiers), e.logo, e.testimonial]
      );
    }
  }
  seeded = true;
}

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
  if (!db()) return FALLBACK_PRICES;
  try {
    await ensureCatalogSeeded();
    const rows = await q<{ id: string; name: string; price: number }>(
      `SELECT id, name, price FROM products WHERE active ORDER BY id`
    );
    if (!rows.length) return productsCache?.data || FALLBACK_PRICES;
    const map: Record<string, ProductCacheRow> = {};
    for (const r of rows) map[r.id] = { name: r.name, price: Number(r.price) };
    productsCache = { at: Date.now(), data: map };
    return map;
  } catch {
    return productsCache?.data || FALLBACK_PRICES;
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

// Cached list of published ticketed events (kind='ticketed', status='published'),
// ordered priority DESC then event_date — the single source both
// getTicketTiers()/getTicketTier() (pricing) and lib/server/tickets.ts's
// getEventMeta()/getEventName() (display) read from.
export async function getTicketedEvents(): Promise<CatalogEvent[]> {
  if (ticketedCache && Date.now() - ticketedCache.at < CACHE_TTL_MS) return ticketedCache.data;
  if (!db()) return fallbackTicketedEvents();
  try {
    await ensureCatalogSeeded();
    // event_date::text — see lib/server/db.ts's note on pg's DATE parser: cast
    // to text at the SQL level so the value is a plain 'YYYY-MM-DD' string,
    // never a local-midnight Date object whose re-serialization shifts by a
    // day off the server process's timezone.
    const rows = await q<any>(
      `SELECT id, kind, name, event_date::text AS event_date, date_label, event_time, venue, city, accent, image, description, tiers
       FROM tour_events WHERE kind='ticketed' AND status='published'
       ORDER BY priority DESC, event_date ASC NULLS LAST`
    );
    if (!rows.length) return ticketedCache?.data || fallbackTicketedEvents();
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
    return ticketedCache?.data || fallbackTicketedEvents();
  }
}

function fallbackTicketedEvents(): CatalogEvent[] {
  return Object.entries(FALLBACK_TICKET_TIERS).map(([id, ev]) => {
    const meta = FALLBACK_EVENT_META[id];
    return {
      id, name: ev.name, tagline: '', date: meta?.date || 'TBA', time: meta?.time || '',
      venue: meta?.venue || '', city: meta?.city || '', image: '', accent: meta?.accent || '',
      tiers: ev.tiers,
    };
  });
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

export function serverTotal(items: { id: string; qty: number }[]): number {
  return items.reduce((sum, it) => {
    const p = FALLBACK_PRICES[it.id];
    if (!p) throw new Error(`unknown product: ${it.id}`);
    return sum + p.price * it.qty;
  }, 0);
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
// Paystack, Stripe) calls instead of serverTotal(), so active promos (and an
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
// pricing decision, so it intentionally stays synchronous against the frozen
// FALLBACK_* literals rather than the live cache: every order created after
// the promo engine landed already stores its own `unit` per line (see
// serverTotalWithPromos), so that stored price wins and a later catalog edit
// can never retroactively change what a past receipt shows. Only orders that
// predate that (or a stored line missing a name) fall back to the frozen
// literal here, purely to avoid a blank name/price on very old receipts.
export function orderLines(
  items: { id: string; qty: number; name?: string; unit?: number }[]
): { name: string; qty: number; unit: number; total: number }[] {
  return (Array.isArray(items) ? items : []).map((it) => {
    const qty = Number(it?.qty) || 0;
    const id = typeof it?.id === 'string' ? it.id : '';
    const storedUnit = typeof it?.unit === 'number' && Number.isFinite(it.unit) ? it.unit : null;
    if (id.startsWith('ticket:')) {
      const [, eventId, tierIdx] = id.split(':');
      const ev = FALLBACK_TICKET_TIERS[eventId];
      const tier = ev ? ev.tiers[Number(tierIdx)] : undefined;
      const unit = storedUnit ?? (tier ? tier.price : 0);
      const name = it.name || (ev && tier ? ev.name + ' - ' + tier.name : 'Event ticket');
      return { name, qty, unit, total: unit * qty };
    }
    const p = FALLBACK_PRICES[id];
    const unit = storedUnit ?? (p ? p.price : 0);
    return { name: it?.name || (p ? p.name : id || 'Item'), qty, unit, total: unit * qty };
  });
}
