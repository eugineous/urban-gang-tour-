import { NextResponse } from 'next/server';

// The legacy renderer is retired. Keep this route only as a safe compatibility
// endpoint for any stale internal request; never return source containing
// unresolved template bindings.
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return NextResponse.redirect(new URL('/', request.url), 308);
}
