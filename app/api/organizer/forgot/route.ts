import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { sameOrigin } from '@/lib/server/origin';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Forgot-password: always 200, even for unknown emails (no enumeration).
// Issues a single-use token (SHA-256 hash at rest, 1h expiry) and emails a
// reset link when RESEND_API_KEY is configured. The raw token never touches
// the database or a log line.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!rateLimit('org-forgot:' + clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const em = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';
  if (!em || !EMAIL_RE.test(em)) return NextResponse.json({ ok: true });
  try {
    const rows = await q<{ id: string }>(`SELECT id FROM marketplace_organizers WHERE email=$1`, [em]);
    if (rows.length) {
      const raw = randomBytes(32).toString('base64url');
      const hash = createHash('sha256').update(raw).digest('hex');
      await q(
        `CREATE TABLE IF NOT EXISTS organizer_reset_tokens (
          token_hash TEXT PRIMARY KEY, organizer_id TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
        )`,
      );
      await q(`DELETE FROM organizer_reset_tokens WHERE organizer_id=$1`, [rows[0].id]);
      await q(
        `INSERT INTO organizer_reset_tokens (token_hash, organizer_id, expires_at)
         VALUES ($1,$2, now() + interval '1 hour')`,
        [hash, rows[0].id],
      );
      if (process.env.RESEND_API_KEY) {
        const base = process.env.SITE_URL || 'https://urbangangtour.co.ke';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.BOOKINGS_FROM || 'Urban Gang Tour <admin@urbangangtour.co.ke>',
            to: em,
            subject: 'Reset your Urban Gang Tour organizer password',
            text: `Reset link (expires in 1 hour):\n${base}/organizer/reset?token=${raw}\n\nIf you did not request this, ignore this email.`,
          }),
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[org-forgot]', e);
  }
  return NextResponse.json({ ok: true });
}
