import { NextResponse } from 'next/server';
import { mpesaConfigured } from '@/lib/server/mpesa';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

export async function GET(req: Request) {
  if (!rateLimit('health:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    services: {
      mpesa: mpesaConfigured() ? 'configured' : 'awaiting_env_vars',
      email: process.env.RESEND_API_KEY ? 'configured' : 'awaiting_env_vars',
      database: process.env.DATABASE_URL ? 'configured' : 'awaiting_env_vars',
    },
  });
}
