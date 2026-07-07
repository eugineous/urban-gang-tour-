import { getBlogPosts } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const BASE_URL = "https://urbangangtour.co.ke";
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  let posts = [];
  try {
    posts = await getBlogPosts("published");
  } catch {
    // Redis unavailable — return empty sitemap
  }

  const cutoff = Date.now() - TWO_YEARS_MS;
  const recent = posts.filter((p) => {
    if (!p.datePublished) return false;
    const ts = new Date(p.datePublished).getTime();
    return ts > cutoff && ts <= Date.now();
  });

  const urls = recent
    .map(
      (post) => `
  <url>
    <loc>${BASE_URL}/press/${escapeXml(post.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>Urban News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(post.datePublished).toISOString()}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
      <news:keywords>${escapeXml(post.keywords || post.tags || "Urban Gang Tour, Urban News Kenya")}</news:keywords>
    </news:news>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate",
    },
  });
}
