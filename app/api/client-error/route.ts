import { NextRequest, NextResponse } from 'next/server';

// Client-side error beacon. Browsers (especially iOS Safari, where we can't
// attach a debugger to a visitor's phone) POST their runtime errors here so
// they show up in the Vercel function logs. Log-only: no storage, no PII.
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
    console.error(
      '[client-error]',
      JSON.stringify({
        msg: String(b.msg || '').slice(0, 500),
        src: String(b.src || '').slice(0, 200),
        line: Number(b.line) || 0,
        page: String(b.page || '').slice(0, 200),
        ua: String(b.ua || '').slice(0, 200),
      })
    );
  } catch {
    // malformed beacon — ignore
  }
  return new NextResponse(null, { status: 204 });
}
