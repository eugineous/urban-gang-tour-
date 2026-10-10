import { NextResponse, after } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { notifyNewSubscriber } from '@/lib/server/notify';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  // Per device, not per IP — see lib/server/ratelimit.ts.
  if (!rateLimit('sub:' + clientIp(req), 5, 60_000, req)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const body=await req.json().catch(()=>null);
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='email'))return NextResponse.json({error:'invalid_request'},{status:400});
  const { email }=body;
  if (typeof email !== 'string' || email.length>254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!hasDb()) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const clean = email.trim().toLowerCase();
  // rowCount tells a genuinely-new subscriber apart from a duplicate that
  // ON CONFLICT DO NOTHING silently swallowed - only notify on the former.
  const res = await q(`INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING RETURNING email`, [clean]);
  if (res.length) after(() => notifyNewSubscriber(clean));
  return NextResponse.json({ ok: true });
}
