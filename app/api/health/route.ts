import { NextResponse } from 'next/server';
import { mpesaConfigured } from '@/lib/server/mpesa';

export async function GET() {
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
