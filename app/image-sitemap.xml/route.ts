import { SITE } from '@/lib/site';
import { hasDb, q } from '@/lib/server/db';
import mediaLibrary from '@/ui/data/media-library.json';
import publicRoutes from '@/data/public-page-routes.json';
export const dynamic = 'force-dynamic';

const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[char]!));

function publicImageUrl(raw: string): string | null {
  try {
    const url = new URL(raw, SITE.domain);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export async function GET() {
  const base = SITE.domain;
  const entries: { pageUrl: string; imageUrl: string; title: string }[] = [];

  // Index the same approved archive rendered by the current gallery. The old
  // hardcoded list described retired template photographs and omitted the
  // current campus, commercial and high-school collection pages.
  for (const asset of mediaLibrary.assets) {
    const collectionPath = `/gallery/${asset.collection}`;
    if (asset.adult || asset.kind === 'video' || !publicRoutes.includes(collectionPath)) continue;
    const imageUrl = publicImageUrl(asset.src);
    if (imageUrl) entries.push({ pageUrl: `${base}${collectionPath}`, imageUrl, title: asset.title });
  }

  // DB gallery items
  if (hasDb()) {
    try {
      const rows = await q<{ url: string; caption: string; page_url?: string }>(
        `SELECT url, COALESCE(caption, '') AS caption FROM gallery_items WHERE status='published' AND url IS NOT NULL LIMIT 200`
      );
      for (const r of rows) {
        const imageUrl = publicImageUrl(r.url);
        if (imageUrl) entries.push({ pageUrl: `${base}/gallery`, imageUrl, title: r.caption || 'Urban Gang Tour Gallery' });
      }
    } catch { /* db not ready */ }
  }

  // Product images
  if (hasDb()) {
    try {
      const rows = await q<{ id: string; name: string; image_url: string }>(
        `SELECT id, name, COALESCE(image_url,'') AS image_url FROM products WHERE active AND image_url IS NOT NULL AND image_url <> '' LIMIT 100`
      );
      for (const r of rows) {
        const imageUrl = publicImageUrl(r.image_url);
        if (imageUrl) entries.push({ pageUrl: `${base}/shop/${encodeURIComponent(r.id)}`, imageUrl, title: r.name });
      }
    } catch { /* db not ready */ }
  }

  // Build XML — group images by page URL
  const urlGroups = new Map<string, { imageUrl: string; title: string }[]>();
  for (const e of entries) {
    if (!urlGroups.has(e.pageUrl)) urlGroups.set(e.pageUrl, []);
    urlGroups.get(e.pageUrl)!.push({ imageUrl: e.imageUrl, title: e.title });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...[...urlGroups.entries()].map(([pageUrl, images]) =>
      `<url><loc>${escapeXml(pageUrl)}</loc>${images.map((img) => `<image:image><image:loc>${escapeXml(img.imageUrl)}</image:loc><image:title>${escapeXml(img.title)}</image:title></image:image>`).join('')}</url>`
    ),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
