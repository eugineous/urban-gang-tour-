// Server-side price catalog — the ONLY source of truth for amounts.
// Never trust prices sent from the browser.
import {
  getActivePromos,
  bestAutoDiscountForProduct,
  applyDiscount,
  validatePromoCode,
  discountFromCodeRow,
} from './promos';

export const PRICES: Record<string, { name: string; price: number }> = {
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

// Ticket tiers per event - mirrors the template's MAIN_EVENTS data exactly.
// The server never trusts tier prices from the browser.
export const TICKET_TIERS: Record<string, { name: string; tiers: { name: string; price: number }[] }> = {
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
    name: 'Campus Rave \u2014 Nairobi Edition',
    tiers: [
      { name: 'Regular', price: 1000 },
      { name: 'VIP', price: 2500 },
      { name: 'VVIP', price: 6000 },
    ],
  },
};

export function serverTotal(items: { id: string; qty: number }[]): number {
  return items.reduce((sum, it) => {
    const p = PRICES[it.id];
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
// per-route pricing logic. Every line is repriced from PRICES here — the
// browser's cart only ever supplies {id, qty}, never a price.
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
  const [promos, codeRow] = await Promise.all([
    getActivePromos(),
    promoCode ? validatePromoCode(promoCode) : Promise.resolve(null),
  ]);

  const lines: PricedLine[] = [];
  let total = 0;
  let appliedPromoCode: { promoId: number; promoName: string } | null = null;

  for (const it of items) {
    const p = PRICES[it.id];
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
// Merch ids resolve against PRICES; ticket ids ('ticket:<eventId>:<tier>')
// resolve against TICKET_TIERS, preferring the name stored on the item.
// If the stored item carries its own `unit` (every order created after the
// promo engine landed does — see serverTotalWithPromos), that price wins so
// a discounted order's receipt matches what was actually charged, even after
// the promo itself later expires or changes. Older orders without a stored
// `unit` fall back to the live catalog/tier price as before.
export function orderLines(
  items: { id: string; qty: number; name?: string; unit?: number }[]
): { name: string; qty: number; unit: number; total: number }[] {
  return (Array.isArray(items) ? items : []).map((it) => {
    const qty = Number(it?.qty) || 0;
    const id = typeof it?.id === 'string' ? it.id : '';
    const storedUnit = typeof it?.unit === 'number' && Number.isFinite(it.unit) ? it.unit : null;
    if (id.startsWith('ticket:')) {
      const [, eventId, tierIdx] = id.split(':');
      const ev = TICKET_TIERS[eventId];
      const tier = ev ? ev.tiers[Number(tierIdx)] : undefined;
      const unit = storedUnit ?? (tier ? tier.price : 0);
      const name = it.name || (ev && tier ? ev.name + ' - ' + tier.name : 'Event ticket');
      return { name, qty, unit, total: unit * qty };
    }
    const p = PRICES[id];
    const unit = storedUnit ?? (p ? p.price : 0);
    return { name: it?.name || (p ? p.name : id || 'Item'), qty, unit, total: unit * qty };
  });
}
