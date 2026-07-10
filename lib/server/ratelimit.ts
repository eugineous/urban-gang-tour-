// Simple in-memory IP rate limiter for public POST endpoints.
// (Per-instance; upgrade to Redis/Upstash for multi-region scale.)
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  rec.count += 1;
  return rec.count <= limit;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : '') || 'unknown';
}
