// CSRF hardening for cookie-authenticated and public state-changing routes.
// The Origin header (when a browser sends it) must match our own hosts:
// production domain, the current Vercel deployment host, or localhost in dev.
//
// sameOrigin(req)    -> tolerant: true when Origin is ABSENT (sendBeacon,
//                       native apps, server-to-server) or matches. Use on
//                       public POST endpoints.
// requireOrigin(req) -> strict: Origin must be present AND match. Use on
//                       admin mutations (the ugt_admin cookie session).
//
// Skip both on signature-verified webhooks (WhatsApp) and /api/client-error.

const PROD_HOSTS = ['urbangangtour.co.ke', 'www.urbangangtour.co.ke'];

function originAllowed(origin: string): boolean {
  let u: URL;
  try { u = new URL(origin); } catch { return false; }
  const hostname = u.hostname.toLowerCase();
  const host = u.host.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true; // local dev, any port
  if (PROD_HOSTS.includes(hostname)) return true;
  const vercel = (process.env.VERCEL_URL || '').toLowerCase();
  if (vercel && host === vercel) return true;
  const branch = (process.env.VERCEL_BRANCH_URL || '').toLowerCase();
  if (branch && host === branch) return true;
  return false;
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return originAllowed(origin);
}

export function requireOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !!origin && originAllowed(origin);
}
