import { NextResponse, after } from 'next/server';
import { checkPassword, signToken, sessionCookie, clearCookie, sessionSecretConfigured } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { requireOrigin } from '@/lib/server/origin';
import { notifyAdminLogin, notifyFailedAdminLogin } from '@/lib/server/notify';
import { adminPasswordHash } from '@/lib/server/admin-password';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readJsonObject } from '@/lib/server/json-body';
import { registerAdminSession, recoveryStamp, revokeAdminSession } from '@/lib/server/admin-sessions';
import { signedAdminSessionId } from '@/lib/server/session';

function matchesBackupPassword(value: string, expected: string): boolean {
  // Compare the environment fallback in constant time.
  // ADMIN_ACCESS_CODE remains an emergency fallback; the owner-selected
  // password is stored as a salted hash in Postgres.
  const left = createHash('sha256').update(value).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export async function POST(req: Request) {
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!sessionSecretConfigured()) return NextResponse.json({ error: 'session_not_configured' }, { status: 503 });
  if (!rateLimit('adm:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.value;
  for (const key of Object.keys(body)) {
    if (key !== 'code' && key !== 'password') {
      return NextResponse.json({ error: `unexpected_field:${key}` }, { status: 400 });
    }
  }
  const { code, password } = body;
  const value = typeof password === 'string' ? password : code;
  if (typeof value !== 'string' || value.length < 1 || value.length > 256) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
  }
  let storedHash: string | null = null;
  try { storedHash = await adminPasswordHash(); } catch { /* env fallback remains available */ }
  const expected = process.env.ADMIN_ACCESS_CODE || '';
  if (!storedHash && !expected) return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 });
  const backupValid = expected ? matchesBackupPassword(value, expected) : false;
  const valid = (storedHash ? checkPassword(value, storedHash) : false) || backupValid;
  if (!valid) {
    after(() => notifyFailedAdminLogin({ method: 'access_code', reason: 'wrong_code', ip: clientIp(req) }));
    return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
  }
  after(() => notifyAdminLogin({ email: '', method: 'access_code', scope: 'super_admin', ip: clientIp(req) }));
  const res = NextResponse.json({ ok: true });
  // The access code is the owner's own backup key - always full access,
  // never scope-limited (see CLAUDE.md's access control matrix).
  let sid: string | undefined;
  let days = 1;
  let recovery: object = {};
  try { sid = await registerAdminSession('admin', 'access_code', days); }
  catch {
    const stamp = backupValid ? recoveryStamp() : null;
    if (!stamp) return NextResponse.json({ error: 'sessions_unavailable' }, { status: 503 });
    days = 14 / 1440;
    recovery = { recovery: true, recoveryStamp: stamp, iat: Date.now() };
  }
  res.headers.set('Set-Cookie', sessionCookie('ugt_admin', signToken({ role: 'admin', scope: 'super_admin', authSource: 'access_code', ...(sid ? { sid } : recovery) }, days), days));
  return res;
}

export async function DELETE(req: Request) {
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const sid = signedAdminSessionId(req);
  if (sid) {
    try { await revokeAdminSession(sid); }
    catch { return NextResponse.json({ error: 'logout_unavailable' }, { status: 503 }); }
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookie('ugt_admin'));
  return res;
}
