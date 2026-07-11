import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { checkPassword } from '@/lib/server/session';
import { signOrganizerToken, organizerSessionCookie } from '@/lib/server/organizer-session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';

// Organizer login. Only 'approved' organizers may sign in — pending/rejected/
// suspended get a clear, specific error rather than a generic 401 so a
// legitimate applicant knows to wait rather than assume they mistyped.
// Hard rate limit (5/min/IP) since this is a password-guessing surface.

export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-login:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const allowed = new Set(['email', 'password']);
  for (const k of Object.keys(body || {})) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const em = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!em || !EMAIL_RE.test(em) || !password) return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });

  const rows = await q(`SELECT id, business_name, email, password_hash, status FROM marketplace_organizers WHERE email=$1`, [em]);
  if (!rows.length || !checkPassword(password, rows[0].password_hash)) {
    return NextResponse.json({ error: 'wrong_credentials' }, { status: 401 });
  }
  const org = rows[0];
  if (org.status === 'pending') return NextResponse.json({ error: 'application_pending' }, { status: 403 });
  if (org.status === 'rejected') return NextResponse.json({ error: 'application_rejected' }, { status: 403 });
  if (org.status === 'suspended') return NextResponse.json({ error: 'account_suspended' }, { status: 403 });
  if (org.status !== 'approved') return NextResponse.json({ error: 'not_approved' }, { status: 403 });

  const token = signOrganizerToken({ id: org.id, email: org.email, businessName: org.business_name });
  const res = NextResponse.json({ ok: true, organizer: { id: org.id, email: org.email, businessName: org.business_name } });
  res.headers.set('Set-Cookie', organizerSessionCookie(token));
  return res;
}
