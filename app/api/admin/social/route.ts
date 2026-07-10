import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { facebookConfigured, instagramConfigured, postToFacebookPage, postToInstagram } from '@/lib/meta-social';
import { IG_POST_RE, IG_WALL_MAX, normalizeIgUrl, getIgWall } from '@/lib/server/social-wall';

// Roles: admin only (both methods). All tokens are server-side env vars.
//
// GET  /api/admin/social
//   -> channel readiness flags + saved whatsapp number + the curated ig_wall list.
// POST /api/admin/social
//   { kind:'wall.save', urls:[...] }       -> save the "From the Gram" list (settings key 'ig_wall')
//   { text, imageUrl? }                    -> composer: posts text to the Facebook Page (if
//     META_FB_PAGE_ID+META_FB_PAGE_TOKEN), sends a WhatsApp self-draft (META_WA_TOKEN+
//     META_WA_PHONE_ID+META_WA_SELF), and posts to Instagram when imageUrl is provided
//     (META_IG_USER_ID+META_IG_TOKEN — IG feed posts require an image).
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
    facebook_ready: facebookConfigured(),
    instagram_ready: instagramConfigured(),
    email_ready: !!process.env.RESEND_API_KEY,
    whatsapp_number: waNum,
    ig_wall: await getIgWall(),
  });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  // ---- Curated Instagram wall ------------------------------------------------
  if (body?.kind === 'wall.save') {
    const keys = Object.keys(body).filter((k) => k !== 'kind' && k !== 'urls');
    if (keys.length) return NextResponse.json({ error: 'unexpected_fields' }, { status: 400 });
    if (!Array.isArray(body.urls) || body.urls.length > IG_WALL_MAX) {
      return NextResponse.json({ error: 'invalid_urls', hint: `array of at most ${IG_WALL_MAX} Instagram post URLs` }, { status: 400 });
    }
    const urls: string[] = [];
    for (const u of body.urls) {
      if (typeof u !== 'string' || u.length > 120 || !IG_POST_RE.test(u.trim())) {
        return NextResponse.json({ error: 'invalid_url', hint: 'only https://www.instagram.com/p/... or /reel/... URLs' }, { status: 400 });
      }
      const norm = normalizeIgUrl(u.trim());
      if (!urls.includes(norm)) urls.push(norm);
    }
    if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
    try {
      await q(
        `INSERT INTO settings (key, value) VALUES ('ig_wall', $1)
         ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`,
        [JSON.stringify(urls)],
      );
      await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','save_ig_wall',$1)`, [JSON.stringify({ count: urls.length })]);
    } catch (e: any) {
      return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, urls });
  }

  // ---- Composer: post now ----------------------------------------------------
  const { text, imageUrl } = body || {};
  const extra = Object.keys(body || {}).filter((k) => k !== 'text' && k !== 'imageUrl');
  if (extra.length) return NextResponse.json({ error: 'unexpected_fields' }, { status: 400 });
  if (typeof text !== 'string' || text.length < 2 || text.length > 2000) {
    return NextResponse.json({ error: 'invalid_text' }, { status: 400 });
  }
  if (imageUrl !== undefined && (typeof imageUrl !== 'string' || imageUrl.length > 500 || (imageUrl && !/^https:\/\//.test(imageUrl)))) {
    return NextResponse.json({ error: 'invalid_image_url', hint: 'must be an absolute https URL' }, { status: 400 });
  }

  const results: string[] = [];

  // Facebook Page: post the composed text directly (no link).
  if (facebookConfigured()) {
    const r = await postToFacebookPage({ message: text });
    results.push(r.ok ? 'facebook:posted' : 'facebook:failed(' + (r.error || 'error') + ')');
  }

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
    } catch { results.push('whatsapp:error'); }
  }

  // Instagram: feed posts require an image.
  if (instagramConfigured()) {
    if (imageUrl) {
      const r = await postToInstagram({ imageUrl, caption: text });
      results.push(r.ok ? 'instagram:posted' : 'instagram:failed(' + (r.error || 'error') + ')');
    } else {
      results.push('instagram:needs an image URL - add one to post to the feed');
    }
  }

  if (!results.length) {
    return NextResponse.json({
      error: 'no_channels_configured',
      hint: 'Set META_FB_PAGE_ID + META_FB_PAGE_TOKEN (Facebook Page), META_WA_TOKEN + META_WA_PHONE_ID (WhatsApp) and/or META_IG_TOKEN + META_IG_USER_ID (Instagram) in Vercel env vars. Until then use the one-click share buttons.',
    }, { status: 503 });
  }
  return NextResponse.json({ ok: true, result: results.join(' · ') });
}
