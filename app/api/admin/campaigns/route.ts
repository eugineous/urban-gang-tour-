import { NextResponse } from 'next/server';
import { verifyAdminSession, hasPerm, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { readJsonObject } from '@/lib/server/json-body';
import { parseCampaign } from '@/lib/marketing-campaigns';
import { listCampaigns, saveCampaign } from '@/lib/server/marketing-campaigns';
// Marketing campaign management is scoped to the existing Promos permission.
export async function GET(req: Request) {
  if (!await verifyAdminSession(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'ops_promos')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!rateLimit('admin-campaigns-read:'+clientIp(req),30,60000)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  try { return NextResponse.json({ campaigns: await listCampaigns() }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ error: 'campaigns_unavailable' }, { status: 503 }); }
}
export async function POST(req: Request) {
  if (!await verifyAdminSession(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'ops_promos')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('admin-campaigns-write:'+clientIp(req),20,60000)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const body = await readJsonObject(req, 16384);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const input = parseCampaign(body.value);
  if (!input) return NextResponse.json({ error: 'invalid_campaign' }, { status: 400 });
  try { return NextResponse.json({ campaign: await saveCampaign(input, adminActor(req)) }); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: ['campaign_conflict','deal_promo_unavailable'].includes(message) ? message : 'campaigns_unavailable' }, { status: message==='campaign_conflict'?409:message==='deal_promo_unavailable'?400:503 });
  }
}
