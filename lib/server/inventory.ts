import { q } from "@/lib/server/db";
import { ensureOpsSchema } from "@/lib/server/ops";

type OrderLine = { id?: unknown; qty?: unknown };

// A successful gateway callback can be delivered more than once. The partial
// unique index in OPS_SCHEMA makes this operation idempotent per product and
// order. It intentionally ignores untracked products: stock starts only when
// an authorised merch user records a verified opening/receiving movement.
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
  if (!Array.isArray(raw)) return;

  const quantities = new Map<string, number>();
  for (const line of raw as OrderLine[]) {
    const id = typeof line?.id === "string" ? line.id : "";
    const qty = Number(line?.qty);
    if (!id || id.startsWith("ticket:") || !Number.isInteger(qty) || qty < 1)
      continue;
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }

  await Promise.all(
    [...quantities].map(async ([productId, qty]) => {
      await q(
        `INSERT INTO merch_inventory_moves (product_id, quantity, move_type, note, reference)
         SELECT $1, $2, 'online_sale', $3, $4
         WHERE EXISTS (SELECT 1 FROM products WHERE id=$1 AND inventory_tracked=true)
         ON CONFLICT DO NOTHING`,
        [
          productId,
          -qty,
          "Automatically recorded when this online order was paid.",
          order.id,
        ],
      );
    }),
  );
}
