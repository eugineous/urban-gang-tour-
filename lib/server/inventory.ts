import { db, q } from "@/lib/server/db";
import { ensureOpsSchema } from "@/lib/server/ops";
import { isConfirmedPayment } from "@/lib/server/payment-status";

type OrderLine = { id?: unknown; qty?: unknown; variant?: unknown };
type StockLine = { productId: string; variant?: string; qty: number };

function paidLines(raw: unknown): StockLine[] | null {
  if (!Array.isArray(raw)) return [];
  const quantities = new Map<string, StockLine>();
  for (const line of raw as OrderLine[]) {
    if (typeof line?.id === "string" && line.id.startsWith("ticket:")) continue;
    const productId = typeof line?.id === "string" ? line.id : "";
    const qty = Number(line?.qty);
    const hasVariant = line?.variant !== undefined;
    const variant = typeof line?.variant === "string" ? line.variant : undefined;
    if (!productId || !Number.isSafeInteger(qty) || qty < 1 || (hasVariant && (!variant || variant.length > 100))) return null;
    const key = `${productId}\u0000${variant || ""}`;
    const current = quantities.get(key);
    quantities.set(key, { productId, variant, qty: (current?.qty || 0) + qty });
  }
  return [...quantities.values()].sort((a, b) =>
    `${a.productId}\u0000${a.variant || ""}`.localeCompare(`${b.productId}\u0000${b.variant || ""}`),
  );
}

// Checkout's early read gives buyers a useful immediate response. It is not
// the final correctness boundary: settlement repeats the checks under locks.
export async function assertMerchStockAvailable(items: unknown): Promise<void> {
  await ensureOpsSchema();
  const lines = paidLines(items);
  if (lines === null) throw new Error("invalid_inventory_line");
  if (!lines.length) return;
  const productQuantities = new Map<string, number>();
  for (const line of lines) productQuantities.set(line.productId, (productQuantities.get(line.productId) || 0) + line.qty);
  for (const [productId, requested] of productQuantities) {
    const rows = await q<{ inventory_tracked: boolean; on_hand: number }>(
      `SELECT p.inventory_tracked, COALESCE(SUM(m.quantity),0)::int AS on_hand
       FROM products p LEFT JOIN merch_inventory_moves m ON m.product_id=p.id
       WHERE p.id=$1 GROUP BY p.id, p.inventory_tracked`, [productId],
    );
    if (!rows.length) throw new Error("unknown_product");
    if (rows[0].inventory_tracked && Number(rows[0].on_hand) < requested) throw new Error("insufficient_inventory");
  }
  for (const line of lines) {
    if (!line.variant) continue;
    const rows = await q<{ movement_count: number; on_hand: number }>(
      `SELECT COUNT(m.id)::int AS movement_count, COALESCE(SUM(m.quantity),0)::int AS on_hand
       FROM merch_variants v LEFT JOIN merch_inventory_moves m ON m.variant_id=v.id
       WHERE v.product_id=$1 AND v.label=$2 GROUP BY v.id`, [line.productId, line.variant],
    );
    if (!rows.length) throw new Error("unknown_variant");
    if (Number(rows[0].movement_count) > 0 && Number(rows[0].on_hand) < line.qty) throw new Error("variant_out_of_stock");
  }
}

// The final inventory consequence for a confirmed order. A per-order advisory
// lock makes replay idempotent; ordered product/variant locks serialize
// competing orders. Every movement is written in one transaction.
export async function recordPaidMerchOrder(order: { id: string; items: unknown; status?: unknown }): Promise<void> {
  if (!isConfirmedPayment(order.status)) return;
  await ensureOpsSchema();
  let raw: unknown = order.items;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { throw new Error("invalid_inventory_lines"); }
  }
  const lines = paidLines(raw);
  if (lines === null) throw new Error("invalid_inventory_line");
  if (!lines.length) return;

  const pool = db();
  if (!pool) throw new Error("db_not_configured");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`merch:${order.id}`]);
    const existing = await client.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM merch_inventory_moves WHERE move_type='online_sale' AND reference=$1`, [order.id],
    );
    const existingCount = Number(existing.rows[0]?.n || 0);
    if (existingCount === lines.length) {
      await client.query("COMMIT");
      return;
    }
    if (existingCount > 0) throw new Error("inventory_consequence_incomplete");

    const resolved: Array<StockLine & { variantId: number | null }> = [];
    for (const line of lines) {
      const product = await client.query<{ inventory_tracked: boolean }>(
        "SELECT inventory_tracked FROM products WHERE id=$1 FOR UPDATE", [line.productId],
      );
      if (!product.rows.length) throw new Error("unknown_product");
      const productOnHand = await client.query<{ on_hand: number }>(
        "SELECT COALESCE(SUM(quantity),0)::int AS on_hand FROM merch_inventory_moves WHERE product_id=$1", [line.productId],
      );
      if (product.rows[0].inventory_tracked && Number(productOnHand.rows[0]?.on_hand || 0) < line.qty) throw new Error("insufficient_inventory");

      let variantId: number | null = null;
      if (line.variant) {
        const variant = await client.query<{ id: number }>(
          "SELECT id FROM merch_variants WHERE product_id=$1 AND label=$2 FOR UPDATE", [line.productId, line.variant],
        );
        if (!variant.rows.length) throw new Error("unknown_variant");
        variantId = variant.rows[0].id;
        const variantOnHand = await client.query<{ movement_count: number; on_hand: number }>(
          `SELECT COUNT(*)::int AS movement_count, COALESCE(SUM(quantity),0)::int AS on_hand
           FROM merch_inventory_moves WHERE variant_id=$1`, [variantId],
        );
        if (Number(variantOnHand.rows[0]?.movement_count || 0) > 0 && Number(variantOnHand.rows[0]?.on_hand || 0) < line.qty) throw new Error("variant_out_of_stock");
      }
      resolved.push({ ...line, variantId });
    }
    for (const line of resolved) {
      await client.query(
        `INSERT INTO merch_inventory_moves (product_id, variant_id, quantity, move_type, note, reference)
         VALUES ($1,$2,$3,'online_sale',$4,$5)`,
        [line.productId, line.variantId, -line.qty, "Automatically recorded when this online order was paid.", order.id],
      );
    }
    await client.query(`INSERT INTO merch_fulfillments (order_id) VALUES ($1) ON CONFLICT (order_id) DO NOTHING`, [order.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
