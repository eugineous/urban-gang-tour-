import { NextResponse } from 'next/server';
import { exchangeGoogleCode, gmailProfile, storeGmailConnection } from '@/lib/server/gmail';
import { isSuperAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { hasDb, q } from '@/lib/server/db';

export async function POST(req: Request) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (req.headers.get('x-requested-with') !== 'XmlHttpRequest') {
    return NextResponse.json({ error: 'bad_request_source' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (Object.keys(body).some((key) => key !== 'code')) {
    return NextResponse.json({ error: 'unexpected_fields' }, { status: 400 });
  }
  if (typeof body.code !== 'string' || body.code.length < 20 || body.code.length > 4096) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  try {
    const origin = new URL(req.url).origin;
    const tokens = await exchangeGoogleCode(body.code, origin);
    if (!tokens.refreshToken) {
      return NextResponse.json({ error: 'missing_refresh_token', reconnect: true }, { status: 409 });
    }
    const profile = await gmailProfile(tokens.accessToken);
    await storeGmailConnection(tokens.refreshToken, profile.email, tokens.scope);
    if (hasDb()) {
      await q(
        `INSERT INTO audit_log (actor, action, detail) VALUES ($1,'connect_gmail',$2)`,
        [profile.email, JSON.stringify({ email: profile.email })],
      );
    }
    return NextResponse.json({ ok: true, connected: true, email: profile.email });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 502 });
  }
}

