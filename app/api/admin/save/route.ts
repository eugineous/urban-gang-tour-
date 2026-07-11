import { NextResponse, after } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { SITE } from '@/lib/site';
import { facebookConfigured, instagramConfigured, postToFacebookPage, postToInstagram } from '@/lib/meta-social';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
}

// Lazy schema: posts.social_posted_at marks articles already announced on
// socials so edits never double-post. Idempotent; run once per instance.
let socialColReady = false;
async function ensureSocialColumn() {
  if (socialColReady) return;
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_posted_at TIMESTAMPTZ`);
  socialColReady = true;
}

// Fire-and-forget announcement of a freshly published article (runs via
// after(), so it never blocks or fails the publish response).
async function announceArticle(post: { slug: string; headline: string; dek: string; image: string }) {
  const url = `${SITE.domain}/blog/${post.slug}`;
  const summary = [post.headline, post.dek].filter(Boolean).join('\n\n');
  let posted = false;

  // The owner's Instagram already cross-posts to the Facebook page. Set
  // META_AUTOPOST_TARGETS=ig to let that cross-post carry Facebook and avoid
  // double-posting; default posts to both directly.
  const targets = (process.env.META_AUTOPOST_TARGETS || 'fb,ig').toLowerCase();

  if (targets.includes('fb') && facebookConfigured()) {
    const r = await postToFacebookPage({ message: `${summary}\n\n${url}`, link: url });
    console.log(`[social] facebook ${post.slug}: ${r.ok ? 'posted' : 'failed - ' + r.error}`);
    if (r.ok) posted = true;
  }
  if (targets.includes('ig') && instagramConfigured()) {
    // IG needs a public absolute https image URL; site-relative paths resolve
    // against the production domain, anything else skips IG.
    const img = post.image.startsWith('https://') ? post.image
      : post.image.startsWith('/') ? SITE.domain + post.image : '';
    if (img) {
      const caption = `${summary}\n\nRead the full story - link in bio. #UrbanGangTour #UrbanNews #Yezaskiii`;
      const r = await postToInstagram({ imageUrl: img, caption });
      console.log(`[social] instagram ${post.slug}: ${r.ok ? 'posted' : 'failed - ' + r.error}`);
      if (r.ok) posted = true;
    } else {
      console.log(`[social] instagram ${post.slug}: skipped - post has no image`);
    }
  }
  if (posted) {
    try {
      await q(`UPDATE posts SET social_posted_at=now() WHERE slug=$1`, [post.slug]);
    } catch (e: any) {
      console.log(`[social] could not mark ${post.slug} as posted: ${e?.message}`);
    }
  }
}

// Multiplexed admin mutations. kind: post|deletePost|setting|bookingStatus|orderStatus|deleteSubmission
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const { kind, data } = await req.json().catch(() => ({}));
  try {
    switch (kind) {
      case 'post': {
        const slug = data.slug ? slugify(data.slug) : slugify(data.headline || '');
        if (!slug || !data.headline) return NextResponse.json({ error: 'need_headline' }, { status: 400 });
        const body = Array.isArray(data.body)
          ? data.body
          : String(data.body || '').split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);
        await ensureSocialColumn();
        const prev = await q(`SELECT published, social_posted_at FROM posts WHERE slug=$1`, [slug]);
        const saved = await q(
          `INSERT INTO posts (slug, headline, section, image, dek, body, published, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date, CURRENT_DATE))
           ON CONFLICT (slug) DO UPDATE SET headline=$2, section=$3, image=$4, dek=$5, body=$6, published=$7,
             date=COALESCE($8::date, posts.date), updated_at=now()
           RETURNING date`,
          [slug, data.headline, data.section || 'News', data.image || '', data.dek || '', JSON.stringify(body), data.published !== false, data.date || null]
        );
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','save_post',$1)`, [JSON.stringify({ slug })]);
        // Auto-post to socials on FIRST publish only: the article is published
        // now, was not published before, has never been announced, and its
        // date is today or earlier. A future-dated (scheduled) post must not
        // trigger the social announcement early — it isn't publicly visible
        // yet (see app/_lib/blog.ts's `date <= CURRENT_DATE` filter). There is
        // no cron job that re-fires the announcement when the date arrives;
        // that would need Vercel Cron and is left out of scope for now.
        const isoDate = (d: any) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
        const savedDate = saved[0]?.date ? isoDate(saved[0].date) : null;
        const todayIso = new Date().toISOString().slice(0, 10);
        const isFutureDated = !!savedDate && savedDate > todayIso;
        const firstPublish = data.published !== false
          && !prev[0]?.social_posted_at
          && (!prev.length || prev[0].published === false)
          && !isFutureDated;
        if (isFutureDated && data.published !== false) {
          console.log(`[social] ${slug}: scheduled for ${savedDate}, skipping announce until then`);
        }
        if (firstPublish && (facebookConfigured() || instagramConfigured())) {
          const payload = { slug, headline: String(data.headline), dek: String(data.dek || ''), image: String(data.image || '') };
          after(() => announceArticle(payload).catch((e) => console.log('[social] announce failed:', e?.message)));
        }
        return NextResponse.json({ ok: true, slug });
      }
      case 'deletePost':
        await q(`DELETE FROM posts WHERE slug=$1`, [data.slug]);
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','delete_post',$1)`, [JSON.stringify({ slug: data.slug })]);
        return NextResponse.json({ ok: true });
      case 'setting':
        await q(
          `INSERT INTO settings (key, value) VALUES ($1,$2)
           ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
          [String(data.key), JSON.stringify(data.value)]
        );
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','save_setting',$1)`, [JSON.stringify({ key: data.key })]);
        return NextResponse.json({ ok: true });
      case 'bookingStatus':
        await q(`UPDATE bookings SET status=$2 WHERE id=$1`, [data.id, data.status]);
        return NextResponse.json({ ok: true });
      case 'orderStatus':
        await q(`UPDATE orders SET status=$2 WHERE id=$1`, [data.id, data.status]);
        return NextResponse.json({ ok: true });
      case 'submissionStatus':
        await q(`UPDATE submissions SET status=$2 WHERE id=$1`, [data.id, data.status]);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: 'unknown_kind' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
}
