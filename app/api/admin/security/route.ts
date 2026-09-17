import { NextResponse } from 'next/server';
import { adminPasswordHash, setAdminPasswordHash } from '@/lib/server/admin-password';
import { gmailConnection } from '@/lib/server/gmail';
import { hashPassword, isSuperAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { adminActor } from '@/lib/server/session';
import { hasDb, q } from '@/lib/server/db';

export async function GET(req: Request) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const [passwordHash, gmail] = await Promise.all([adminPasswordHash(), gmailConnection()]);
    return NextResponse.json({
      ok: true,
      customPasswordSet: !!passwordHash,
      envBackupSet: !!process.env.ADMIN_ACCESS_CODE,
      googleLoginConfigured: !!(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
      gmail,
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (Object.keys(body).some((key) => key !== 'password')) {
    return NextResponse.json({ error: 'unexpected_fields' }, { status: 400 });
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: 'password_length', hint: 'Use 12 to 128 characters.' }, { status: 400 });
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: 'password_strength', hint: 'Include at least one letter and one number.' }, { status: 400 });
  }
  try {
    await setAdminPasswordHash(hashPassword(password));
    if (hasDb()) {
      await q(
        `INSERT INTO audit_log (actor, action, detail) VALUES ($1,'change_admin_password','{}'::jsonb)`,
        [adminActor(req)],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 500 });
  }
}

