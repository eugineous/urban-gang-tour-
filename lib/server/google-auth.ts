import { JWT } from 'google-auth-library';

// Shared service-account auth for real Google Analytics (GA4 Data API) and
// real Search Console data pulled back into the site. GOOGLE_SERVICE_ACCOUNT_JSON
// holds the full downloaded key file content (server-side env var only, never
// exposed client-side - see CLAUDE.md's "no hardcoded secrets" rule). Returns
// null when unconfigured so every caller can fail open to its existing
// fallback rather than crash a page.

let cached: JWT | null | undefined;

export function googleServiceAccountClient(scopes: string[]): JWT | null {
  // Stored base64-encoded (GOOGLE_SERVICE_ACCOUNT_JSON_B64), not raw JSON: a
  // multi-line JSON value with embedded \n escapes got corrupted somewhere in
  // the env-var round trip (Vercel CLI -> dashboard -> runtime) when stored
  // raw - base64 has no special characters, newlines, or quotes, so it
  // survives that round trip intact regardless of where the mangling was
  // happening.
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (!b64) return null;
  try {
    const key = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes,
    });
  } catch (e) {
    console.error('[google-auth] bad GOOGLE_SERVICE_ACCOUNT_JSON_B64', e);
    return null;
  }
}
