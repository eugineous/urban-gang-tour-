import { createHmac, timingSafeEqual } from 'node:crypto';

// A valid HMAC alone is not a valid session. All issuers include an expiry.
export function verifySignedEnvelope(token: string | undefined | null, key: string, context = ''): Record<string, unknown> | null {
  if (typeof token !== 'string' || token.length > 8192 || !key) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  const expected = createHmac('sha256', key).update(context + body).digest('base64url');
  // Both buffers are exactly 43 ASCII bytes, including on hostile input.
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const claim: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) return null;
    const record = claim as Record<string, unknown>;
    if (!Number.isSafeInteger(record.exp) || (record.exp as number) <= Date.now()) return null;
    return record;
  } catch { return null; }
}
