// Server-side price catalog — the ONLY source of truth for amounts.
// Never trust prices sent from the browser.
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

// Resolve a stored order row's items JSONB into displayable receipt lines.
// Merch ids resolve against PRICES; ticket ids ('ticket:<eventId>:<tier>')
// resolve against TICKET_TIERS, preferring the name stored on the item.
export function orderLines(
  items: { id: string; qty: number; name?: string }[]
): { name: string; qty: number; unit: number; total: number }[] {
  return (Array.isArray(items) ? items : []).map((it) => {
    const qty = Number(it?.qty) || 0;
    const id = typeof it?.id === 'string' ? it.id : '';
    if (id.startsWith('ticket:')) {
      const [, eventId, tierIdx] = id.split(':');
      const ev = TICKET_TIERS[eventId];
      const tier = ev ? ev.tiers[Number(tierIdx)] : undefined;
      const unit = tier ? tier.price : 0;
      const name = it.name || (ev && tier ? ev.name + ' - ' + tier.name : 'Event ticket');
      return { name, qty, unit, total: unit * qty };
    }
    const p = PRICES[id];
    const unit = p ? p.price : 0;
    return { name: it?.name || (p ? p.name : id || 'Item'), qty, unit, total: unit * qty };
  });
}
