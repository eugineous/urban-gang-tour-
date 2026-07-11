import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { TICKET_TIERS } from '@/lib/server/catalog';

const VIEWS: Record<string, string> = {
  bookings: `SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500`,
  orders: `SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`,
  posts: `SELECT slug, headline, section, image, dek, body, published, date FROM posts ORDER BY date DESC LIMIT 500`,
  users: `SELECT id, email, phone, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 500`,
  submissions: `SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500`,
  subscribers: `SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 1000`,
  traffic: `SELECT day, path, hits FROM traffic WHERE day > CURRENT_DATE - 30 ORDER BY day DESC, hits DESC LIMIT 1000`,
  settings: `SELECT key, value FROM settings`,
  audit: `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200`,
  tickets: `SELECT code, order_id, event_id, tier_name, holder, position, of_count, used_at, created_at
    FROM tickets ORDER BY created_at DESC, position LIMIT 2000`,
  stats: `SELECT
    (SELECT COUNT(*) FROM bookings WHERE status='new') AS new_bookings,
    (SELECT COUNT(*) FROM orders) AS orders,
    (SELECT COALESCE(SUM(total),0) FROM orders WHERE status='paid') AS revenue,
    (SELECT COUNT(*) FROM posts WHERE published) AS posts,
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM subscribers) AS subscribers,
    (SELECT COALESCE(SUM(hits),0) FROM traffic WHERE day > CURRENT_DATE - 7) AS hits_7d`,
};

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const view = new URL(req.url).searchParams.get('view') || 'stats';
  // Not a DB view: the events/tiers catalog for the Issue Free Ticket form
  // (server catalog.ts stays the single source of truth - this only mirrors
  // it for the dropdown; the comp ticket route re-validates independently).
  if (view === 'eventTiers') {
    const events = Object.entries(TICKET_TIERS).map(([id, ev]) => ({ id, name: ev.name, tiers: ev.tiers.map((t) => t.name) }));
    return NextResponse.json({ ok: true, rows: events });
  }
  const sql = VIEWS[view];
  if (!sql) return NextResponse.json({ error: 'unknown_view' }, { status: 400 });
  try {
    const rows = await q(sql);
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
}
