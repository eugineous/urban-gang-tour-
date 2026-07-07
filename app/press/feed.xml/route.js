import { getBlogPosts } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const BASE_URL = "https://urbangangtour.co.ke";

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let posts = [];
  try {
    posts = await getBlogPosts("published");
  } catch {
    // Redis unavailable — return empty feed
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(b.datePublished ?? 0) - new Date(a.datePublished ?? 0)
  );

  const lastBuildDate = sorted[0]?.datePublished
    ? new Date(sorted[0].datePublished).toUTCString()
    : new Date().toUTCString();

  const items = sorted
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE_URL}/press/${escapeXml(post.slug)}</link>
      <guid isPermaLink="true">${BASE_URL}/press/${escapeXml(post.slug)}</guid>
      <pubDate>${post.datePublished ? new Date(post.datePublished).toUTCString() : ""}</pubDate>
      <description>${escapeXml(post.excerpt || post.title)}</description>
      ${post.author ? `<author>${escapeXml(post.author)}</author>` : ""}
      ${post.featuredImage ? `<enclosure url="${escapeXml(post.featuredImage)}" type="image/jpeg" length="0" />` : ""}
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Urban Gang Tour — Press &amp; Blog</title>
    <link>${BASE_URL}/press</link>
    <description>Stories, news, and updates from the Urban Gang Tour — Kenya's biggest school talent search.</description>
    <language>en-ke</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/press/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate",
    },
  });
}
