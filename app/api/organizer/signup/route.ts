import { NextResponse, after } from 'next/server';
import { q, db } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { normalizePhone } from '@/lib/server/mpesa';
import { ensureOpsSchema } from '@/lib/server/ops';
import { freeOrganizerId } from '@/lib/server/marketplace';
import { notifyNewOrganizer } from '@/lib/server/notify';

// Public marketplace organizer application. Creates a 'pending' row only —
// no session is issued (organizers cannot log in or sell until a UGT admin
// approves them AND a working Paystack subaccount is created for them, see
// app/admin/ops/Marketplace.tsx + app/api/admin/ops/route.ts
// marketplaceOrganizer.approve). Rate-limited like every other public POST.

export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function sendApplicationEmail(to: string, businessName: string) {
  try {
    if (!process.env.RESEND_API_KEY) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.BOOKINGS_FROM || 'Urban Gang Tour <admin@urbangangtour.co.ke>',
        to,
        subject: 'Your Urban Gang Tour Marketplace application is under review',
        text: `Hi,\n\nThanks for applying to sell tickets through the Urban Gang Tour Marketplace as "${businessName}".\n\nYour application is now under review by our team. We'll email you as soon as a decision is made — once approved, you can log in and submit your first event.\n\nUrban Gang Tour`,
      }),
    });
  } catch (e) {
    console.error('[organizer-signup-email]', e);
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-signup:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const allowed = new Set(['businessName', 'contactName', 'email', 'phone', 'password', 'settlementBank', 'settlementAccount']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { businessName, contactName, email, phone, password, settlementBank, settlementAccount } = body;

  if (typeof businessName !== 'string' || businessName.trim().length < 2 || businessName.length > 200) {
    return NextResponse.json({ error: 'invalid_business_name' }, { status: 400 });
  }
  if (typeof contactName !== 'string' || contactName.trim().length < 2 || contactName.length > 200) {
    return NextResponse.json({ error: 'invalid_contact_name' }, { status: 400 });
  }
  const em = typeof email === 'string' ? email.toLowerCase().trim() : '';
  if (!em || em.length > 200 || !EMAIL_RE.test(em)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  const msisdn = normalizePhone(String(phone || ''));
  if (!msisdn) return NextResponse.json({ error: 'invalid_phone_use_254' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
    return NextResponse.json({ error: 'password_min_8' }, { status: 400 });
  }
  // Bank details are required at signup: the admin approval step creates the
  // Paystack subaccount immediately and must never do so with placeholder
  // payout details — see lib/server/paystack.ts paystackCreateSubaccount.
  if (typeof settlementBank !== 'string' || !settlementBank.trim() || settlementBank.length > 20) {
    return NextResponse.json({ error: 'invalid_settlement_bank' }, { status: 400 });
  }
  const acct = typeof settlementAccount === 'string' ? settlementAccount.replace(/\s/g, '') : '';
  if (!acct || !/^[A-Za-z0-9]{4,34}$/.test(acct)) return NextResponse.json({ error: 'invalid_settlement_account' }, { status: 400 });

  try {
    await ensureOpsSchema();
    const exists = await q(`SELECT id FROM marketplace_organizers WHERE email=$1`, [em]);
    if (exists.length) return NextResponse.json({ error: 'account_exists' }, { status: 409 });

    const id = await freeOrganizerId(businessName);
    await q(
      `INSERT INTO marketplace_organizers (id, business_name, contact_name, email, phone, password_hash, settlement_bank, settlement_account, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
      [id, businessName.trim(), contactName.trim(), em, msisdn, hashPassword(password), settlementBank.trim(), acct]
    );
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('organizer','apply',$1)`, [JSON.stringify({ id, businessName, email: em })]);

    after(() => sendApplicationEmail(em, businessName.trim()));
    // Owner ping (separate from the applicant's confirmation above): a new
    // organizer can't sell until approved in the Control Room, so surface it.
    after(() => notifyNewOrganizer({ businessName: businessName.trim(), contactName: contactName.trim(), email: em, phone: msisdn }));

    return NextResponse.json({ ok: true, id, status: 'pending' });
  } catch (e: any) {
    console.error('[organizer-signup]', e);
    return NextResponse.json({ error: 'signup_failed' }, { status: 500 });
  }
}
