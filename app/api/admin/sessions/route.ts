import { NextResponse } from 'next/server';
import { verifyAdminSession, isSuperAdmin, signedAdminSessionId, clearCookie, adminActor } from '@/lib/server/session';
import { ensureAdminSessions, sessionIdHash } from '@/lib/server/admin-sessions';
import { q } from '@/lib/server/db';
import { requireOrigin } from '@/lib/server/origin';
import { readJsonObject } from '@/lib/server/json-body';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

// Owner only. Database ids are hashes, never usable session bearer credentials.
export async function GET(req: Request) {
  if (!await verifyAdminSession(req) || !isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!rateLimit('admin-sessions:' + clientIp(req), 30, 60000)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  try {
    await ensureAdminSessions();
    const sid = signedAdminSessionId(req);
    const rows = await q(`SELECT id,actor,auth_source,created_at::text,expires_at::text FROM admin_sessions WHERE revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 100`);
    return NextResponse.json({ sessions: rows.map(row => ({ ...row, current: sid ? row.id === sessionIdHash(sid) : false })), legacySession: !sid }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'sessions_unavailable' }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!await verifyAdminSession(req) || !isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('admin-session-revoke:' + clientIp(req), 10, 60000)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { action, id } = parsed.value;
  if (Object.keys(parsed.value).some(key => !['action', 'id'].includes(key)) || !['revoke', 'others'].includes(String(action)) ||
      (action === 'revoke' && (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))) || (action === 'others' && id !== undefined)) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  try {
    await ensureAdminSessions();
    const sid = signedAdminSessionId(req), current = sid ? sessionIdHash(sid) : '';
    if (action === 'others') {
      await q(`WITH revoked AS (UPDATE admin_sessions SET revoked_at=now() WHERE id<>$1 AND revoked_at IS NULL)
        INSERT INTO admin_session_policy(id,legacy_disabled) VALUES(1,true) ON CONFLICT(id) DO UPDATE SET legacy_disabled=true`, [current]);
    } else await q('UPDATE admin_sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL', [id]);
    await q(`INSERT INTO audit_log(actor,action,detail) VALUES($1,'admin_session.revoke',$2::jsonb)`, [adminActor(req), JSON.stringify({ action, id: id || null })]);
    const reauthenticate = !sid || (action === 'revoke' && id === current);
    const response = NextResponse.json({ ok: true, reauthenticate });
    if (reauthenticate) response.headers.set('Set-Cookie', clearCookie('ugt_admin'));
    return response;
  } catch { return NextResponse.json({ error: 'sessions_unavailable' }, { status: 503 }); }
}
