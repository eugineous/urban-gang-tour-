import { NextResponse } from 'next/server';
import { signToken, sessionCookie } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

// Google Sign-In for the Control Room. The client posts the Google Identity
// Services ID token; we verify it with Google's tokeninfo endpoint (signature,
// expiry and audience are all checked by Google) and then require the email to
// be on the ADMIN_GOOGLE_EMAILS allowlist. Same admin session cookie as the
// access-code login.
export async function POST(req: Request) {
  if (!rateLimit('admg:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const { credential } = await req.json().catch(() => ({}));
  if (typeof credential !== 'string' || credential.length < 20 || credential.length > 4096) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const allow = (process.env.ADMIN_GOOGLE_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!clientId || allow.length === 0) {
    return NextResponse.json({ error: 'google_not_configured' }, { status: 503 });
  }

  let info: any;
  try {
    const r = await fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
      { cache: 'no-store' },
    );
    if (!r.ok) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    info = await r.json();
  } catch {
    return NextResponse.json({ error: 'verify_unavailable' }, { status: 502 });
  }

  const email = String(info.email || '').toLowerCase();
  if (info.aud !== clientId || info.email_verified !== 'true' || !allow.includes(email)) {
    return NextResponse.json({ error: 'not_authorised' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, email });
  res.headers.set('Set-Cookie', sessionCookie('ugt_admin', signToken({ role: 'admin', email }, 7), 7));
  return res;
}
