import { timingSafeEqual, createHash } from "crypto";

/**
 * Verifies an admin password against ADMIN_PASSWORD env var using
 * constant-time comparison to prevent timing attacks.
 *
 * @param {string} password - The password to verify
 * @returns {boolean} true if the password matches, false otherwise
 */
export function verifyAdminPassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !password) return false;

  try {
    const a = Buffer.from(adminPassword, "utf8");
    const b = Buffer.from(password, "utf8");

    // timingSafeEqual requires same-length buffers
    // If lengths differ, we still do a comparison to avoid leaking length info,
    // but we know the result will be false
    if (a.length !== b.length) {
      // Perform a dummy comparison to keep timing consistent
      timingSafeEqual(a, a);
      return false;
    }

    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Returns the expected session token for the current ADMIN_PASSWORD.
 * @returns {string}
 */
export function getExpectedSessionToken() {
  const p = process.env.ADMIN_PASSWORD ?? "";
  return createHash("sha256").update(p + p).digest("hex");
}

/**
 * Returns true if the given cookie token is valid for the current password.
 * @param {string|undefined} token
 * @returns {boolean}
 */
export function isValidSession(token) {
  if (!token) return false;
  const expected = getExpectedSessionToken();
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
