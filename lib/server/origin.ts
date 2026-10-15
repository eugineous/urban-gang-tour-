// CSRF hardening for cookie-authenticated and public state-changing routes.
// Trust explicit HTTPS deployment origins, never Host/X-Forwarded-Host.
// Localhost is accepted only outside production.
//
// sameOrigin(req)    -> tolerant: true when Origin is ABSENT (sendBeacon,
//                       native apps, server-to-server) or matches. Use on
//                       public POST endpoints.
// requireOrigin(req) -> strict: Origin must be present AND match. Use on
//                       admin mutations (the ugt_admin cookie session).
//
// Skip both on signature-verified webhooks (WhatsApp) and /api/client-error.

const PROD_ORIGINS = new Set(['https://urbangangtour.co.ke', 'https://www.urbangangtour.co.ke']);

function originAllowed(origin: string): boolean {
  let url: URL;
  try { url = new URL(origin); } catch { return false; }
  // Browser Origin is scheme/host/port only, without credentials or paths.
  if (url.origin !== origin || url.username || url.password) return false;
  if (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol)) return true;
  if (url.protocol !== 'https:') return false;
  if (PROD_ORIGINS.has(url.origin)) return true;
  const configured = process.env.SITE_URL;
  if (!configured) return false;
  try {
    const site = new URL(configured.includes('://') ? configured : `https://${configured}`);
    return site.protocol === 'https:' && !site.username && !site.password && url.origin === site.origin;
  } catch { return false; }
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return origin === null || originAllowed(origin);
}

export function requireOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return origin !== null && originAllowed(origin);
}
