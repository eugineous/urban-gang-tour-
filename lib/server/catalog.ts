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

export function serverTotal(items: { id: string; qty: number }[]): number {
  return items.reduce((sum, it) => {
    const p = PRICES[it.id];
    if (!p) throw new Error(`unknown product: ${it.id}`);
    return sum + p.price * it.qty;
  }, 0);
}
