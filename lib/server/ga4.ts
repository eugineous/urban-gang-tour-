import { googleServiceAccountClient } from './google-auth';

// Real GA4 Data API reads for the /blog "Urban News" sidebar - replaces the
// first-party traffic-table version of Trending/Most Read with Google's own
// numbers once GOOGLE_SERVICE_ACCOUNT_JSON + GA4_PROPERTY_ID are configured.
// Falls back to null (caller uses the traffic-table version) on any failure -
// this is a nice-to-have upgrade, never something that can break the page.

type Row = { path: string; views: number };

async function runReport(body: Record<string, unknown>): Promise<any | null> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const client = googleServiceAccountClient(['https://www.googleapis.com/auth/analytics.readonly']);
  if (!propertyId || !client) return null;
  try {
    const res = await client.request({
      url: `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      method: 'POST',
      data: body,
    });
    return res.data;
  } catch (e) {
    console.error('[ga4] runReport failed', e);
    return null;
  }
}

function parseRows(data: any): Row[] {
  const rows = data?.rows;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: any) => ({
      path: String(r.dimensionValues?.[0]?.value || ''),
      views: Number(r.metricValues?.[0]?.value || 0),
    }))
    .filter((r: Row) => r.path.startsWith('/blog/'));
}

// startDate/endDate accept GA4's relative syntax ('7daysAgo', 'today', etc.)
export async function getGa4BlogViews(startDate: string, endDate: string): Promise<Row[] | null> {
  const data = await runReport({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/blog/' } },
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: '50',
  });
  if (!data) return null;
  return parseRows(data);
}
