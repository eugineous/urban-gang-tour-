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

export function isAdmin(req: Request): boolean {
  const t = verifyToken<{ role: string }>(cookieVal(req, 'ugt_admin'));
  return t?.role === 'admin';
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
