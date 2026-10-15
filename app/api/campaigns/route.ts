import { NextResponse } from 'next/server';
import { publicCampaigns } from '@/lib/server/marketing-campaigns';
import { rateLimit, clientIp, PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  if (!rateLimit('campaigns:'+clientIp(req),60,60000,req,PUBLIC_READ_NETWORK_LIMIT)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  try { return NextResponse.json(await publicCampaigns(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ campaigns: [], validForMs: 0, error: 'campaigns_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
