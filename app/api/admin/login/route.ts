import { NextResponse, after } from 'next/server';
import { signToken, sessionCookie, clearCookie } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { requireOrigin } from '@/lib/server/origin';
import { notifyAdminLogin, notifyFailedAdminLogin } from '@/lib/server/notify';

export async function POST(req: Request) {
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('adm:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const { code } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_ACCESS_CODE;
  if (!expected) return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 });
  if (typeof code !== 'string' || code !== expected) {
    after(() => notifyFailedAdminLogin({ method: 'access_code', reason: 'wrong_code', ip: clientIp(req) }));
    return NextResponse.json({ error: 'wrong_code' }, { status: 401 });
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
