import {q, hasDb} from './db';
import {ensureOpsSchema} from './ops';
import {cached} from './microcache';

export type PublicProduct = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  image: string;
  category: string;
  description: string;
  name_on_back_enabled: boolean;
  made_to_order: boolean;
  variants: {label: string; priceAdjustment: number; sku: string; stock: number | null}[];
};

type ProductRow = {
  id: string;
  name: string;
  price: number | string;
  stock?: number | string | null;
  image?: string | null;
  category?: string | null;
  description?: string | null;
  name_on_back_enabled?: boolean;
  made_to_order?: boolean;
  variants?: unknown;
};
type VariantRow = {label?: unknown; priceAdjustment?: unknown; sku?: unknown; stock?: unknown};

/** Shared public catalogue only. Retired products remain private to historical receipts. */
export async function readPublicProducts(): Promise<PublicProduct[]> {
  if (!hasDb()) throw new Error('catalog_unavailable');
  return cached('site-products', 60_000, async () => {
    // Read the existing catalogue first. A normal public request must not run
    // unrelated admin DDL; initialise only a genuinely missing table/column.
    const read = () => q<ProductRow>(
      `SELECT p.id, p.name, p.price, p.image, p.category, p.description,
              COALESCE((to_jsonb(p)->>'name_on_back_enabled')::boolean, false) AS name_on_back_enabled,
              p.made_to_order,
              CASE WHEN p.inventory_tracked AND NOT p.made_to_order THEN (SELECT COALESCE(SUM(quantity),0)::int FROM merch_inventory_moves WHERE product_id=p.id) ELSE NULL END AS stock,
              COALESCE(
                jsonb_agg(jsonb_build_object('label',v.label,'priceAdjustment',v.price_adjustment,'sku',v.sku,'stock',(SELECT CASE WHEN p.made_to_order THEN NULL WHEN COUNT(*)>0 THEN COALESCE(SUM(quantity),0)::int ELSE NULL END FROM merch_inventory_moves WHERE variant_id=v.id))
                  ORDER BY v.label) FILTER (WHERE v.id IS NOT NULL),
                '[]'::jsonb
              ) AS variants
       FROM products p
       LEFT JOIN merch_variants v ON v.product_id=p.id AND v.active=true
       WHERE p.active
       GROUP BY p.id, p.name, p.price, p.image, p.category, p.description, p.inventory_tracked
       ORDER BY p.id`,
    );
    let rows: ProductRow[];
    try { rows = await read(); }
    catch (error) {
      const code = publicCatalogDatabaseErrorCode(error);
      if (code !== '42P01' && code !== '42703') throw error;
      await ensureOpsSchema();
      rows = await read();
    }
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      stock: row.made_to_order || row.stock === null || row.stock === undefined ? null : Math.max(0, Number(row.stock)),
      image: row.image || '',
      category: row.category || '',
      description: row.description || '',
      name_on_back_enabled: row.name_on_back_enabled === true,
      made_to_order: row.made_to_order === true,
      variants: Array.isArray(row.variants) ? row.variants.map((variant: VariantRow) => ({
        label: String(variant.label || ''),
        priceAdjustment: Number(variant.priceAdjustment || 0),
        sku: String(variant.sku || ''),
        stock: row.made_to_order || variant.stock === null || variant.stock === undefined ? null : Math.max(0, Number(variant.stock)),
      })).filter((variant) => variant.label) : [],
    }));
  }, false);
}

/** SQLSTATE only: never return or log driver messages, SQL or credentials. */
export function publicCatalogDatabaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  return typeof error.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : null;
}

/** Fixed, redacted diagnostics only; provider text never leaves this function. */
export function publicCatalogDatabaseDiagnostic(error: unknown): {
  code:string;category:'sqlstate'|'provider_http'|'transport'|'provider_capacity'|'credential'|'unknown';status?:number;
} {
  const code=publicCatalogDatabaseErrorCode(error)||'unclassified';
  const value=error&&typeof error==='object'?error as {message?:unknown;sourceError?:unknown}:{};
  const message=typeof value.message==='string'?value.message:'';
  const match=/^Server error \(HTTP status ([45]\d{2})\):/.exec(message);
  const status=match?Number(match[1]):undefined;
  const http=status===undefined?{}:{status};
  if(code==='28P01'||/\bauthentication\s+failed\b|\b(?:credentials?|password)\b.*\b(?:invalid|rejected)\b/i.test(message))return {code,category:'credential',...http};
  if(code!=='unclassified')return {code,category:'sqlstate',...http};
  if(/\bquota\b|\bcompute (?:time|usage|hours?)\b.*\b(?:exceeded|limit)\b/i.test(message))return {code,category:'provider_capacity',...http};
  if(status!==undefined)return {code,category:'provider_http',status};
  if(value.sourceError||/\bfetch failed\b|\bnetwork(?:error| error)\b|\berror connecting to database\b/i.test(message))return {code,category:'transport'};
  return {code,category:'unknown'};
}
