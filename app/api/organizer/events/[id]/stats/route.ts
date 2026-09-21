import { NextResponse } from 'next/server';
import { q } from '@/lib/server/db';
import { currentApprovedOrganizer } from '@/lib/server/organizer-session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit('org-stats:' + clientIp(req), 30, 60_000))
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const access = await currentApprovedOrganizer(req);
  if (!access.organizer) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  // Verify ownership
  const own = await q(`SELECT id FROM marketplace_events WHERE id=$1 AND organizer_id=$2`, [id, access.organizer.id]);
  if (!own.length) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [tierStats, dailySales] = await Promise.all([
    q<{ tier_name: string; count: number; revenue: number }>(
      `SELECT tier_name, COUNT(*)::int AS count, COALESCE(SUM(price),0)::int AS revenue
       FROM tickets WHERE marketplace_event_id=$1
       GROUP BY tier_name ORDER BY count DESC`,
      [id]
    ),
    q<{ day: string; count: number }>(
      `SELECT to_char(created_at::date,'Mon DD') AS day, COUNT(*)::int AS count
       FROM tickets WHERE marketplace_event_id=$1
         AND created_at >= now() - interval '7 days'
       GROUP BY created_at::date ORDER BY created_at::date ASC`,
      [id]
    ),
  ]);
  return NextResponse.json({ tierStats, dailySales });
}
