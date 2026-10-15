import { createHash, createHmac, randomBytes } from 'node:crypto';
import { hasDb, q, qSchema } from './db';

let ready: Promise<void> | undefined;
export function ensureAdminSessions() {
  if (!hasDb()) throw new Error('db_not_configured');
  if (!ready) ready = qSchema(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY, actor TEXT NOT NULL, auth_source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS admin_sessions_live ON admin_sessions(expires_at) WHERE revoked_at IS NULL;
    CREATE TABLE IF NOT EXISTS admin_session_policy (
      id INT PRIMARY KEY CHECK(id=1), legacy_disabled BOOLEAN NOT NULL DEFAULT false,
      legacy_password_disabled BOOLEAN NOT NULL DEFAULT false
    );
  `).then(() => undefined).catch(error => { ready = undefined; throw error; });
  return ready;
}
export const sessionIdHash = (sid: string) => createHash('sha256').update('ugt-admin-session:' + sid).digest('hex');

export async function registerAdminSession(actor: string, source: string, days = 1) {
  await ensureAdminSessions();
  const sid = randomBytes(32).toString('hex');
  const rows = await q(`INSERT INTO admin_sessions(id,actor,auth_source,expires_at)
    VALUES($1,$2,$3,$4) RETURNING id`, [sessionIdHash(sid), actor, source, new Date(Date.now() + days * 86400000).toISOString()]);
  if (!rows.length) throw new Error('session_registration_failed');
  return sid;
}

export async function adminSessionActive(sid: string) {
  if (!hasDb() || !/^[a-f0-9]{64}$/.test(sid)) return false;
  try {
    const rows = await q(`SELECT id FROM admin_sessions WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()`, [sessionIdHash(sid)]);
    return rows.length === 1;
  } catch { return false; }
}

export async function legacyAdminSessionAllowed(passwordSession: boolean) {
  if (!hasDb()) return passwordSession;
  try {
    const rows = await q<{ legacy_disabled: boolean; legacy_password_disabled: boolean }>('SELECT legacy_disabled,legacy_password_disabled FROM admin_session_policy WHERE id=1');
    return !rows[0]?.legacy_disabled && !(passwordSession && rows[0]?.legacy_password_disabled);
  } catch (error) {
    // One-time compatibility before the new registry has been created by login
    // or the Security panel. Other database errors never grant permission.
    return (error as { code?: string })?.code === '42P01';
  }
}

export function recoveryStamp() {
  if (!process.env.ADMIN_ACCESS_CODE || !process.env.SESSION_SECRET) return null;
  return createHmac('sha256', process.env.SESSION_SECRET).update('ugt-recovery:' + process.env.ADMIN_ACCESS_CODE).digest('hex');
}

export async function revokeAdminSession(sid: string) {
  if (!/^[a-f0-9]{64}$/.test(sid)) return;
  await q('UPDATE admin_sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL', [sessionIdHash(sid)]);
}

export async function revokePasswordSessions(currentSid: string | null) {
  await ensureAdminSessions();
  await q(`WITH revoked AS (
    UPDATE admin_sessions SET revoked_at=now() WHERE auth_source='access_code' AND revoked_at IS NULL AND id<>$1
  ) INSERT INTO admin_session_policy(id,legacy_password_disabled) VALUES(1,true)
    ON CONFLICT(id) DO UPDATE SET legacy_password_disabled=true`, [currentSid ? sessionIdHash(currentSid) : '']);
}
