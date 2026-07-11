import { NextResponse } from 'next/server';
import { isAdmin, adminActor, adminScope } from '@/lib/server/session';

// Self-check for the signed-in admin session: role/perms only, no data.
// Used by AdminApp.tsx to decide which tabs to render (UX only - every
// route still enforces its own server-side gate regardless of what this
// returns) and by GateApp.tsx as its login probe instead of pulling the
// full dashboard stats payload just to test "am I logged in".
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const s = adminScope(req)!;
  return NextResponse.json({ ok: true, email: adminActor(req), scope: s.scope, perms: s.perms });
}
