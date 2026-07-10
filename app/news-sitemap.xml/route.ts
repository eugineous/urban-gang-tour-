import { getBlogPosts } from '@/app/_lib/blog';
import { SITE } from '@/lib/site';

export const revalidate = 900; // regenerate every 15 minutes

// Google News sitemap (https://support.google.com/news/publisher-center).
// Per spec it lists only articles published in the last 48 hours — Google
// News crawls this far more aggressively than the regular sitemap. Older
// stories stay in /sitemap.xml.
export async function GET() {
  const posts = await getBlogPosts();
  const cutoff = Date.now() - 48 * 3600_000;
  const fresh = posts.filter((p) => new Date(p.datePublished).getTime() >= cutoff);

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const urls = fresh.map((p) => `  <url>
    <loc>${SITE.domain}/blog/${p.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Urban News — Urban Gang Tour</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${p.datePublished}</news:publication_date>
      <news:title>${esc(p.headline)}</news:title>
    </news:news>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
  });
}
