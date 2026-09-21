import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { q, db } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';

export const runtime = 'nodejs';

// Consume a reset token: sets the new password and bumps password_version,
// which instantly kills every existing session cookie (see
// currentApprovedOrganizer's pwdv check). Single-use: the token row is
// deleted whether the reset succeeds or not after a valid lookup.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-reset:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const token = typeof body?.token === 'string' ? body.token : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!token || password.length < 8 || password.length > 100) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const hash = createHash('sha256').update(token).digest('hex');
  const rows = await q<{ organizer_id: string; expires_at: string }>(
    `SELECT organizer_id, expires_at FROM organizer_reset_tokens WHERE token_hash=$1`,
    [hash],
  );
  if (!rows.length) return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  if (new Date(rows[0].expires_at).getTime() < Date.now()) {
    await q(`DELETE FROM organizer_reset_tokens WHERE token_hash=$1`, [hash]);
    return NextResponse.json({ error: 'token_expired' }, { status: 400 });
  }
  await q(
    `UPDATE marketplace_organizers
     SET password_hash=$2, password_version=COALESCE(password_version,0)+1
     WHERE id=$1`,
    [rows[0].organizer_id, hashPassword(password)],
  );
  await q(`DELETE FROM organizer_reset_tokens WHERE token_hash=$1`, [hash]);
  await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('organizer','password_reset',$1)`, [
    JSON.stringify({ id: rows[0].organizer_id }),
  ]);
  return NextResponse.json({ ok: true });
}
