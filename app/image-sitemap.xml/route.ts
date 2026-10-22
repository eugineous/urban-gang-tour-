import { SITE } from '@/lib/site';
import { hasDb, q } from '@/lib/server/db';
import mediaLibrary from '@/ui/data/media-library.json';
import publicRoutes from '@/data/public-page-routes.json';
import {getBlogPosts} from '@/app/_lib/blog';
import {discoveryImageUrl, PRESENTER_DISCOVERY_IMAGES} from '@/app/_lib/seo';
import {PUBLIC_EVENT_STATUSES, isPubliclyVisible} from '@/lib/server/event-lifecycle';
import {publicPartnerDetails} from '@/lib/partner-events';
export const dynamic = 'force-dynamic';

const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[char]!));

export async function GET() {
  const base = SITE.domain;
  const entries: { pageUrl: string; imageUrl: string; title: string }[] = [];
  for(const post of await getBlogPosts())for(const image of new Set([post.image,post.ogImage].filter(Boolean) as string[])){
    const imageUrl=discoveryImageUrl(image);if(imageUrl)entries.push({pageUrl:`${base}/blog/${encodeURIComponent(post.slug)}`,imageUrl,title:post.headline});
  }
  for (const [path, image] of Object.entries(PRESENTER_DISCOVERY_IMAGES)) {
    const imageUrl = discoveryImageUrl(image);
    if (imageUrl) entries.push({ pageUrl: base + path, imageUrl, title: path.endsWith('lucy-ogunde') ? 'Lucy Ogunde' : 'Eugine Micah' });
  }

  // Index the same approved archive rendered by the current gallery. The old
  // hardcoded list described retired template photographs and omitted the
  // current campus, commercial and high-school collection pages.
  for (const asset of mediaLibrary.assets) {
    const collectionPath = `/gallery/${asset.collection}`;
    if (asset.adult || asset.kind === 'video' || !publicRoutes.includes(collectionPath)) continue;
    const imageUrl = discoveryImageUrl(asset.src);
    if (imageUrl) entries.push({ pageUrl: `${base}${collectionPath}`, imageUrl, title: asset.title });
  }

  // DB gallery items
  if (hasDb()) {
    try {
      const rows = await q<{ url: string; caption: string }>(
        `SELECT url, COALESCE(NULLIF(caption,''),alt_text,'') AS caption FROM gallery_photos
         WHERE published=true AND url IS NOT NULL ORDER BY sort_order ASC,id ASC`
      );
      for (const r of rows) {
        const imageUrl = discoveryImageUrl(r.url);
        if (imageUrl) entries.push({ pageUrl: `${base}/gallery`, imageUrl, title: r.caption || 'Urban Gang Tour Gallery' });
      }
    } catch { /* db not ready */ }
  }

  // Product images
  if (hasDb()) {
    try {
      const rows = await q<{ id: string; name: string; image_url: string; photos?: unknown }>(
        `SELECT id, name, COALESCE(NULLIF(to_jsonb(products)->>'image',''),to_jsonb(products)->>'image_url','') AS image_url,
                to_jsonb(products)->'photos' AS photos
         FROM products WHERE active ORDER BY id`
      );
      for (const r of rows) {
        const photos = Array.isArray(r.photos) ? r.photos.filter((image): image is string => typeof image === 'string') : [];
        for (const image of new Set([r.image_url, ...photos])) {
          const imageUrl = discoveryImageUrl(image);
          if (imageUrl) entries.push({ pageUrl: `${base}/shop/${encodeURIComponent(r.id)}`, imageUrl, title: r.name });
        }
      }
    } catch { /* db not ready */ }
  }

  // Posters belong to each canonical event detail URL, including completed
  // public portfolio records. Private drafts and malformed partner metadata
  // never become an alternative path for discovering unpublished artwork.
  if (hasDb()) {
    try {
      const rows = await q<{slug: string; kind: string; status: string; name: string; image: string; partner_details: unknown}>(
        `SELECT slug,kind,status,name,image,to_jsonb(tour_events)->'partner_details' AS partner_details
         FROM tour_events WHERE kind IN ('ticketed','partner','school','past')
           AND status=ANY($1) AND slug != '' ORDER BY event_date ASC,slug ASC`,
        [[...PUBLIC_EVENT_STATUSES]],
      );
      for (const row of rows) {
        if (!isPubliclyVisible(row.status) || !/^[a-z0-9-]{1,80}$/.test(row.slug)) continue;
        const details = row.kind === 'partner' ? publicPartnerDetails(row.partner_details) : null;
        if (row.kind === 'partner' && !details) continue;
        const artwork = [{ url: row.image, caption: details?.posterCaption || row.name }, ...(details?.posters || [])];
        for (const poster of artwork) {
          const imageUrl = discoveryImageUrl(poster.url);
          if (imageUrl) entries.push({ pageUrl: `${base}/events/${encodeURIComponent(row.slug)}`, imageUrl, title: poster.caption || row.name });
        }
      }
    } catch { /* no stale or private event snapshot on an unavailable database */ }
  }

  // Build XML — group images by page URL
  const urlGroups = new Map<string, { imageUrl: string; title: string }[]>();
  for (const e of entries) {
    if (!urlGroups.has(e.pageUrl)) urlGroups.set(e.pageUrl, []);
    const images = urlGroups.get(e.pageUrl)!;
    // Google accepts up to 1000 images per page. Duplicated covers, portraits
    // and poster variants should not consume that budget repeatedly.
    if (images.length < 1000 && !images.some(image => image.imageUrl === e.imageUrl)) images.push({ imageUrl: e.imageUrl, title: e.title });
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
      'Cache-Control': 'no-store',
    },
  });
}
