import { NextResponse } from 'next/server';
import { signToken, sessionCookie, clearCookie } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export async function POST(req: Request) {
  if (!rateLimit('adm:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const { code } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_ACCESS_CODE;
  if (!expected) return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 });
  if (typeof code !== 'string' || code !== expected) {
    return NextResponse.json({ error: 'wrong_code' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', sessionCookie('ugt_admin', signToken({ role: 'admin' }, 7), 7));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookie('ugt_admin'));
  return res;
}
