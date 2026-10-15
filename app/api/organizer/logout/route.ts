import { NextResponse } from 'next/server';
import { clearOrganizerCookie } from '@/lib/server/organizer-session';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('organizer-logout:' + clientIp(req), 30, 60_000, req)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.set('Set-Cookie', clearOrganizerCookie());
  return res;
}

// Some browser fetch conventions in this codebase use DELETE for logout
// (see /api/admin/login) - support both so the organizer dashboard can use
// whichever verb its client code prefers.
export async function DELETE(req: Request) {
  return POST(req);
}
