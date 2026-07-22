import { NextResponse, after } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { notifyNewSubscriber } from '@/lib/server/notify';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('sub:' + clientIp(req), 5, 60_000)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!db()) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const clean = email.toLowerCase();
  // rowCount tells a genuinely-new subscriber apart from a duplicate that
  // ON CONFLICT DO NOTHING silently swallowed - only notify on the former.
  const res = await q(`INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING RETURNING email`, [clean]);
  if (res.length) after(() => notifyNewSubscriber(clean));
  return NextResponse.json({ ok: true });
}
