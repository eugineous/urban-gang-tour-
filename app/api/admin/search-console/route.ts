import { NextResponse } from 'next/server';
import { requireOrigin } from '@/lib/server/origin';
import { isSuperAdmin, verifyAdminSession } from '@/lib/server/session';
import { configuredSearchConsoleProperty, getSearchConsoleOverview, inspectSearchUrl, safeInspectionUrl } from '@/lib/server/search-console';

export const dynamic = 'force-dynamic';

// Technical Search Console data is deliberately super-admin-only. It can
// reveal strategic site-performance signals, while desk contributors only
// need the page metadata tools already assigned to their role.
export async function GET(req: Request) {
  if (!(await verifyAdminSession(req)) || !isSuperAdmin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    return NextResponse.json({ ok: true, overview: await getSearchConsoleOverview() }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'search_console_unavailable' }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!(await verifyAdminSession(req)) || !isSuperAdmin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== 'object' || Object.keys(body).length !== 2 || body.action !== 'inspect' || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  // Validate before touching the Google API. Inspection is restricted to a
  // public HTTPS URL on the configured property. Avoid a full overview call
  // here so an intentional inspection consumes only inspection quota.
  const property = configuredSearchConsoleProperty();
  if (!property || !safeInspectionUrl(body.url, property)) {
    return NextResponse.json({ error: 'invalid_inspection_url' }, { status: 400 });
  }
  try {
    const inspection = await inspectSearchUrl(body.url);
    if (!inspection) return NextResponse.json({ error: 'inspection_unavailable' }, { status: 503 });
    return NextResponse.json({ ok: true, inspection }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'inspection_unavailable' }, { status: 502 });
  }
}
