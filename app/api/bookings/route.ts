import { NextResponse, after } from 'next/server';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { notifyNewBooking } from '@/lib/server/notify';

const TYPES = ['School Booking', 'Campus Rave', 'Sponsorship', 'Mega Event', 'Media', 'Join the Crew', 'Student Blog'];

// Self-heal: some live tables still carry the pre-rename column name
// "intent" instead of "type" (schema drift from before the code moved on),
// which silently failed every booking insert. Rename once per instance.
let columnHealed = false;
async function ensureTypeColumn(q: (sql: string) => Promise<any>) {
  if (columnHealed) return;
  await q(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='intent') THEN
      ALTER TABLE bookings RENAME COLUMN intent TO type;
    END IF;
  END $$;`);
  columnHealed = true;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
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

  // persist to DB when configured (admin Bookings Inbox reads from here)
  try {
    const { q, db } = await import('@/lib/server/db');
    if (db()) {
      await ensureTypeColumn(q);
      await q(
        `INSERT INTO bookings (id, name, org, email, phone, type, message) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [booking.id, name, org, email, phone, type, message]
      );
    }
  } catch (e) { console.error('[booking-db]', e); }

  // Routine "new booking" owner notification (opt-in, OFF by default) - fires
  // regardless of the ledger write above (a booking still happened even if
  // the DB write hiccups; the owner should still hear about it), gated on
  // the notify_on_new_booking toggle inside notifyNewBooking itself.
  // Fire-and-forget: never blocks or fails the booking response.
  after(() => notifyNewBooking({ id: booking.id, name, org, email, phone, type, message }));

  console.log('[booking]', JSON.stringify(booking));
  return NextResponse.json({ ok: true, id: booking.id });
}
