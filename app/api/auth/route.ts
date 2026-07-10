import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { hashPassword, checkPassword, signToken, sessionCookie, clearCookie, currentUser } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^(\+?254|0)(7|1)\d{8}$/;

// action: signup | login | logout | me  (email OR Kenyan phone + password)
export async function POST(req: Request) {
  const { action, email = '', phone = '', name = '', password = '' } = await req.json().catch(() => ({}));

  if (action === 'me') {
    return NextResponse.json({ user: currentUser(req) });
  }
  if (action === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', clearCookie('ugt_user'));
    return res;
  }
  if (!rateLimit('auth:' + clientIp(req), 8, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'accounts_unavailable' }, { status: 503 });

  const em = String(email).toLowerCase().trim();
  const ph = String(phone).replace(/\s/g, '');
  if (!em && !ph) return NextResponse.json({ error: 'need_email_or_phone' }, { status: 400 });
  if (em && !EMAIL_RE.test(em)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  if (ph && !PHONE_RE.test(ph)) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    return NextResponse.json({ error: 'password_min_6' }, { status: 400 });
  }

  if (action === 'signup') {
    if (typeof name !== 'string' || name.length > 100) return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    const exists = await q(`SELECT id FROM users WHERE ($1 <> '' AND email=$1) OR ($2 <> '' AND phone=$2) LIMIT 1`, [em, ph]);
    if (exists.length) return NextResponse.json({ error: 'account_exists' }, { status: 409 });
    const rows = await q(
      `INSERT INTO users (email, phone, name, pass_hash) VALUES (NULLIF($1,''), NULLIF($2,''), $3, $4) RETURNING id, email, phone, name`,
      [em, ph, name, hashPassword(password)]
    );
    const u = rows[0];
    const res = NextResponse.json({ ok: true, user: u });
    res.headers.set('Set-Cookie', sessionCookie('ugt_user', signToken({ id: u.id, email: u.email, phone: u.phone, name: u.name })));
    return res;
  }
  if (action === 'login') {
    const rows = await q(`SELECT id, email, phone, name, pass_hash FROM users WHERE ($1 <> '' AND email=$1) OR ($2 <> '' AND phone=$2) LIMIT 1`, [em, ph]);
    if (!rows.length || !checkPassword(password, rows[0].pass_hash)) {
      return NextResponse.json({ error: 'wrong_credentials' }, { status: 401 });
    }
    const u = rows[0];
    const res = NextResponse.json({ ok: true, user: { id: u.id, email: u.email, phone: u.phone, name: u.name } });
    res.headers.set('Set-Cookie', sessionCookie('ugt_user', signToken({ id: u.id, email: u.email, phone: u.phone, name: u.name })));
    return res;
  }
  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
