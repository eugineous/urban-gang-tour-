import { JWT } from 'google-auth-library';

// Shared service-account auth for real Google Analytics (GA4 Data API) and
// real Search Console data pulled back into the site. GOOGLE_SERVICE_ACCOUNT_JSON
// holds the full downloaded key file content (server-side env var only, never
// exposed client-side - see CLAUDE.md's "no hardcoded secrets" rule). Returns
// null when unconfigured so every caller can fail open to its existing
// fallback rather than crash a page.

// Keyed by scope set: GA4 (analytics.readonly) and Search Console
// (webmasters.readonly) request different scopes, so a single shared client
// would silently carry the wrong scope for whichever caller runs second.
const cache = new Map<string, JWT | null>();

export function googleServiceAccountClient(scopes: string[]): JWT | null {
  // Reuse one JWT client per scope set per warm function instance instead of
  // constructing a fresh one on every call. A brand-new JWT() has no access
  // token yet, so every previously-uncached call forced a full RSA-signed
  // OAuth token exchange with Google on every single GA4/Search Console read
  // - real CPU work, repeated needlessly. google-auth-library already caches
  // the resulting access token on the client instance for ~1hr; that cache
  // only helps if the same instance survives across calls, which the map
  // here now ensures (still per-cold-start, never persisted - fine, since a
  // new instance just re-authenticates once instead of never caching at all).
  const key = scopes.slice().sort().join(' ');
  if (cache.has(key)) return cache.get(key)!;

  // Stored base64-encoded (GOOGLE_SERVICE_ACCOUNT_JSON_B64), not raw JSON: a
  // multi-line JSON value with embedded \n escapes got corrupted somewhere in
  // the env-var round trip (Vercel CLI -> dashboard -> runtime) when stored
  // raw - base64 has no special characters, newlines, or quotes, so it
  // survives that round trip intact regardless of where the mangling was
  // happening.
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (!b64) {
    cache.set(key, null);
    return null;
  }
  try {
    const keyFile = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    const client = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes,
    });
    cache.set(key, client);
    return client;
  } catch (e) {
    console.error('[google-auth] bad GOOGLE_SERVICE_ACCOUNT_JSON_B64', e);
    cache.set(key, null);
    return null;
  }
}
