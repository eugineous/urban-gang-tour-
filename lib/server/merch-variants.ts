import { hasDb, q } from "@/lib/server/db";

export type VariantRequest = { id: string; qty: number; variant?: string };
export type PricedMerchLine = {
  id: string;
  qty: number;
  name: string;
  unit: number;
  variant?: string;
};

// Prices and labels for variant choices are never accepted from the browser.
// The cart can contain two choices for the same product, so preserve the line
// index instead of looking up a product id and accidentally applying both
// choices to the first matching line.
export async function applyVerifiedMerchVariants(
  items: VariantRequest[],
  baseLines: PricedMerchLine[],
): Promise<{ lines: PricedMerchLine[]; adjustment: number }> {
  const lines = baseLines.map((line) => ({ ...line }));
  const requested = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => item.variant);
  if (!requested.length) return { lines, adjustment: 0 };
  if (!hasDb()) throw new Error("variant_catalog_unavailable");

  let adjustment = 0;
  for (const item of requested) {
    const rows = await q<{ label: string; price_adjustment: number }>(
      `SELECT label, price_adjustment FROM merch_variants
       WHERE product_id=$1 AND label=$2 AND active=true`,
      [item.id, item.variant],
    );
    if (!rows.length) throw new Error("unknown_variant");
    const line = lines[item.index];
    if (!line || line.id !== item.id) throw new Error("unknown_product");
    const priceAdjustment = Number(rows[0].price_adjustment || 0);
    line.variant = rows[0].label;
    line.name = `${line.name} (${rows[0].label})`;
    line.unit += priceAdjustment;
    adjustment += priceAdjustment * line.qty;
  }
  return { lines, adjustment };
}
