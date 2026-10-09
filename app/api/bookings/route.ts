import { NextResponse, after } from 'next/server';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';
import { notifyNewBooking } from '@/lib/server/notify';
import { ensureBookingsSchema } from '@/lib/server/bookings-schema';

const TYPES = ['School Booking', 'Campus Rave', 'Sponsorship', 'Partnership', 'Mega Event', 'Media', 'Join the Crew'];

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function bookingId(requestId: unknown): string {
  const candidate = clean(requestId, 80).replace(/[^a-zA-Z0-9]/g, '');
  // Public clients send a per-attempt random id. Keeping it in the primary key
  // makes a retry idempotent without retaining a device identifier or storing
  // any additional visitor data. Older clients still receive a fresh id.
  const entropy = candidate.length >= 16
    ? candidate
    : `${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, '')}`;
  return `B-${entropy.toUpperCase().slice(0, 48)}`;
}

function cleanDate(value: unknown): string | null {
  const raw = clean(value, 20);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'invalid';
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || raw !== date.toISOString().slice(0, 10) ? 'invalid' : raw;
}

function cleanAttendance(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 500000) return NaN;
  return n;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  // Per device, not per IP — see lib/server/ratelimit.ts.
  if (!rateLimit('bookings:' + clientIp(req), 5, 60_000, req)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  // strict schema: reject unexpected fields
  const allowed = new Set([
    'name',
    'org',
    'email',
    'phone',
    'type',
    'message',
    'preferredDate',
    'expectedAttendance',
    'eventBrief',
    'schoolContactConfirmed',
    'requestId',
  ]);
  for (const k of Object.keys(body)) {
    if (!allowed.has(k)) return NextResponse.json({ error: `unexpected_field:${k}` }, { status: 400 });
  }
  const name = clean(body.name, 100);
  const org = clean(body.org, 200);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 20);
  const type = clean(body.type, 40);
  const message = clean(body.message, 2000);
  const preferredDate = cleanDate(body.preferredDate);
  const expectedAttendance = cleanAttendance(body.expectedAttendance);
  const eventBrief = clean(body.eventBrief, 1000);
  if (name.length < 2) return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  if (!TYPES.includes(type)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  if (phone && !/^[+()\d\s-]{7,20}$/.test(phone)) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  if (preferredDate === 'invalid') return NextResponse.json({ error: 'invalid_preferred_date' }, { status: 400 });
  if (Number.isNaN(expectedAttendance)) return NextResponse.json({ error: 'invalid_expected_attendance' }, { status: 400 });
  if (type === 'School Booking') {
    // A booking enquiry must come from an adult or authorised institution
    // contact. The public form intentionally does not collect student names,
    // guardian details, health information or other safeguarding data.
    if (!org) return NextResponse.json({ error: 'school_org_required' }, { status: 400 });
    if (message.length < 10) return NextResponse.json({ error: 'school_request_details_required' }, { status: 400 });
    if (body.schoolContactConfirmed !== true) return NextResponse.json({ error: 'school_contact_confirmation_required' }, { status: 400 });
  }

  const booking = {
    id: bookingId(body.requestId),
    name,
    org,
    email,
    phone,
    type,
    message,
    preferredDate,
    expectedAttendance,
    eventBrief,
    date: new Date().toISOString(),
    status: 'new',
  };

  // persist to DB when configured (admin Bookings Inbox reads from here)
  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return NextResponse.json({ error: 'booking_unavailable' }, { status: 503 });
    await ensureBookingsSchema();
    const inserted = await q<{ id: string }>(
      `INSERT INTO bookings (id, name, org, email, phone, type, message, preferred_date, expected_attendance, event_brief, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'site')
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [booking.id, name, org, email, phone, type, message, preferredDate, expectedAttendance, eventBrief]
    );
    // A browser retry with the same random request id is already in the desk.
    // Return the same acknowledgement and do not notify or create another lead.
    if (!inserted.length) return NextResponse.json({ ok: true, id: booking.id, duplicate: true });
  } catch (e) {
    console.error('[booking-db] persistence failed');
    return NextResponse.json({ error: 'booking_unavailable' }, { status: 503 });
  }

  // Routine "new booking" owner notification is opt-in and only runs after
  // the desk has durably accepted the request. It never blocks the response.
  const notificationMessage = [
    message,
    preferredDate ? `Preferred date: ${preferredDate}` : '',
    expectedAttendance ? `Expected attendance: ${expectedAttendance}` : '',
    eventBrief ? `Event brief: ${eventBrief}` : '',
  ].filter(Boolean).join('\n\n');
  after(() => notifyNewBooking({ id: booking.id, name, org, email, phone, type, message: notificationMessage }));

  console.log('[booking] accepted', booking.id, booking.type);
  return NextResponse.json({ ok: true, id: booking.id });
}
