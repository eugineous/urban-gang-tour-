import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { currentUser } from '@/lib/server/session';

// Student blog / news pitch submissions → admin Newsroom queue.
export async function POST(req: Request) {
  if (!rateLimit('subm:' + clientIp(req), 5, 60_000)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const { name = '', school = '', title = '', pitch = '' } = b;
  for (const [k, v, max] of [['name', name, 100], ['school', school, 150], ['title', title, 150], ['pitch', pitch, 2000]] as const) {
    if (typeof v !== 'string' || v.length > max) return NextResponse.json({ error: `invalid_${k}` }, { status: 400 });
  }
  if (!name || !title) return NextResponse.json({ error: 'need_name_and_title' }, { status: 400 });
  if (!db()) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  const user = currentUser(req);
  await q(
    `INSERT INTO submissions (kind, name, school, title, pitch, email) VALUES ('blog',$1,$2,$3,$4,$5)`,
    [name, school, title, pitch, user?.email || b.email || null]
  );
  return NextResponse.json({ ok: true });
}
