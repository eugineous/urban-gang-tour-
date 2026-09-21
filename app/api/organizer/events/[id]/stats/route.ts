import { NextResponse } from 'next/server';
import { q } from '@/lib/server/db';
import { currentApprovedOrganizer } from '@/lib/server/organizer-session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Organizer event dashboard, derived entirely from real rows — no invented
// figures. Money comes from the orders ledger (paid/fulfilled only), never
// from a tickets.price column (which does not exist). The organizer sees
// gross and their own net; UGT's commission internals stay server-side.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit('org-stats:' + clientIp(req), 30, 60_000))
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const access = await currentApprovedOrganizer(req);
  if (!access.organizer) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const own = await q(`SELECT id FROM marketplace_events WHERE id=$1 AND organizer_id=$2`, [id, access.organizer.id]);
  if (!own.length) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [tierRows, moneyRows, statusRows, checkinRows, dailyRows, refundRows] = await Promise.all([
    q<{ tier_name: string; issued: number; checked_in: number }>(
      `SELECT tier_name, COUNT(*)::int AS issued,
              COUNT(*) FILTER (WHERE used_at IS NOT NULL)::int AS checked_in
         FROM tickets WHERE marketplace_event_id=$1 GROUP BY tier_name ORDER BY issued DESC`,
      [id],
    ).catch(() => [] as any[]),
    q<{ gross: number; net: number; sold: number }>(
      `SELECT COALESCE(SUM(total),0)::int AS gross,
              COALESCE(SUM(organizer_amount),0)::int AS net,
              COUNT(*)::int AS sold
         FROM orders WHERE marketplace_event_id=$1 AND status IN ('paid','fulfilled')`,
      [id],
    ).catch(() => [{ gross: 0, net: 0, sold: 0 }]),
    q<{ status: string; n: number }>(
      `SELECT status, COUNT(*)::int AS n FROM orders
        WHERE marketplace_event_id=$1 GROUP BY status`,
      [id],
    ).catch(() => [] as any[]),
    q<{ issued: number; checked_in: number }>(
      `SELECT COUNT(*)::int AS issued,
              COUNT(*) FILTER (WHERE t.used_at IS NOT NULL)::int AS checked_in
         FROM tickets t JOIN orders o ON o.id=t.order_id
        WHERE t.marketplace_event_id=$1 AND o.status IN ('paid','fulfilled')`,
      [id],
    ).catch(() => [{ issued: 0, checked_in: 0 }]),
    q<{ day: string; n: number; revenue: number }>(
      `SELECT to_char(created_at,'YYYY-MM-DD') AS day, COUNT(*)::int AS n,
              COALESCE(SUM(total),0)::int AS revenue
         FROM orders WHERE marketplace_event_id=$1 AND status IN ('paid','fulfilled')
           AND created_at >= now() - interval '30 days'
        GROUP BY 1 ORDER BY 1 ASC`,
      [id],
    ).catch(() => [] as any[]),
    q<{ refunded: number; n: number }>(
      `SELECT COALESCE(SUM(r.amount),0)::int AS refunded, COUNT(*)::int AS n
         FROM refunds r JOIN orders o ON o.id=r.order_id
        WHERE o.marketplace_event_id=$1`,
      [id],
    ).catch(() => [{ refunded: 0, n: 0 }]),
  ]);

  const issued = Number(checkinRows[0]?.issued || 0);
  const checkedIn = Number(checkinRows[0]?.checked_in || 0);
  return NextResponse.json({
    money: moneyRows[0] || { gross: 0, net: 0, sold: 0 },
    byTier: tierRows,
    byStatus: statusRows,
    attendance: { issued, checkedIn, rate: issued ? Math.round((checkedIn / issued) * 1000) / 10 : 0 },
    daily: dailyRows,
    refunds: refundRows[0] || { refunded: 0, n: 0 },
  });
}
