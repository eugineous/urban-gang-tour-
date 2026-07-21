import { q, db } from '@/lib/server/db';
import { getGa4BlogViews } from '@/lib/server/ga4';
import { getTopSearchQueries } from '@/lib/server/search-console';
import type { BlogPost } from './blog';

// Server-side data for the /blog "Urban News" page. Everything here is a
// real DB query — no hardcoded sample content. Route dates are computed
// server-side (once, per request) instead of the client-side race the
// homepage's STOPS bridge has (see the 2026-07-21 fix) — SSR sidesteps that
// whole class of bug by construction.

export type RouteRow = {
  date: string;
  school: string;
  note: string;
  county: string;
  status: 'NEXT STOP' | 'CONFIRMED' | 'SCHEDULING' | 'DONE';
};

export async function getUpcomingStops(): Promise<RouteRow[]> {
  if (!db()) return [];
  try {
    const rows = await q<any>(
      `SELECT name, event_date::text AS event_date, date_label, venue, description
       FROM tour_events WHERE kind='school' AND status IN ('published','completed')
       ORDER BY priority DESC, event_date ASC NULLS LAST`
    );
    const today = new Date().toISOString().slice(0, 10);
    const withDate = rows.filter((r) => r.event_date).slice().sort((a, b) => a.event_date.localeCompare(b.event_date));
    const nextRow = withDate.find((r) => r.event_date >= today);
    return rows
      .filter((r) => !r.event_date || r.event_date >= today) // drop done stops from the board entirely
      .map((r) => {
        let date = r.date_label || 'TBA';
        let status: RouteRow['status'] = 'SCHEDULING';
        if (r.event_date) {
          const d = new Date(r.event_date + 'T00:00:00Z');
          date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).toUpperCase().replace(' ', ' ');
          status = nextRow && r.name === nextRow.name ? 'NEXT STOP' : 'CONFIRMED';
        }
        return {
          date,
          school: r.name,
          note: r.description || (r.event_date ? 'Full production day' : 'Dates still being finalised'),
          county: r.venue || '',
          status,
        };
      });
  } catch {
    return [];
  }
}

export type SidebarStory = { title: string; slug: string; image: string; metric: string };

// "Most read" / "trending" from the real first-party page-view counter
// (app/api/track/route.ts -> traffic table), not invented numbers. A brand
// new post has zero hits until real visitors accrue them — that's honest,
// not a bug.
type TrendingMostRead = {
  trending: { title: string; slug: string; views: string; delta: string }[];
  mostRead: SidebarStory[];
};

function buildFromHits(
  posts: BlogPost[],
  hits: { slug: string; hits7: number; hitsPrev7: number; hits30: number }[]
): TrendingMostRead {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const stats = hits.filter((s) => bySlug.has(s.slug));

  const trending = stats
    .filter((s) => s.hits7 > 0)
    .sort((a, b) => b.hits7 - a.hits7)
    .slice(0, 5)
    .map((s) => {
      const post = bySlug.get(s.slug)!;
      const delta = s.hitsPrev7 === 0 && s.hits7 > 0 ? '▲ new' : s.hits7 > s.hitsPrev7 ? '▲' : s.hits7 < s.hitsPrev7 ? '▼' : '—';
      return { title: post.headline, slug: s.slug, views: String(s.hits7), delta };
    });

  const mostRead = stats
    .filter((s) => s.hits30 > 0)
    .sort((a, b) => b.hits30 - a.hits30)
    .slice(0, 3)
    .map((s) => {
      const post = bySlug.get(s.slug)!;
      return { title: post.headline, slug: s.slug, image: post.image, metric: String(s.hits30) };
    });

  return { trending, mostRead };
}

// Real GA4 data when configured (GOOGLE_SERVICE_ACCOUNT_JSON + GA4_PROPERTY_ID),
// falling back to the first-party traffic table when it isn't - both are
// genuinely real, this just prefers Google's own numbers once available.
async function trendingFromGa4(posts: BlogPost[]): Promise<TrendingMostRead | null> {
  const [last7, prev7, last30] = await Promise.all([
    getGa4BlogViews('7daysAgo', 'today'),
    getGa4BlogViews('14daysAgo', '8daysAgo'),
    getGa4BlogViews('30daysAgo', 'today'),
  ]);
  if (!last7 || !prev7 || !last30) return null;

  const toSlug = (path: string) => path.replace(/^\/blog\//, '').replace(/\/$/, '');
  const map7 = new Map(last7.map((r) => [toSlug(r.path), r.views]));
  const mapPrev7 = new Map(prev7.map((r) => [toSlug(r.path), r.views]));
  const map30 = new Map(last30.map((r) => [toSlug(r.path), r.views]));
  const slugs = new Set([...map7.keys(), ...map30.keys()]);

  const hits = Array.from(slugs).map((slug) => ({
    slug,
    hits7: map7.get(slug) || 0,
    hitsPrev7: mapPrev7.get(slug) || 0,
    hits30: map30.get(slug) || 0,
  }));
  return buildFromHits(posts, hits);
}

async function trendingFromTrafficTable(posts: BlogPost[]): Promise<TrendingMostRead> {
  if (!db()) return { trending: [], mostRead: [] };
  try {
    const rows = await q<{ path: string; hits7: string; hits_prev7: string; hits30: string }>(
      `SELECT path,
              SUM(hits) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days')::text AS hits7,
              SUM(hits) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '14 days' AND day < CURRENT_DATE - INTERVAL '7 days')::text AS hits_prev7,
              SUM(hits) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '30 days')::text AS hits30
       FROM traffic WHERE path LIKE '/blog/%' GROUP BY path`
    );
    const hits = rows.map((r) => ({
      slug: r.path.replace('/blog/', ''),
      hits7: Number(r.hits7 || 0),
      hitsPrev7: Number(r.hits_prev7 || 0),
      hits30: Number(r.hits30 || 0),
    }));
    return buildFromHits(posts, hits);
  } catch {
    return { trending: [], mostRead: [] };
  }
}

export async function getTrendingAndMostRead(posts: BlogPost[]): Promise<TrendingMostRead> {
  // GA4 returns null only on missing config/failure - a real call that
  // succeeds with zero rows (GA4 tracking is newer and consent-gated, so it
  // naturally lags the first-party traffic table) still needs to fall
  // through, or a page with real traffic-table data would show an empty
  // sidebar just because GA4 hasn't caught up yet.
  const ga4 = await trendingFromGa4(posts);
  if (ga4 && (ga4.trending.length || ga4.mostRead.length)) return ga4;
  const traffic = await trendingFromTrafficTable(posts);
  if (traffic.trending.length || traffic.mostRead.length) return traffic;
  return ga4 || traffic;
}

// Real Search Console top-query data - what people actually typed into
// Google to find this site. Returns [] when not configured (Google Cloud
// service account / SEARCH_CONSOLE_SITE_URL not set) rather than showing
// anything invented - see the 2026-07-21 removal of the old fake-seeded
// "Most Searched" for why this must never fall back to made-up numbers.
export async function getMostSearched(): Promise<{ term: string; count: number }[]> {
  const queries = await getTopSearchQueries();
  if (!queries) return [];
  // impressions, not clicks - see getTopSearchQueries' comment on why.
  return queries.map((q) => ({ term: q.query, count: q.impressions }));
}
