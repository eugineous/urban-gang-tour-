import { NextResponse } from 'next/server';
import { clearOrganizerCookie } from '@/lib/server/organizer-session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearOrganizerCookie());
  return res;
}

// Some browser fetch conventions in this codebase use DELETE for logout
// (see /api/admin/login) - support both so the organizer dashboard can use
// whichever verb its client code prefers.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearOrganizerCookie());
  return res;
}
