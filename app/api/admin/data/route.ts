import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin, isSuperAdmin, hasPerm } from '@/lib/server/session';
import { getTicketTiers } from '@/lib/server/catalog';
import { ensureContentWorkflowSchema } from '@/lib/server/content-workflow';

const VIEWS: Record<string, string> = {
  bookings: `SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500`,
  orders: `SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`,
  posts: `SELECT slug, headline, section, image, dek, body, published, date, editorial_status, submitted_by, reviewed_by, reviewed_at FROM posts ORDER BY date DESC LIMIT 500`,
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

// Per-view module scoping. 'stats' has no entry: it's the Dashboard tab's
// aggregate counters, visible to every signed-in admin (no per-customer
// detail). 'audit' has no perm entry either - it's gated separately below,
// always super_admin-only (CLAUDE.md CRITICAL EXCEPTION: viewing the audit
// log itself is never a crew_admin capability, whatever perms they hold).
const VIEW_PERM: Record<string, string> = {
  bookings: 'bookings',
  orders: 'orders',
  posts: 'content',
  users: 'people',
  submissions: 'newsroom',
  subscribers: 'people',
  traffic: 'traffic',
  tickets: 'orders',
};

function canReadSetting(req: Request, key: unknown): boolean {
  // The settings table is shared infrastructure, not a per-desk data source.
  // Keep a scoped site's metadata editor away from notification recipients and
  // any future operational setting simply because both happen to use this
  // table. Super admins retain the full configuration view.
  if (isSuperAdmin(req)) return true;
  const name = String(key || '');
  return hasPerm(req, 'site_seo') && (name === 'site' || /^seo:\/[a-z0-9/_-]*$/i.test(name));
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const view = new URL(req.url).searchParams.get('view') || 'stats';
  // The dashboard used to return an all-business financial snapshot to any
  // signed-in admin. Filter it at the API boundary so a gallery contributor
  // or content editor never receives orders, revenue, bookings, audience, or
  // traffic figures they have not been assigned to handle.
  if (view === 'stats') {
    try {
      const raw = (await q<any>(VIEWS.stats))[0] || {};
      const filtered: Record<string, unknown> = {};
      if (hasPerm(req, 'bookings')) filtered.new_bookings = raw.new_bookings;
      if (hasPerm(req, 'orders')) {
        filtered.orders = raw.orders;
        filtered.revenue = raw.revenue;
      }
      if (hasPerm(req, 'content')) filtered.posts = raw.posts;
      if (hasPerm(req, 'people')) {
        filtered.users = raw.users;
        filtered.subscribers = raw.subscribers;
      }
      if (hasPerm(req, 'traffic')) filtered.hits_7d = raw.hits_7d;
      return NextResponse.json({ ok: true, rows: [filtered] });
    } catch (e: any) {
      return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
    }
  }
  if (view === 'posts') {
    try {
      await ensureContentWorkflowSchema();
    } catch (e: any) {
      return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
    }
  }
  // Not a DB view: the events/tiers catalog for the Issue Free Ticket form
  // (server catalog.ts stays the single source of truth - this only mirrors
  // it for the dropdown; the comp ticket route re-validates independently).
  // Lives on the Orders tab, so it's scoped like every other order action.
  if (view === 'eventTiers') {
    if (!hasPerm(req, 'orders')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const tierMap = await getTicketTiers();
    const events = Object.entries(tierMap).map(([id, ev]) => ({ id, name: ev.name, tiers: ev.tiers.map((t) => t.name) }));
    return NextResponse.json({ ok: true, rows: events });
  }
  if (view === 'audit' && !isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  // Settings carry delivery destinations as well as public metadata. A
  // scoped Site & SEO account may read only the records it can edit. A Comms
  // account uses its dedicated social-status endpoint instead, so it never
  // receives owner notification recipients or unrelated configuration.
  if (view === 'settings' && !hasPerm(req, 'site_seo') && !hasPerm(req, 'comms')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const requiredPerm = VIEW_PERM[view];
  if (requiredPerm && !hasPerm(req, requiredPerm)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const sql = VIEWS[view];
  if (!sql) return NextResponse.json({ error: 'unknown_view' }, { status: 400 });
  try {
    const rows = await q(sql);
    if (view === 'settings') {
      return NextResponse.json({ ok: true, rows: rows.filter((row: any) => canReadSetting(req, row?.key)) });
    }
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
}
