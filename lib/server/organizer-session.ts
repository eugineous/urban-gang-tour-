// Signed-cookie sessions for the marketplace organizer portal. Deliberately
// SEPARATE from lib/server/session.ts's ugt_admin / ugt_user cookies — a
// different cookie name (ugt_organizer) and a different HMAC context string
// ('org:' prefix on every signed body) so an organizer cookie can never be
// replayed as an admin or buyer session even though both may share
// SESSION_SECRET. Reuses the same scrypt password hashing
// (hashPassword/checkPassword) from session.ts — no new crypto primitive.
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = () => process.env.SESSION_SECRET || 'dev-secret-change-me';
const COOKIE = 'ugt_organizer';

function b64u(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

export interface OrganizerSession {
  id: string;
  email: string;
  businessName: string;
}

export function signOrganizerToken(payload: OrganizerSession, days = 30): string {
  const body = b64u(JSON.stringify({ ...payload, ctx: 'org', exp: Date.now() + days * 86400_000 }));
  const sig = createHmac('sha256', SECRET()).update('org:' + body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOrganizerToken(token: string | undefined | null): OrganizerSession | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = createHmac('sha256', SECRET()).update('org:' + body).digest('base64url');
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (data.ctx !== 'org' || (data.exp && Date.now() > data.exp)) return null;
    return { id: data.id, email: data.email, businessName: data.businessName };
  } catch {
    return null;
  }
}

function cookieVal(req: Request, name: string): string | null {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

export function currentOrganizer(req: Request): OrganizerSession | null {
  return verifyOrganizerToken(cookieVal(req, COOKIE));
}

export function organizerSessionCookie(token: string, days = 30): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`;
}

export function clearOrganizerCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
