// Auth for /admin (Urban Gang Tour's order/ticket dashboard) - separate from
// the legacy /cockpit (ppptv_admin_session) auth so the two apps sharing this
// codebase don't share a session cookie.
//
// The cookie value is a random 32-byte secret from env, not a fixed constant
// like "authenticated" - a fixed value means anyone who ever learns the
// pattern (e.g. by reading this file, since it's a public repo) could set
// that cookie manually and skip the password entirely. Comparing against a
// per-deployment secret closes that off.
export const UGT_SESSION_COOKIE = "ugt_admin_session";

export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.UGT_ADMIN_PASSWORD;
  return Boolean(expected) && candidate === expected;
}

export function getSessionSecret(): string {
  const secret = process.env.UGT_ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("UGT_ADMIN_SESSION_SECRET not configured");
  return secret;
}

export function isAdminAuthenticated(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${UGT_SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;
  const secret = process.env.UGT_ADMIN_SESSION_SECRET;
  return Boolean(secret) && match[1] === secret;
}
