import { mediaConfigured } from '@/lib/server/media';
import { hasDb, q } from '@/lib/server/db';
import { cached } from '@/lib/server/microcache';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export const dynamic = 'force-dynamic';

// Public operational counts only. Never return URLs, document payloads,
// customer details, environment values or credentials.
export async function GET(req: Request) {
  if (!rateLimit('media-health:' + clientIp(req), 10, 60_000)) return Response.json({ error: 'too_many_requests' }, { status: 429 });
  if (!hasDb()) return Response.json({ configured: mediaConfigured(), inventory: 'database_unavailable' }, { status: 503 });
  try {
    const inventory = await cached('media-storage-inventory', 300_000, async () => {
      const sources: Record<string, string[]> = {
        gallery_photos: ['url'], products: ['image'], tour_events: ['image', 'logo'],
        marketplace_events: ['image'], ug_documents: ['pdf_url', 'png_url'],
      };
      const columns = await q<{ table_name: string; column_name: string }>(
        `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])`, [Object.keys(sources)],
      );
      const selects = columns.filter(c => sources[c.table_name]?.includes(c.column_name))
        .map(c => `SELECT ${c.column_name} AS url FROM ${c.table_name}`);
      if (columns.some(c => c.table_name === 'ug_documents' && c.column_name === 'payload')) {
        for (const field of ['heroImages', 'partnerLogos']) selects.push(
          `SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(payload->'${field}')='array' THEN payload->'${field}' ELSE '[]'::jsonb END) AS url FROM ug_documents`,
        );
      }
      if (!selects.length) return { references: 0, legacyBucketReferences: 0, externalReferences: 0 };
      const rows = await q<{ references: string; legacy: string; external: string }>(
        `WITH media AS (${selects.join(' UNION ALL ')}) SELECT count(*) FILTER (WHERE coalesce(url,'')<>'') AS references,
         count(*) FILTER (WHERE url ~* '(r2[.]dev|r2[.]cloudflarestorage[.]com|unconfigured://R2_)') AS legacy,
         count(*) FILTER (WHERE url ~* '^https?://') AS external FROM media`,
      );
      return { references: Number(rows[0]?.references || 0), legacyBucketReferences: Number(rows[0]?.legacy || 0), externalReferences: Number(rows[0]?.external || 0) };
    });
    return Response.json({ configured: mediaConfigured(), storage: 'workers-kv', inventory }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ configured: mediaConfigured(), inventory: 'temporarily_unavailable' }, { status: 503 });
  }
}
