import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { paystackListBanks } from '@/lib/server/paystack';

// Public, read-only, no PII: the live Paystack bank-code list, so the
// organizer signup form always submits a valid settlement_bank CODE (never a
// free-text bank name) — required for the admin approval step's subaccount
// creation call to succeed.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!rateLimit('org-banks:' + clientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const banks = await paystackListBanks();
  return NextResponse.json({ banks }, { headers: { 'Cache-Control': 's-maxage=21600' } });
}
