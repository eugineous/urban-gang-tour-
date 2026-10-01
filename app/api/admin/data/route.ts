import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin, isSuperAdmin, hasPerm, verifyAdminSession } from '@/lib/server/session';
import { getTicketTiers } from '@/lib/server/catalog';
import { ensureContentWorkflowSchema } from '@/lib/server/content-workflow';
import { ensureBookingsSchema } from '@/lib/server/bookings-schema';

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

type QueueItem = {
  key: string;
  label: string;
  target: string;
  count: number;
};

type QueueSource = {
  key: string;
  label: string;
  state: 'ready' | 'unavailable';
};

async function queueCount(sql: string): Promise<number | null> {
  try {
    const rows = await q<{ count: string | number }>(sql);
    const value = Number(rows[0]?.count ?? 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    // Reporting must not trigger schema setup or hide the entire dashboard
    // when a desk has not been set up yet. The client receives an explicit
    // unavailable source state instead of a made-up zero.
    return null;
  }
}

async function currentQueue(req: Request): Promise<{ period: string; generatedAt: string; items: QueueItem[]; sources: QueueSource[] }> {
  const items: QueueItem[] = [];
  const sources: QueueSource[] = [];
  const add = async (key: string, label: string, target: string, sql: string) => {
    const count = await queueCount(sql);
    sources.push({ key, label, state: count === null ? 'unavailable' : 'ready' });
    if (count !== null) items.push({ key, label, target, count });
  };

  // Each query is an aggregate only. It deliberately returns no customer,
  // school, supplier, crew, or financial detail, and runs only for an
  // explicitly assigned desk.
  const jobs: Promise<void>[] = [];
  if (hasPerm(req, 'bookings')) jobs.push(add('bookings', 'New booking enquiries', 'Bookings', `SELECT COUNT(*) AS count FROM bookings WHERE status='new'`));
  if (hasPerm(req, 'orders')) jobs.push(add('orders', 'Paid order records to review', 'Orders', `SELECT COUNT(*) AS count FROM orders WHERE status='paid'`));
  if (hasPerm(req, 'content')) jobs.push(add('content', 'Unpublished stories', 'Content', `SELECT COUNT(*) AS count FROM posts WHERE NOT published`));
  if (hasPerm(req, 'newsroom')) jobs.push(add('newsroom', 'New story pitches', 'Newsroom', `SELECT COUNT(*) AS count FROM submissions WHERE status='new'`));
  if (hasPerm(req, 'gallery')) jobs.push(add('gallery', 'Gallery drafts awaiting review', 'Gallery', `SELECT COUNT(*) AS count FROM gallery_photos WHERE NOT published`));
  if (hasPerm(req, 'events')) jobs.push(add('events', 'Active event records', 'Event Operations', `SELECT COUNT(*) AS count FROM ops_events WHERE status IN ('planned','confirmed','in_progress')`));
  if (hasPerm(req, 'ops_checklists')) jobs.push(add('checklists', 'Open checklist items', 'Checklists', `SELECT COUNT(*) AS count FROM ops_checklist_items WHERE done_at IS NULL`));
  if (hasPerm(req, 'ops_school_contacts')) jobs.push(add('school_followups', 'School follow-ups due', 'Contacts', `SELECT COUNT(*) AS count FROM ops_contacts WHERE contact_type='school' AND next_followup IS NOT NULL AND next_followup <= CURRENT_DATE`));
  if (hasPerm(req, 'ops_talent_partners')) jobs.push(add('partner_followups', 'Talent, partner and media follow-ups due', 'Contacts', `SELECT COUNT(*) AS count FROM ops_contacts WHERE contact_type IN ('talent','partner','media') AND next_followup IS NOT NULL AND next_followup <= CURRENT_DATE`));
  if (hasPerm(req, 'ops_merch')) jobs.push(add('fulfilment', 'Merch orders in fulfilment', 'Merch Desk', `SELECT COUNT(*) AS count FROM merch_fulfillments WHERE status IN ('new','picking','packed','dispatch_ready')`));
  await Promise.all(jobs);
  // Queries deliberately run in parallel, so restore a stable presentation
  // order before the client renders its source note.
  items.sort((a, b) => a.key.localeCompare(b.key));
  sources.sort((a, b) => a.key.localeCompare(b.key));

  return {
    period: 'Current status queue',
    generatedAt: new Date().toISOString(),
    items,
    sources,
  };
}

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
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
  if (view === 'worklist') {
    try {
      return NextResponse.json({ ok: true, ...(await currentQueue(req)) });
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
  if (view === 'bookings') {
    try {
      await ensureBookingsSchema();
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
