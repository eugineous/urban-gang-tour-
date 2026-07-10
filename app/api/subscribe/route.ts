import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export async function POST(req: Request) {
  if (!rateLimit('sub:' + clientIp(req), 5, 60_000)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!db()) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  await q(`INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING`, [email.toLowerCase()]);
  return NextResponse.json({ ok: true });
}
