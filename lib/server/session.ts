// Signed-cookie sessions (HMAC-SHA256, no external deps).
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const SECRET = () => process.env.SESSION_SECRET || 'dev-secret-change-me';

function b64u(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

export function signToken(payload: object, days = 30): string {
  const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + days * 86400_000 }));
  const sig = createHmac('sha256', SECRET()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken<T = any>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = createHmac('sha256', SECRET()).update(body).digest('base64url');
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (data.exp && Date.now() > data.exp) return null;
    return data as T;
  } catch { return null; }
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(pw, salt, 32).toString('hex');
}

export function checkPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const got = scryptSync(pw, salt, 32).toString('hex');
  return got.length === hash.length && timingSafeEqual(Buffer.from(got), Buffer.from(hash));
}

function cookieVal(req: Request, name: string): string | null {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

// Admin role/permission model.
//
// scope: 'super_admin' | 'crew_admin'. Absent scope on a decoded token means
// super_admin - this is the backward-compat rule for tokens minted before
// this field existed (the access-code login and any Google-authorised email
// that predates the accounts system). New crew_admin accounts always carry
// an explicit scope + perms array; super_admin accounts ignore perms
// entirely (always full access). perms is a JSONB array of module keys, see
// lib/server/admin-accounts.ts's MODULE_KEYS for the authoritative list.
//
// All of this is embedded in the signed (HMAC) cookie at login time, so a
// route can check role/scope/perms without a DB round-trip, and the client
// cannot tamper with it without invalidating the signature (verifyToken
// fails closed on a bad signature).
export interface AdminTokenPayload {
  role: string;
  email?: string;
  scope?: 'super_admin' | 'crew_admin';
  perms?: string[];
  exp?: number;
}

function adminToken(req: Request): AdminTokenPayload | null {
  const t = verifyToken<AdminTokenPayload>(cookieVal(req, 'ugt_admin'));
  return t && t.role === 'admin' ? t : null;
}

// True for ANY signed-in admin session, super_admin or crew_admin alike.
// Kept for backward compat and for the handful of places both roles must
// reach (e.g. reading their own session via /api/admin/me, the Dashboard
// tab's aggregate stats). Never use this alone to gate a scoped module -
// use hasPerm() or isSuperAdmin() for anything module-specific or sensitive.
export function isAdmin(req: Request): boolean {
  return adminToken(req) !== null;
}

// True only for the owner's full-access role: the access-code login (always
// super_admin, see /api/admin/login) and any Google-authorised email whose
// admin_google_emails row has role='super_admin' (the default, so existing
// admins are never silently downgraded).
export function isSuperAdmin(req: Request): boolean {
  const t = adminToken(req);
  if (!t) return false;
  return t.scope !== 'crew_admin';
}

// True when the session can act on the given module: always true for
// super_admin, true for crew_admin only when moduleKey is in their signed
// perms array. This is the check every module-scoped route should use.
export function hasPerm(req: Request, moduleKey: string): boolean {
  const t = adminToken(req);
  if (!t) return false;
  if (t.scope !== 'crew_admin') return true;
  return Array.isArray(t.perms) && t.perms.includes(moduleKey);
}

// The caller's own role/perms, for the /api/admin/me self-check and for
// building a fresh session token that preserves an existing scope.
export function adminScope(req: Request): { scope: 'super_admin' | 'crew_admin'; perms: string[] } | null {
  const t = adminToken(req);
  if (!t) return null;
  const scope = t.scope === 'crew_admin' ? 'crew_admin' : 'super_admin';
  return { scope, perms: scope === 'crew_admin' && Array.isArray(t.perms) ? t.perms : [] };
}

// Best-effort identity for audit_log rows. Google-login sessions carry the
// admin's email (see /api/admin/google); access-code sessions carry no
// identity beyond the shared code, so they fall back to the literal string
// 'admin' - same convention every other admin route already uses.
export function adminActor(req: Request): string {
  const t = adminToken(req);
  return t?.email ? t.email : 'admin';
}

export function currentUser(req: Request): { id: number; email: string; name?: string } | null {
  return verifyToken(cookieVal(req, 'ugt_user'));
}

export function sessionCookie(name: string, token: string, days = 30): string {
  return `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`;
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
