import { NextResponse, after } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { validatedCurrentBuyer } from '@/lib/server/customer-account';
import { sameOrigin } from '@/lib/server/origin';
import { notifyNewSubmission } from '@/lib/server/notify';

// Student blog / news pitch submissions → admin Newsroom queue.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  let user; try {user = await validatedCurrentBuyer(req);} catch {return NextResponse.json({error:'unavailable'}, {status:503});}
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Per device, not per IP — see lib/server/ratelimit.ts.
  if (!rateLimit('subm:' + clientIp(req), 5, 60_000, req)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b!=='object' || Array.isArray(b) || Object.keys(b).some(k=>!['name','school','title','pitch'].includes(k))) return NextResponse.json({error:'invalid_request'}, {status:400});
  const { name = '', school = '', title = '', pitch = '' } = b;
  for (const [k, v, max] of [['name', name, 100], ['school', school, 150], ['title', title, 150], ['pitch', pitch, 2000]] as const) {
    if (typeof v !== 'string' || v.length > max) return NextResponse.json({ error: `invalid_${k}` }, { status: 400 });
  }
  if (!name || !title) return NextResponse.json({ error: 'need_name_and_title' }, { status: 400 });
  if (!hasDb()) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  try { await q(
    `INSERT INTO submissions (kind, name, school, title, pitch, email) VALUES ('blog',$1,$2,$3,$4,$5)`,
    [name, school, title, pitch, user.email || null]
  );
  after(() => notifyNewSubmission({ name, school, title, pitch }));
  return NextResponse.json({ ok: true });
  } catch {return NextResponse.json({error:'unavailable'},{status:503});}
}
