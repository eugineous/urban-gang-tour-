import { googleServiceAccountClient } from './google-auth';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

type GoogleApiError = { response?: { status?: number } };

export type SearchConsoleConnectionState =
  | 'not_configured'
  | 'connected'
  | 'property_unavailable'
  | 'service_unavailable';

export type SearchConsoleOverview = {
  configured: boolean;
  property: string | null;
  state: SearchConsoleConnectionState;
  checkedAt: string;
  permissionLevel?: string;
  sitemaps?: {
    path: string;
    pending: boolean;
    errors: number;
    warnings: number;
    lastSubmitted: string | null;
    lastDownloaded: string | null;
  }[];
  performance?: {
    startDate: string;
    endDate: string;
    daysWithData: number;
    clicks: number;
    impressions: number;
    ctr: number | null;
    position: number | null;
  };
};

export type UrlInspection = {
  inspectionUrl: string;
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: string | null;
  userCanonical: string | null;
  googleCanonical: string | null;
};

type SearchAnalyticsRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

export function configuredSearchConsoleProperty(): string | null {
  const property = process.env.SEARCH_CONSOLE_SITE_URL?.trim() || '';
  // Search Console accepts URL-prefix properties and sc-domain properties.
  // Do not call Google with an arbitrary env value, because the resulting
  // error is both unhelpful in the Control Room and easy to avoid here.
  if (!/^https:\/\/[^/]+\/?$/i.test(property) && !/^sc-domain:[a-z0-9.-]+$/i.test(property)) return null;
  return property;
}

function statusOf(error: unknown): number | undefined {
  return (error as GoogleApiError | undefined)?.response?.status;
}

function utcDate(daysBeforeToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysBeforeToday);
  return date.toISOString().slice(0, 10);
}

function cleanText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

// Read-only technical overview for the Control Room. It makes no changes to
// a Search Console property, sitemap, or Google index. A missing connection
// is presented as missing, never as a traffic or indexing result.
export async function getSearchConsoleOverview(): Promise<SearchConsoleOverview> {
  const property = configuredSearchConsoleProperty();
  const client = googleServiceAccountClient([SEARCH_CONSOLE_SCOPE]);
  const checkedAt = new Date().toISOString();
  if (!property || !client) {
    return { configured: false, property, state: 'not_configured', checkedAt };
  }

  const propertyPath = encodeURIComponent(property);
  try {
    const site = await client.request<{ permissionLevel?: string }>({
      url: `https://www.googleapis.com/webmasters/v3/sites/${propertyPath}`,
      method: 'GET',
    });

    const endDate = utcDate(3);
    const startDate = utcDate(30);
    // A failed nonessential report should not erase a successful verification
    // result. Each field is simply omitted until Google can supply it.
    const [sitemapResult, performanceResult] = await Promise.allSettled([
      client.request<{ sitemap?: any[] }>({
        url: `https://www.googleapis.com/webmasters/v3/sites/${propertyPath}/sitemaps`,
        method: 'GET',
      }),
      client.request<{ rows?: SearchAnalyticsRow[] }>({
        url: `https://www.googleapis.com/webmasters/v3/sites/${propertyPath}/searchAnalytics/query`,
        method: 'POST',
        data: { startDate, endDate, dimensions: ['date'], searchType: 'web', rowLimit: 100 },
      }),
    ]);

    const overview: SearchConsoleOverview = {
      configured: true,
      property,
      state: 'connected',
      checkedAt,
      permissionLevel: cleanText(site.data?.permissionLevel) || undefined,
    };

    if (sitemapResult.status === 'fulfilled') {
      overview.sitemaps = (sitemapResult.value.data?.sitemap || []).map((entry: any) => ({
        path: cleanText(entry.path) || 'Unnamed sitemap',
        pending: entry.isPending === true,
        errors: Math.max(0, Number(entry.errors) || 0),
        warnings: Math.max(0, Number(entry.warnings) || 0),
        lastSubmitted: cleanText(entry.lastSubmitted),
        lastDownloaded: cleanText(entry.lastDownloaded),
      }));
    }
    if (performanceResult.status === 'fulfilled') {
      const rows = performanceResult.value.data?.rows || [];
      const clicks = rows.reduce((total, row) => total + (Number(row.clicks) || 0), 0);
      const impressions = rows.reduce((total, row) => total + (Number(row.impressions) || 0), 0);
      const weightedPosition = rows.reduce((total, row) => total + (Number(row.position) || 0) * (Number(row.impressions) || 0), 0);
      overview.performance = {
        startDate,
        endDate,
        daysWithData: rows.length,
        clicks: Math.round(clicks),
        impressions: Math.round(impressions),
        ctr: impressions > 0 ? clicks / impressions : null,
        position: impressions > 0 ? Math.round((weightedPosition / impressions) * 10) / 10 : null,
      };
    }
    return overview;
  } catch (error) {
    const status = statusOf(error);
    return {
      configured: true,
      property,
      state: status === 401 || status === 403 || status === 404 ? 'property_unavailable' : 'service_unavailable',
      checkedAt,
    };
  }
}

export function safeInspectionUrl(raw: unknown, property: string): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const candidate = new URL(raw);
    if (candidate.protocol !== 'https:') return null;
    if (property.startsWith('sc-domain:')) {
      const domain = property.slice('sc-domain:'.length).toLowerCase();
      const hostname = candidate.hostname.toLowerCase();
      if (hostname !== domain && !hostname.endsWith(`.${domain}`)) return null;
    } else {
      const site = new URL(property);
      if (candidate.origin !== site.origin) return null;
    }
    candidate.hash = '';
    return candidate.toString();
  } catch {
    return null;
  }
}

// URL Inspection is an explicit, read-only operator action. It is deliberately
// separate from the overview to avoid spending inspection quota on page loads.
export async function inspectSearchUrl(rawUrl: unknown): Promise<UrlInspection | null> {
  const property = configuredSearchConsoleProperty();
  const client = googleServiceAccountClient([SEARCH_CONSOLE_SCOPE]);
  const inspectionUrl = property ? safeInspectionUrl(rawUrl, property) : null;
  if (!property || !client || !inspectionUrl) return null;
  const response = await client.request<{ inspectionResult?: { indexStatusResult?: Record<string, unknown> } }>({
    url: 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    method: 'POST',
    data: { inspectionUrl, siteUrl: property, languageCode: 'en-US' },
  });
  const result = response.data?.inspectionResult?.indexStatusResult || {};
  return {
    inspectionUrl,
    verdict: cleanText(result.verdict),
    coverageState: cleanText(result.coverageState),
    robotsTxtState: cleanText(result.robotsTxtState),
    indexingState: cleanText(result.indexingState),
    pageFetchState: cleanText(result.pageFetchState),
    lastCrawlTime: cleanText(result.lastCrawlTime),
    userCanonical: cleanText(result.userCanonical),
    googleCanonical: cleanText(result.googleCanonical),
  };
}

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
  const client = googleServiceAccountClient([SEARCH_CONSOLE_SCOPE]);
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
