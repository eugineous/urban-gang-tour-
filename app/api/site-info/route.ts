import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { rateLimit, clientIp,PUBLIC_READ_NETWORK_LIMIT } from '@/lib/server/ratelimit';
import {cached} from '@/lib/server/microcache';

// Public site config for the frontend widget. Exposes ONLY intentionally-public
// values (the business WhatsApp number). Never returns user data.
export async function GET(req: Request) {
  if (!rateLimit('info:' + clientIp(req), 30, 60_000,req,PUBLIC_READ_NETWORK_LIMIT)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  let whatsapp: string | null = null;
  try {
    if (hasDb()) {
      const rows = await cached('public-whatsapp',5000,()=>q(`SELECT value FROM settings WHERE key='whatsapp_number'`));
      const v = String(rows[0]?.value || '').replace(/\D/g, '');
      whatsapp = v.length >= 10 ? v : null;
    }
  } catch { /* widget simply hides */ }
  return NextResponse.json({ whatsapp }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
