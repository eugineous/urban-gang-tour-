import { NextResponse } from 'next/server';
import { q, db, SCHEMA } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import seed from '@/app/_lib/articles.seed.json';

// One-time (idempotent) setup: create tables + seed the 17 v25 articles + defaults.
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  await q(SCHEMA);
  let seeded = 0;
  for (const a of seed as any[]) {
    const r = await q(
      `INSERT INTO posts (slug, headline, section, image, dek, body, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING RETURNING slug`,
      [a.id, a.headline, a.section || 'News', a.img || '', a.dek || '', JSON.stringify(a.body || []), a.date || new Date().toISOString().slice(0, 10)]
    );
    seeded += r.length;
  }
  await q(
    `INSERT INTO settings (key, value) VALUES ('site', $1) ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify({ heroTitle: 'YOU ALREADY KNOW US.', heroSub: 'WHERE THE CULTURE GETS MADE' })]
  );
  const tables = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`);
  return NextResponse.json({ ok: true, seeded, tables: tables.map((t: any) => t.table_name) });
}
