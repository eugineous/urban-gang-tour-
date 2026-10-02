import { NextResponse } from 'next/server';
import { q, db, qSchema, SCHEMA } from '@/lib/server/db';
import { isSuperAdmin, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { ensureContentWorkflowSchema } from '@/lib/server/content-workflow';
import { ensureBookingsSchema } from '@/lib/server/bookings-schema';

// One-time (idempotent) setup: create tables and safe site defaults. Newsroom
// content must be authored and published in the Control Room, never seeded
// from old sample copy.
// CRITICAL EXCEPTION (CLAUDE.md): Setup/Repair DB is always super_admin-only
// - it runs DDL across the entire schema, not a single module.
export async function POST(req: Request) {
  if (!(await verifyAdminSession(req)) || !isSuperAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  await qSchema(SCHEMA);
  await ensureBookingsSchema();
  await ensureContentWorkflowSchema();
  const seeded = 0;
  await q(
    `INSERT INTO settings (key, value) VALUES ('site', $1) ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify({ heroTitle: 'YOU ALREADY KNOW US.', heroSub: 'WHERE THE CULTURE GETS MADE' })]
  );
  const tables = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`);
  return NextResponse.json({ ok: true, seeded, tables: tables.map((t: any) => t.table_name) });
}
