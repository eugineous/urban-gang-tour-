import { NextResponse } from 'next/server';
import { adminPasswordHash, setAdminPasswordHash } from '@/lib/server/admin-password';
import { gmailConnection } from '@/lib/server/gmail';
import { hashPassword, isSuperAdmin, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { adminActor } from '@/lib/server/session';
import { hasDb, q } from '@/lib/server/db';
import { readJsonObject } from '@/lib/server/json-body';
import { signedAdminSessionId, clearCookie } from '@/lib/server/session';
import { revokePasswordSessions } from '@/lib/server/admin-sessions';

export async function GET(req: Request) {
  if (!(await verifyAdminSession(req)) || !isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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
  if (!(await verifyAdminSession(req)) || !isSuperAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.value;
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
    const sid = signedAdminSessionId(req);
    await revokePasswordSessions(sid);
    if (hasDb()) {
      await q(
        `INSERT INTO audit_log (actor, action, detail) VALUES ($1,'change_admin_password','{}'::jsonb)`,
        [adminActor(req)],
      );
    }
    const response = NextResponse.json({ ok: true, reauthenticate: !sid });
    if (!sid) response.headers.set('Set-Cookie', clearCookie('ugt_admin'));
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 120) }, { status: 500 });
  }
}

