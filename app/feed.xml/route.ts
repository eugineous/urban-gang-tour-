import { getBlogPosts } from '@/app/_lib/blog';
import { SITE } from '@/lib/site';

export const revalidate = 900; // match news-sitemap: fresh within 15 minutes

// RSS 2.0 feed for Urban News. Complements /news-sitemap.xml (Google News,
// 48h window) with the full recent archive for RSS readers, Google Publisher
// Center's feed slot, and any aggregator that discovers it via the
// rel="alternate" link every page now carries (see app/_lib/seo.ts).
export async function GET() {
  const posts = (await getBlogPosts()).slice(0, 50);

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const items = posts.map((p) => {
    const url = `${SITE.domain}/blog/${p.slug}`;
    return `    <item>
      <title>${esc(p.headline)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.datePublished + 'T06:00:00Z').toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
      <category>${esc(p.section)}</category>
      <media:content url="${SITE.domain}${esc(p.image)}" medium="image" />
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Urban News — Urban Gang Tour</title>
    <link>${SITE.domain}/blog</link>
    <atom:link href="${SITE.domain}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Kenya's school-talent paper of record: tour stops, talent features and culture from Urban Gang Tour.</description>
    <language>en-ke</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
  });
}
