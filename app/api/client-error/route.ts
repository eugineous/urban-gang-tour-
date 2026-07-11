import { NextRequest, NextResponse } from 'next/server';
import { insertClientError } from '@/lib/server/client-errors';

// Client-side error beacon. Browsers (especially iOS Safari, where we can't
// attach a debugger to a visitor's phone) POST their runtime errors here so
// they show up in the Vercel function logs, AND (best-effort) into the
// client_errors table so an admin can see them in the Control Room without
// digging through Vercel logs - see lib/server/client-errors.ts and the
// isSuperAdmin-gated 'clientErrors' view in app/api/admin/ops/route.ts.
// Still no PII beyond whatever happens to be in a caught error's message.
export const runtime = 'nodejs';

// per-instance flood guard — this is a diagnostic channel, not analytics
let count = 0;
let windowStart = Date.now();

export async function POST(req: NextRequest) {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    count = 0;
  }
  if (++count > 60) return new NextResponse(null, { status: 429 });

  try {
    const raw = await req.text();
    if (raw.length > 4000) return new NextResponse(null, { status: 413 });
    const b = JSON.parse(raw);
    const errRow = {
      msg: String(b.msg || '').slice(0, 500),
      src: String(b.src || '').slice(0, 200),
      line: Number(b.line) || 0,
      page: String(b.page || '').slice(0, 200),
      ua: String(b.ua || '').slice(0, 200),
    };
    console.error('[client-error]', JSON.stringify(errRow));
    // Best-effort persistence — never let a DB hiccup fail the beacon (the
    // console.error above already covers the "at least see it somewhere"
    // requirement even if DATABASE_URL is unset or the insert fails).
    insertClientError(errRow).catch((e) => console.error('[client-error] store failed:', e?.message));
  } catch {
    // malformed beacon — ignore
  }
  return new NextResponse(null, { status: 204 });
}
