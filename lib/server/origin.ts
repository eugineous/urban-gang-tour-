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

// Cloudflare Workers has no VERCEL_URL/VERCEL_BRANCH_URL equivalent (those
// were Vercel-only env vars naming the current deployment's own auto-generated
// host, used so preview deployments' own origin is accepted too). Replaced
// with two checks: (1) does the Origin header's host match the host this very
// request actually arrived on (X-Forwarded-Host, set by the edge/proxy in
// front of the Worker, checked first as the more trustworthy of the two;
// falling back to Host) - this is the direct per-request equivalent of "this
// deployment's own URL", and (2) an explicit SITE_URL env var for any
// deployment where neither header should be trusted. Note this is a CSRF
// origin check: it only ever gates whether a REQUEST is accepted, so an
// attacker forging Origin/Host on their own request gains nothing - they
// still can't make a victim's browser send a cross-site request whose real
// Origin matches this site.
function originAllowed(origin: string, req: Request): boolean {
  let u: URL;
  try { u = new URL(origin); } catch { return false; }
  const hostname = u.hostname.toLowerCase();
  const host = u.host.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true; // local dev, any port
  if (PROD_HOSTS.includes(hostname)) return true;
  const reqHost = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toLowerCase();
  if (reqHost && host === reqHost) return true;
  const siteUrl = (process.env.SITE_URL || '').toLowerCase();
  if (siteUrl) {
    try {
      const su = new URL(siteUrl.includes('://') ? siteUrl : `https://${siteUrl}`);
      if (host === su.host.toLowerCase()) return true;
    } catch {
      /* malformed SITE_URL - ignore, fall through to reject */
    }
  }
  return false;
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return originAllowed(origin, req);
}

export function requireOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !!origin && originAllowed(origin, req);
}
