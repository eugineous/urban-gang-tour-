import { googleServiceAccountClient } from './google-auth';

// Real Search Console top-query data - genuine "what people actually typed
// into Google to find this site" data, unlike the old on-site search-box
// localStorage tracking it replaces. Falls back to null (caller hides the
// section) when SEARCH_CONSOLE_SITE_URL / GOOGLE_SERVICE_ACCOUNT_JSON aren't
// configured, or the query fails - never blocks the page.

export type TopQuery = { query: string; clicks: number; impressions: number };

// Ranked by impressions, not clicks: "Most Searched" means "what people
// typed into Google that surfaced this site" - impressions are the direct
// measure of that. Clicks lag impressions on a low-traffic/newly-indexed
// site (real queries can sit at 0 clicks for weeks while still being real,
// repeated searches), so ranking by clicks would show an empty section far
// longer than necessary while still being technically accurate either way.
export async function getTopSearchQueries(days = 28, limit = 8): Promise<TopQuery[] | null> {
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
  const client = googleServiceAccountClient(['https://www.googleapis.com/auth/webmasters.readonly']);
  if (!siteUrl || !client) return null;

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await client.request<{ rows?: { keys: string[]; clicks: number; impressions: number }[] }>({
      url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate: iso(start),
        endDate: iso(end),
        dimensions: ['query'],
        rowLimit: limit,
      },
    });
    const rows = res.data?.rows || [];
    return rows
      .map((r) => ({ query: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions) }))
      .filter((r) => r.impressions > 0)
      .sort((a, b) => b.impressions - a.impressions);
  } catch (e) {
    console.error('[search-console] query failed', e);
    return null;
  }
}
