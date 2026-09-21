import { NextResponse, after } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { q, db } from '@/lib/server/db';
import { isAdmin, isSuperAdmin, hasPerm, adminActor, verifyAdminSession } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { notifyPostPublished } from '@/lib/server/notify';
import { pingIndexNow } from '@/lib/server/indexnow';
import { ensureContentWorkflowSchema } from '@/lib/server/content-workflow';
import { isOrderStatus, canAdminSetOrderStatus } from '@/lib/server/payment-status';
import { contentAutomationReady, dispatchArticleAnnouncement, ensureContentAutomationSchema } from '@/lib/server/content-automation';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
}

const COMMS_SETTING_KEYS = new Set([
  'whatsapp_number',
  'notify_email',
  'notify_on_new_order',
  'notify_on_new_booking',
  'notify_on_new_signup',
  'notify_on_admin_login',
  'notify_on_failed_admin_login',
  'notify_on_post_published',
  'notify_on_new_submission',
  'notify_on_payment_success',
  'notify_on_payment_failure',
  'notify_on_ticket_scan',
  'notify_on_whatsapp_message',
  'notify_on_new_subscriber',
  'notify_on_new_review',
  'notify_on_new_organizer',
]);

function validSeoKey(key: string): boolean {
  return key === 'site' || /^seo:\/[a-z0-9/_-]*$/i.test(key);
}

// Multiplexed admin mutations. kind: post|deletePost|setting|bookingStatus|orderStatus|deleteSubmission
// Each kind is scoped to the module it actually belongs to (see AdminApp.tsx
// tabs) rather than a blanket isAdmin() check - a crew_admin only reaches
// the kinds their perms cover.
export async function POST(req: Request) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!requireOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const { kind, data } = await req.json().catch(() => ({}));
  const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 });
  switch (kind) {
    case 'post':
    case 'deletePost':
      if (!hasPerm(req, 'content')) return forbidden();
      break;
    case 'bookingStatus':
      if (!hasPerm(req, 'bookings')) return forbidden();
      break;
    case 'orderStatus':
      if (!hasPerm(req, 'orders')) return forbidden();
      break;
    case 'submissionStatus':
      if (!hasPerm(req, 'newsroom')) return forbidden();
      break;
    case 'setting': {
      // Settings are an allowlist, not an open key-value store. In particular
      // a comms-scoped account must never be able to write marketplace,
      // finance, or an unrecognised future setting through a forged request.
      const key = String(data?.key ?? '');
      if (!validSeoKey(key) && !COMMS_SETTING_KEYS.has(key)) {
        return NextResponse.json({ error: 'invalid_setting_key' }, { status: 400 });
      }
      if (validSeoKey(key)) {
        if (!hasPerm(req, 'site_seo')) return forbidden();
      } else if (!isSuperAdmin(req)) {
        // These values select public contact information and external owner
        // notifications. Content and comms staff can compose posts, but only
        // the owner can change where operational data is sent.
        return forbidden();
      }
      break;
    }
    default:
      // Unknown kinds 400 below, same as before - no perm to check yet.
      break;
  }
  try {
    switch (kind) {
      case 'post': {
        const slug = data.slug ? slugify(data.slug) : slugify(data.headline || '');
        if (!slug || !data.headline) return NextResponse.json({ error: 'need_headline' }, { status: 400 });
        const body = Array.isArray(data.body)
          ? data.body
          : String(data.body || '').split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);
        await Promise.all([ensureContentAutomationSchema(), ensureContentWorkflowSchema()]);
        const actor = adminActor(req);
        const superAdmin = isSuperAdmin(req);
        const prev = await q<{ published: boolean; social_posted_at: string | null; submitted_by: string; editorial_status: string }>(
          `SELECT published, social_posted_at, submitted_by, editorial_status FROM posts WHERE slug=$1`, [slug]
        );
        // Content-scoped crew can prepare and submit only their own unpublished
        // work. A super admin remains the explicit publishing gate. This is
        // enforced here, not just by the Control Room UI.
        if (!superAdmin && prev.length && (prev[0].published || (prev[0].submitted_by && prev[0].submitted_by !== actor))) {
          return NextResponse.json({ error: 'review_required' }, { status: 403 });
        }
        const submittedForReview = data.submitForReview === true;
        const published = superAdmin && data.published !== false;
        const workflow = published ? 'published' : (submittedForReview ? 'in_review' : 'draft');
        const submittedBy = prev[0]?.submitted_by || actor;
        const saved = await q(
          `INSERT INTO posts (slug, headline, section, image, dek, body, published, date, editorial_status, submitted_by, reviewed_by, reviewed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date, CURRENT_DATE),$9,$10,$11,CASE WHEN $9='published' THEN now() ELSE NULL END)
           ON CONFLICT (slug) DO UPDATE SET headline=$2, section=$3, image=$4, dek=$5, body=$6, published=$7,
             date=COALESCE($8::date, posts.date), editorial_status=$9,
             submitted_by=CASE WHEN posts.submitted_by='' THEN $10 ELSE posts.submitted_by END,
             reviewed_by=CASE WHEN $9='published' THEN $11 ELSE posts.reviewed_by END,
             reviewed_at=CASE WHEN $9='published' THEN now() ELSE posts.reviewed_at END,
             social_automation_claimed_at=NULL, social_automation_result='', updated_at=now()
           RETURNING date`,
          [slug, data.headline, data.section || 'News', data.image || '', data.dek || '', JSON.stringify(body), published, data.date || null, workflow, submittedBy, published ? actor : '']
        );
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'save_post',$2)`, [actor, JSON.stringify({ slug, workflow })]);
        // Social automation is eligible only on FIRST publication, and only
        // while an owner has explicitly enabled the server-side automation
        // switch and completed a selected channel. Connecting credentials or
        // targets later must never backfill articles that were published while
        // automation was not ready. Future-dated stories are held for the
        // guarded Worker check once their public date arrives.
        const isoDate = (d: any) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
        const savedDate = saved[0]?.date ? isoDate(saved[0].date) : null;
        const todayIso = new Date().toISOString().slice(0, 10);
        const isFutureDated = !!savedDate && savedDate > todayIso;
        const initialPublication = published
          && !prev[0]?.social_posted_at
          && (!prev.length || prev[0].published === false);
        const automationEligible = initialPublication && contentAutomationReady();
        if (automationEligible) {
          // This is the explicit opt-in that makes a story eligible for the
          // scheduled publisher. Existing archive rows retain the DB default
          // of false and are never sent merely because a channel is connected.
          await q(`UPDATE posts SET social_automation_enabled=true WHERE slug=$1`, [slug]);
        }
        if (isFutureDated && published) {
          console.log(`[social] ${slug}: scheduled for ${savedDate}, skipping announce until then`);
        }
        if (automationEligible && !isFutureDated) {
          after(() => dispatchArticleAnnouncement(slug).catch((e) => console.log('[social] announce failed:', e?.message)));
        }
        if (initialPublication) {
          after(() => notifyPostPublished({ slug, headline: String(data.headline), section: data.section || 'News' }));
        }
        // Ping IndexNow on every save of a live (published, not future-dated)
        // article, not just first publish - the spec covers updates too, and
        // an edited headline/body is exactly what we want re-crawled. The
        // events/shop admin mutations already do the same (see admin/ops).
        if (published && !isFutureDated) {
          after(() => pingIndexNow([`/blog/${slug}`, '/blog', '/feed.xml', '/news-sitemap.xml']));
          // Flush the sitemap cache so the new post URL appears immediately.
          revalidatePath('/sitemap.xml');
          revalidateTag('sitemap');
        }
        return NextResponse.json({ ok: true, slug });
      }
      case 'deletePost': {
        await ensureContentWorkflowSchema();
        const actor = adminActor(req);
        const existing = await q<{ published: boolean; submitted_by: string }>(
          `SELECT published, submitted_by FROM posts WHERE slug=$1`, [data.slug]
        );
        if (!existing.length) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        if (!isSuperAdmin(req) && (existing[0].published || !existing[0].submitted_by || existing[0].submitted_by !== actor)) {
          return NextResponse.json({ error: 'review_required' }, { status: 403 });
        }
        await q(`DELETE FROM posts WHERE slug=$1`, [data.slug]);
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'delete_post',$2)`, [actor, JSON.stringify({ slug: data.slug })]);
        // IndexNow handles removals the same as updates - engines re-crawl,
        // see the 404 and drop the URL.
        after(() => pingIndexNow([`/blog/${data.slug}`, '/blog']));
        return NextResponse.json({ ok: true });
      }
      case 'setting':
        if (data.key === 'whatsapp_number' &&
          (typeof data.value !== 'string' || !/^\d{10,15}$/.test(data.value))) {
          return NextResponse.json({ error: 'invalid_whatsapp_number' }, { status: 400 });
        }
        if (data.key === 'notify_email' &&
          (typeof data.value !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.value) || data.value.length > 200)) {
          return NextResponse.json({ error: 'invalid_notify_email' }, { status: 400 });
        }
        if (String(data.key).startsWith('notify_on_') && typeof data.value !== 'boolean') {
          return NextResponse.json({ error: 'invalid_notify_toggle' }, { status: 400 });
        }
        await q(
          `INSERT INTO settings (key, value) VALUES ($1,$2)
           ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
          [String(data.key), JSON.stringify(data.value)]
        );
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,'save_setting',$2)`, [adminActor(req), JSON.stringify({ key: data.key })]);
        return NextResponse.json({ ok: true });
      case 'bookingStatus':
        if (typeof data?.id !== 'string' || !/^B-[A-Z0-9-]{4,40}$/i.test(data.id)) {
          return NextResponse.json({ error: 'invalid_booking_id' }, { status: 400 });
        }
        if (!['new', 'review', 'replied', 'confirmed', 'closed'].includes(data.status)) {
          return NextResponse.json({ error: 'invalid_booking_status' }, { status: 400 });
        }
        await q(`UPDATE bookings SET status=$2 WHERE id=$1`, [data.id, data.status]);
        return NextResponse.json({ ok: true });
      case 'orderStatus': {
        // Closed state machine (lib/server/payment-status.ts). The ledger used
        // to accept any string here — "refunded" could be typed in with no
        // ledger row, no ticket revocation and no matching amount. Manual
        // moves are now limited to allowed transitions and audit-logged; money
        // movement itself still only happens in provider callbacks.
        if (!isOrderStatus(data.status)) {
          return NextResponse.json({ error: 'invalid_order_status' }, { status: 400 });
        }
        // Refunds must always write a ledger row (amount, reason, actor) via
        // lib/server/refunds.ts — never a bare status flip. The bare
        // transition is rejected here so "refunded" cannot exist without money
        // truth behind it.
        if (data.status === 'refunded' || data.status === 'partially_refunded') {
          const { recordRefund } = await import('@/lib/server/refunds');
          try {
            const out = await recordRefund({
              orderId: data.id,
              amountKes: Math.round(Number(data.refundAmount)),
              reason: String(data.refundReason || ''),
              actor: adminActor(req),
            });
            return NextResponse.json({ ok: true, status: out.status, refundId: out.refundId });
          } catch (e: any) {
            const msg = String(e?.message || 'refund_failed');
            const status = msg === 'order_not_found' ? 404 : msg === 'order_not_refundable' ? 409 : 400;
            return NextResponse.json({ error: msg }, { status });
          }
        }
        const cur = await q<{ status: string }>(`SELECT status FROM orders WHERE id=$1`, [data.id]);
        if (!cur.length) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        if (!canAdminSetOrderStatus(cur[0].status, data.status)) {
          return NextResponse.json({ error: 'illegal_order_transition' }, { status: 409 });
        }
        await q(`UPDATE orders SET status=$2 WHERE id=$1`, [data.id, data.status]);
        await q(
          `INSERT INTO audit_log (actor, action, detail) VALUES ('admin','order_status', $1)`,
          [JSON.stringify({ id: data.id, from: cur[0].status, to: data.status, by: adminActor(req) })],
        );
        return NextResponse.json({ ok: true });
      }
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
