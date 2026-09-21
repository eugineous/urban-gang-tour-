import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Email verification consume: GET /api/organizer/verify?token=…
// Marks the address verified (single-use, 24h). Approval requires this, so
// the link below is the difference between an application and an identity.
export async function GET(req: Request) {
  if (!rateLimit('org-verify:' + clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  const hash = createHash('sha256').update(token).digest('hex');
  const rows = await q<{ organizer_id: string; expires_at: string }>(
    `SELECT organizer_id, expires_at FROM organizer_email_tokens WHERE token_hash=$1`,
    [hash],
  );
  if (!rows.length) return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  if (new Date(rows[0].expires_at).getTime() < Date.now()) {
    await q(`DELETE FROM organizer_email_tokens WHERE token_hash=$1`, [hash]);
    return NextResponse.json({ error: 'token_expired' }, { status: 400 });
  }
  await q(`UPDATE marketplace_organizers SET email_verified=true WHERE id=$1`, [rows[0].organizer_id]);
  await q(`DELETE FROM organizer_email_tokens WHERE token_hash=$1`, [hash]);
  await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('organizer','email_verified',$1)`, [
    JSON.stringify({ id: rows[0].organizer_id }),
  ]).catch(() => {});
  return NextResponse.json({ ok: true });
}
