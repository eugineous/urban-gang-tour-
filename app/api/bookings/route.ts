import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

const TYPES = ['School Booking', 'Campus Rave', 'Sponsorship', 'Mega Event', 'Media', 'Join the Crew', 'Student Blog'];

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  // strict schema: reject unexpected fields
  const allowed = new Set(['name', 'org', 'email', 'phone', 'type', 'message']);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const { name, org = '', email, phone = '', type, message = '' } = body;
  if (typeof name !== 'string' || name.length < 2 || name.length > 100) return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  if (!TYPES.includes(type)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  if (typeof message !== 'string' || message.length > 2000) return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
  if (typeof org !== 'string' || org.length > 200) return NextResponse.json({ error: 'invalid_org' }, { status: 400 });
  if (typeof phone !== 'string' || phone.length > 20) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });

  const booking = { id: 'B-' + Date.now().toString(36).toUpperCase(), name, org, email, phone, type, message, date: new Date().toISOString(), status: 'new' };

  // Email notification via Resend when configured
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.BOOKINGS_FROM || 'bookings@urbangangtour.co.ke',
          to: process.env.BOOKINGS_TO || 'admin@urbangangtour.co.ke',
          subject: `New ${type}: ${name}${org ? ' — ' + org : ''}`,
          text: `Booking ${booking.id}\nName: ${name}\nOrg: ${org}\nEmail: ${email}\nPhone: ${phone}\nType: ${type}\n\n${message}`,
        }),
      });
    } catch { /* delivery best-effort; booking still accepted */ }
  }
  console.log('[booking]', JSON.stringify(booking));
  return NextResponse.json({ ok: true, id: booking.id });
}
