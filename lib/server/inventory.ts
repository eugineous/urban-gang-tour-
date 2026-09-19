import { q } from "@/lib/server/db";
import { ensureOpsSchema } from "@/lib/server/ops";

type OrderLine = { id?: unknown; qty?: unknown; variant?: unknown };
type StockLine = { productId: string; variant?: string; qty: number };

function paidLines(raw: unknown): StockLine[] {
  if (!Array.isArray(raw)) return [];
  const quantities = new Map<string, StockLine>();
  for (const line of raw as OrderLine[]) {
    const productId = typeof line?.id === "string" ? line.id : "";
    const qty = Number(line?.qty);
    const variant = typeof line?.variant === "string" ? line.variant : undefined;
    if (
      !productId ||
      productId.startsWith("ticket:") ||
      !Number.isInteger(qty) ||
      qty < 1
    )
      continue;
    const key = `${productId}\u0000${variant || ""}`;
    const current = quantities.get(key);
    quantities.set(key, {
      productId,
      variant,
      qty: (current?.qty || 0) + qty,
    });
  }
  return [...quantities.values()];
}

// A product-level count protects every tracked product. When a team has begun
// recording a particular variant separately, that variant receives an
// additional guard. Historic product-wide movements remain valid and are not
// misrepresented as a size or colour count.
export async function assertMerchStockAvailable(items: unknown): Promise<void> {
  await ensureOpsSchema();
  const lines = paidLines(items);
  if (!lines.length) return;
  const productQuantities = new Map<string, number>();
  for (const line of lines)
    productQuantities.set(
      line.productId,
      (productQuantities.get(line.productId) || 0) + line.qty,
    );

  for (const [productId, requested] of productQuantities) {
    const rows = await q<{ inventory_tracked: boolean; on_hand: number }>(
      `SELECT p.inventory_tracked, COALESCE(SUM(m.quantity),0)::int AS on_hand
       FROM products p LEFT JOIN merch_inventory_moves m ON m.product_id=p.id
       WHERE p.id=$1 GROUP BY p.id, p.inventory_tracked`,
      [productId],
    );
    if (!rows.length) throw new Error("unknown_product");
    if (rows[0].inventory_tracked && Number(rows[0].on_hand) < requested)
      throw new Error("insufficient_inventory");
  }

  for (const line of lines) {
    if (!line.variant) continue;
    const rows = await q<{ movement_count: number; on_hand: number }>(
      `SELECT COUNT(m.id)::int AS movement_count,
              COALESCE(SUM(m.quantity),0)::int AS on_hand
       FROM merch_variants v LEFT JOIN merch_inventory_moves m ON m.variant_id=v.id
       WHERE v.product_id=$1 AND v.label=$2
       GROUP BY v.id`,
      [line.productId, line.variant],
    );
    if (!rows.length) throw new Error("unknown_variant");
    if (Number(rows[0].movement_count) > 0 && Number(rows[0].on_hand) < line.qty)
      throw new Error("variant_out_of_stock");
  }
}

// A successful gateway callback can be delivered more than once. The partial
// unique index in OPS_SCHEMA makes this operation idempotent per product,
// variant and order. It intentionally ignores untracked products: stock starts
// only when an authorised merch user records a verified opening/receiving
// movement.
export async function recordPaidMerchOrder(order: {
  id: string;
  items: unknown;
}): Promise<void> {
  await ensureOpsSchema();
  let raw: unknown = order.items;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return;
    }
  }
  const lines = paidLines(raw);
  if (!lines.length) return;

  // This creates a real work item for paid merchandise only. Existing paid
  // orders are also surfaced by the Fulfilment desk as "new" until a staff
  // member updates them, so launching this feature does not lose history.
  await q(
    `INSERT INTO merch_fulfillments (order_id) VALUES ($1)
     ON CONFLICT (order_id) DO NOTHING`,
    [order.id],
  );

  await Promise.all(
    lines.map(async ({ productId, variant, qty }) => {
      const variantRows = variant
        ? await q<{ id: number }>(
            `SELECT id FROM merch_variants WHERE product_id=$1 AND label=$2`,
            [productId, variant],
          )
        : [];
      await q(
        `INSERT INTO merch_inventory_moves (product_id, variant_id, quantity, move_type, note, reference)
         SELECT $1, $2, $3, 'online_sale', $4, $5
         WHERE EXISTS (SELECT 1 FROM products WHERE id=$1 AND inventory_tracked=true)
         ON CONFLICT DO NOTHING`,
        [
          productId,
          variantRows[0]?.id ?? null,
          -qty,
          "Automatically recorded when this online order was paid.",
          order.id,
        ],
      );
    }),
  );
}
