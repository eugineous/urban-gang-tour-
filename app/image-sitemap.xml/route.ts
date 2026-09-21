import { SITE } from '@/lib/site';
import { hasDb, q } from '@/lib/server/db';
export const dynamic = 'force-dynamic';

const STATIC_GALLERY = [
  { file: 'campus-rave.jpg', title: 'Campus Rave — Urban Gang Tour' },
  { file: 'lari.jpg', title: 'Lari Event — Urban Gang Tour' },
  { file: 'loreto.jpg', title: 'Loreto Event — Urban Gang Tour' },
  { file: 'ngeya.jpg', title: 'Ngeya Event — Urban Gang Tour' },
  { file: 'koinange.jpg', title: 'Koinange Event — Urban Gang Tour' },
  { file: 'g-crowning.jpg', title: 'Crowning Ceremony — Urban Gang Tour' },
  { file: 'festival-colours.jpg', title: 'Festival of Colours — Urban Gang Tour' },
  { file: 'crew.jpg', title: 'UGT Crew — Urban Gang Tour' },
  { file: 'g-runway.jpg', title: 'Runway Show — Urban Gang Tour' },
  { file: 'g-street.jpg', title: 'Street Performance — Urban Gang Tour' },
  { file: 'xp-dance.jpg', title: 'Dance Experience — Urban Gang Tour' },
  { file: 'staugustine.jpg', title: 'St Augustine Event — Urban Gang Tour' },
  { file: 'maimahiu-girls.jpg', title: 'Maimahiu Girls — Urban Gang Tour' },
  { file: 'maimahiu-boys.jpg', title: 'Maimahiu Boys — Urban Gang Tour' },
  { file: 'gituamba.jpg', title: 'Gituamba Event — Urban Gang Tour' },
  { file: 'g-winning.jpg', title: 'Winners — Urban Gang Tour' },
  { file: 'g-trees.jpg', title: 'Outdoor Event — Urban Gang Tour' },
  { file: 'drkiano.jpg', title: 'Dr Kiano Event — Urban Gang Tour' },
];

export async function GET() {
  const base = SITE.domain;
  const entries: { pageUrl: string; imageUrl: string; title: string }[] = [];

  // Static gallery images
  for (const img of STATIC_GALLERY) {
    entries.push({ pageUrl: `${base}/gallery`, imageUrl: `${base}/assets/gal/${img.file}`, title: img.title });
  }

  // DB gallery items
  if (hasDb()) {
    try {
      const rows = await q<{ url: string; caption: string; page_url?: string }>(
        `SELECT url, COALESCE(caption, '') AS caption FROM gallery_items WHERE status='published' AND url IS NOT NULL LIMIT 200`
      );
      for (const r of rows) {
        entries.push({ pageUrl: `${base}/gallery`, imageUrl: r.url, title: r.caption || 'Urban Gang Tour Gallery' });
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
        entries.push({ pageUrl: `${base}/shop/${encodeURIComponent(r.id)}`, imageUrl: r.image_url, title: r.name });
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
      `<url><loc>${pageUrl}</loc>${images.map((img) => `<image:image><image:loc>${img.imageUrl}</image:loc><image:title>${img.title.replace(/[<>&"']/g, '')}</image:title></image:image>`).join('')}</url>`
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
