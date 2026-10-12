import { hasDb, q } from './db';
import { normalizePrintableName } from '../shared/merch-personalization';

type PersonalizationRequest = { id: string; printableName?: unknown };
type MerchLine = { id: string; printableName?: string };

// Personalization is free and explicitly enabled by staff for each product.
// Preserve the request's line index: two names on the same size are two
// production instructions, even though inventory still sums their quantities.
export async function applyVerifiedMerchPersonalization<T extends MerchLine>(
  items: PersonalizationRequest[],
  baseLines: T[],
): Promise<T[]> {
  const lines = baseLines.map((line) => ({ ...line }));
  const requested = items.map((item, index) => ({
    id: item.id, index, printableName: normalizePrintableName(item.printableName),
  })).filter((item) => item.printableName !== undefined);
  if (!requested.length) return lines;
  if (!hasDb()) throw new Error('personalization_catalog_unavailable');
  const ids = [...new Set(requested.map((item) => item.id))];
  const products = await q<{ id: string; name_on_back_enabled: boolean }>(
    `SELECT p.id, COALESCE((to_jsonb(p)->>'name_on_back_enabled')::boolean, false) AS name_on_back_enabled
     FROM products p WHERE p.id=ANY($1::text[]) AND p.active=true`, [ids],
  );
  const eligible = new Set(products.filter((product) => product.name_on_back_enabled === true).map((product) => product.id));
  for (const item of requested) {
    if (!eligible.has(item.id)) throw new Error('personalization_not_available');
    if (!lines[item.index] || lines[item.index].id !== item.id) throw new Error('unknown_product');
    lines[item.index].printableName = item.printableName;
  }
  return lines;
}
