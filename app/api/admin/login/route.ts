import { NextResponse, after } from 'next/server';
import { checkPassword, signToken, sessionCookie, clearCookie } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { requireOrigin } from '@/lib/server/origin';
import { notifyAdminLogin, notifyFailedAdminLogin } from '@/lib/server/notify';
import { adminPasswordHash } from '@/lib/server/admin-password';
import { createHash, timingSafeEqual } from 'node:crypto';

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
  if (!rateLimit('adm:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
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
  const valid = (storedHash ? checkPassword(value, storedHash) : false)
    || (expected ? matchesBackupPassword(value, expected) : false);
  if (!valid) {
    after(() => notifyFailedAdminLogin({ method: 'access_code', reason: 'wrong_code', ip: clientIp(req) }));
    return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
  }
  after(() => notifyAdminLogin({ email: '', method: 'access_code', scope: 'super_admin', ip: clientIp(req) }));
  const res = NextResponse.json({ ok: true });
  // The access code is the owner's own backup key - always full access,
  // never scope-limited (see CLAUDE.md's access control matrix).
  res.headers.set('Set-Cookie', sessionCookie('ugt_admin', signToken({ role: 'admin', scope: 'super_admin' }, 7), 7));
  return res;
}

export async function DELETE(req: Request) {
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookie('ugt_admin'));
  return res;
}
