import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';

// Review moderation. Only approved reviews are served publicly or embedded in
// the shop JSON-LD, so everything Google sees has passed through here.
// approve → publish · reject → unpublish (keeps the row) · delete → remove.

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'reviews')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  try {
    const rows = await q(
      `SELECT id, product_id, author, rating, body, approved, created_at
       FROM product_reviews ORDER BY approved ASC, created_at DESC LIMIT 500`
    );
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasPerm(req, 'reviews')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const { id, action } = body;
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  if (!['approve', 'reject', 'delete'].includes(action)) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  try {
    if (action === 'delete') await q(`DELETE FROM product_reviews WHERE id = $1`, [id]);
    else await q(`UPDATE product_reviews SET approved = $2 WHERE id = $1`, [id, action === 'approve']);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
}
