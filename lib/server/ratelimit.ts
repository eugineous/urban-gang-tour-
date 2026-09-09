// Rate limiting for public endpoints.
//
// The previous version keyed on the first entry of X-Forwarded-For and kept an
// unbounded Map. Measured against production on 2026-09-09, that failed in both
// directions at once:
//
//   * Bypassable. Cloudflare appends to X-Forwarded-For rather than replacing
//     it, so `xff.split(',')[0]` is a value the *client* chose. Sending
//     `X-Forwarded-For: 203.0.113.99` produced a 429 on someone else's bucket;
//     rotating the header instead skips limiting altogether.
//   * Blocks real crowds. 1000 people at a school or campus event share one
//     public IP, and Safaricom puts many subscribers behind CGNAT. With
//     /api/orders at 8 requests per minute per IP, a whole venue got eight
//     ticket purchases a minute between them - everyone else saw "Too many
//     attempts."
//
// This version fixes the key and splits the budget in two:
//
//   * A strict per-device limit, keyed on a first-party cookie. One phone
//     genuinely should not open eight orders a minute, and a device id is not
//     shared by a venue.
//   * A loose per-network backstop, keyed on CF-Connecting-IP, sized so a full
//     hall on one NAT stays under it. This exists to blunt scripted abuse, not
//     to police individual buyers.
//
// Still per-isolate, and deliberately so. Cloudflare runs many isolates per
// colo, so these counters are approximate and a determined attacker spread
// across colos sees a higher effective ceiling. That is acceptable: the network
// layer belongs to Cloudflare's own DDoS and Bot Fight protection, and the job
// here is to stop casual hammering and runaway client loops without ever
// turning away a real crowd. Anything stricter needs shared state - a Durable
// Object or KV - which is a bigger change than this file.

interface Bucket {
  count: number;
  reset: number;
}

// Bounded: the old Map only ever replaced an entry when the same key came back,
// so a stream of distinct keys grew it forever inside a long-lived isolate.
const MAX_KEYS = 5000;
const hits = new Map<string, Bucket>();

/** Drop expired entries, and if still over budget, the oldest-expiring ones. */
function evict(now: number): void {
  for (const [k, v] of hits) {
    if (now > v.reset) hits.delete(k);
  }
  if (hits.size <= MAX_KEYS) return;
  // Map preserves insertion order, so the head is the least recently created.
  const excess = hits.size - MAX_KEYS;
  let i = 0;
  for (const k of hits.keys()) {
    if (i++ >= excess) break;
    hits.delete(k);
  }
}

function take(key: string, limit: number, windowMs: number, now: number): boolean {
  const rec = hits.get(key);
  if (!rec || now > rec.reset) {
    if (hits.size >= MAX_KEYS) evict(now);
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  rec.count += 1;
  return rec.count <= limit;
}

/**
 * The visitor's real IP.
 *
 * CF-Connecting-IP is written by Cloudflare on the way in and cannot be forged
 * by the client, unlike X-Forwarded-For. Behind CGNAT or venue wifi this is
 * still shared by many people, which is why it is only ever the loose backstop
 * below and never the strict limit.
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  // Local dev and any non-Cloudflare path. X-Forwarded-For is client-supplied
  // here too, but without Cloudflare in front there is nothing better, and
  // nothing sensitive depends on it alone.
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : '') || 'unknown';
}

/** Name of the first-party device cookie set by app/_components/DeviceId.tsx. */
export const DEVICE_COOKIE = 'ugt_did';

/** The device id, when the browser has one. Absent on a first-ever request. */
export function deviceId(req: Request): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === DEVICE_COOKIE) {
      const v = rest.join('=').trim();
      // Only ever used as a cache key, but keep it to the shape we issue.
      return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
    }
  }
  return null;
}

/**
 * Whether to widen the network budget is opt-in, by passing `req`.
 *
 *   rateLimit(key, n, win)        strict: n per IP. Unchanged behaviour.
 *   rateLimit(key, n, win, req)   crowd-safe: n per device, wide IP backstop.
 *
 * The distinction is deliberate and load-bearing. Endpoints a crowd uses at
 * once — orders, checkout, status polling, the four per-page-load reads — pass
 * `req`, because a venue behind one NAT must not share a single budget.
 * Credential endpoints — /api/auth, /api/admin/login, /api/organizer/login —
 * must NOT pass it: there, one IP hammering the endpoint is exactly what the
 * limit is for, and since the device cookie is client-set an attacker could
 * otherwise rotate it for a fresh budget on every attempt.
 *
 * When `req` is passed but the browser has no cookie yet (a first-ever
 * request, or cookies blocked), this falls back to the strict per-IP limit.
 * That keeps the safe behaviour as the default and means a missing cookie can
 * never be used to buy a bigger budget.
 */
export function rateLimit(
  keyed: string,
  limit = 10,
  windowMs = 60_000,
  req?: Request,
  networkLimit?: number,
): boolean {
  const now = Date.now();
  const did = req ? deviceId(req) : null;

  // No request given, or no device id yet: original strict per-IP behaviour.
  if (!did) return take(`n:${keyed}`, limit, windowMs, now);

  // Call sites pass an already-composed key like `'orders:' + clientIp(req)`.
  // Split the prefix back off so device and network buckets stay separate.
  const colon = keyed.indexOf(':');
  const scope = colon > 0 ? keyed.slice(0, colon) : 'default';

  // Strict on the individual, wide on the network.
  //
  // Sizing the default from the real case rather than a round number: a stop
  // with 1000 attendees who all open the site inside a minute is 1000 devices
  // times the four per-page-load reads, so 4000 requests off one NAT. 40x the
  // device budget with a 300/min floor covers write endpoints, where per-person
  // volume is low; the read endpoints pass an explicit, much larger
  // networkLimit because they are cached and cost almost nothing to serve.
  const deviceOk = take(`d:${scope}:${did}`, limit, windowMs, now);
  const networkOk = take(`n:${keyed}`, networkLimit ?? Math.max(300, limit * 40), windowMs, now);
  return deviceOk && networkOk;
}

/**
 * Network budget for the four public reads every page load makes.
 *
 * Deliberately high. These are served from the in-isolate cache
 * (lib/server/microcache.ts) so they cost a JSON serialisation, not a query,
 * and the thing they must never do is turn a busy venue away. Genuine abuse at
 * this volume is a network-layer problem and belongs to Cloudflare's DDoS and
 * Bot Fight protection, not to a counter in a Worker isolate.
 */
export const PUBLIC_READ_NETWORK_LIMIT = 20_000;

/**
 * Network budget for the purchase endpoints.
 *
 * The default (40x the device budget, so 320/min at 8 per device) is fine for
 * a steady trickle and wrong for the case that actually matters: a ticket drop,
 * where a thousand people try to buy in the same couple of minutes off one
 * venue or carrier IP. 3000/min covers a thousand purchases inside twenty
 * seconds while still stopping a script in a loop, and the real throughput
 * ceiling past this point is Daraja's own STK rate limit, not ours.
 */
export const PURCHASE_NETWORK_LIMIT = 3_000;

/**
 * Preferred form for new code: pass the Request and let this derive both keys.
 *
 *   if (!limit(req, 'orders', 8)) return tooMany();
 */
export function limit(req: Request, scope: string, perDevice = 10, windowMs = 60_000): boolean {
  return rateLimit(`${scope}:${clientIp(req)}`, perDevice, windowMs, req);
}
