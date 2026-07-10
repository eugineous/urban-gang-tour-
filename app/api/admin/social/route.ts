import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';

// GET  /api/admin/social       -> config status (which channels are API-ready)
// POST /api/admin/social {text} -> posts via Meta APIs where keys exist.
// Env keys (server-side only): META_WA_TOKEN + META_WA_PHONE_ID (WhatsApp Cloud API),
// META_IG_TOKEN + META_IG_USER_ID (Instagram Graph API; images required for feed posts).
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let waNum = '';
  try {
    if (db()) {
      const rows = await q(`SELECT value FROM settings WHERE key='whatsapp_number'`);
      waNum = rows[0]?.value || '';
    }
  } catch { /* optional */ }
  return NextResponse.json({
    whatsapp_ready: !!(process.env.META_WA_TOKEN && process.env.META_WA_PHONE_ID),
    instagram_ready: !!(process.env.META_IG_TOKEN && process.env.META_IG_USER_ID),
    email_ready: !!process.env.RESEND_API_KEY,
    whatsapp_number: waNum,
  });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { text } = await req.json().catch(() => ({}));
  if (typeof text !== 'string' || text.length < 2 || text.length > 2000) return NextResponse.json({ error: 'invalid_text' }, { status: 400 });

  const results: string[] = [];
  // WhatsApp Cloud API: broadcast to the status/channel requires templates;
  // here we send to the admin's own number as a self-post to forward/status.
  if (process.env.META_WA_TOKEN && process.env.META_WA_PHONE_ID) {
    try {
      const to = process.env.META_WA_SELF || '';
      if (to) {
        const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.META_WA_PHONE_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.META_WA_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
        });
        results.push(r.ok ? 'whatsapp:sent' : 'whatsapp:failed(' + r.status + ')');
      } else results.push('whatsapp:set META_WA_SELF (your number) to receive drafts');
    } catch (e: any) { results.push('whatsapp:error'); }
  }
  if (process.env.META_IG_TOKEN && process.env.META_IG_USER_ID) {
    results.push('instagram:feed posts need an image — use the Content tab image URL (coming to this composer)');
  }
  if (!results.length) {
    return NextResponse.json({
      error: 'no_channels_configured',
      hint: 'Set META_WA_TOKEN + META_WA_PHONE_ID (WhatsApp) and/or META_IG_TOKEN + META_IG_USER_ID (Instagram) in Vercel env vars. Until then use the one-click share buttons.',
    }, { status: 503 });
  }
  return NextResponse.json({ ok: true, result: results.join(' · ') });
}
