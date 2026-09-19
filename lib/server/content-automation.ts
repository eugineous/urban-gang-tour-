import { hasDb, q } from './db';
import { SITE } from '@/lib/site';
import { facebookConfigured, instagramConfigured, postToFacebookPage, postToInstagram } from '@/lib/meta-social';

export type ScheduledPost = { slug: string; headline: string; dek: string; image: string };

// Sends only the announcement of an already-public article. This function
// never changes publication state, creates content, or accepts browser input.
export async function announcePublishedArticle(post: ScheduledPost): Promise<{ posted: boolean; result: string }> {
  const url = `${SITE.domain}/blog/${post.slug}`;
  const summary = [post.headline, post.dek].filter(Boolean).join('\n\n');
  const targets = (process.env.META_AUTOPOST_TARGETS || 'fb,ig').toLowerCase();
  const results: string[] = [];
  let posted = false;

  if (targets.includes('fb') && facebookConfigured()) {
    const r = await postToFacebookPage({ message: `${summary}\n\n${url}`, link: url });
    results.push(r.ok ? 'facebook:posted' : `facebook:failed(${r.error || 'error'})`);
    posted ||= r.ok;
  }
  if (targets.includes('ig') && instagramConfigured()) {
    const imageUrl = post.image.startsWith('https://') ? post.image : post.image.startsWith('/') ? SITE.domain + post.image : '';
    if (!imageUrl) {
      results.push('instagram:skipped(no_public_image)');
    } else {
      const r = await postToInstagram({ imageUrl, caption: `${summary}\n\nRead the full story, link in bio. #UrbanGangTour #UrbanNews #Yezaskiii` });
      results.push(r.ok ? 'instagram:posted' : `instagram:failed(${r.error || 'error'})`);
      posted ||= r.ok;
    }
  }
  return { posted, result: results.join(' · ') || 'no_enabled_channel' };
}

async function ensureAutomationColumns(): Promise<void> {
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_posted_at TIMESTAMPTZ`);
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_automation_claimed_at TIMESTAMPTZ`);
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_automation_result TEXT DEFAULT ''`);
}

// A conservative queue for future-dated stories. A row is claimed before any
// network call, and a failed attempt remains claimed rather than blindly
// retrying and creating duplicate public posts. A super admin can intentionally
// re-save the article to clear the claim after correcting its image or copy.
export async function dispatchDueArticleAnnouncements(limit = 10): Promise<{ scanned: number; posted: number; held: number; disabled: boolean }> {
  if (!hasDb()) throw new Error('db_not_configured');
  if (!facebookConfigured() && !instagramConfigured()) return { scanned: 0, posted: 0, held: 0, disabled: true };
  await ensureAutomationColumns();
  const candidates = await q<ScheduledPost>(
    `SELECT slug, headline, dek, image FROM posts
     WHERE published AND date <= CURRENT_DATE AND social_posted_at IS NULL
       AND social_automation_claimed_at IS NULL
     ORDER BY date ASC, slug ASC LIMIT $1`,
    [Math.max(1, Math.min(25, Math.floor(limit)))]
  );
  let posted = 0;
  let held = 0;
  for (const post of candidates) {
    const claim = await q<{ slug: string }>(
      `UPDATE posts SET social_automation_claimed_at=now(), social_automation_result='dispatching'
       WHERE slug=$1 AND published AND date <= CURRENT_DATE AND social_posted_at IS NULL
         AND social_automation_claimed_at IS NULL RETURNING slug`,
      [post.slug]
    );
    if (!claim.length) continue;
    try {
      const outcome = await announcePublishedArticle(post);
      if (outcome.posted) {
        posted += 1;
        await q(`UPDATE posts SET social_posted_at=now(), social_automation_result=$2 WHERE slug=$1`, [post.slug, outcome.result.slice(0, 500)]);
      } else {
        held += 1;
        await q(`UPDATE posts SET social_automation_result=$2 WHERE slug=$1`, [post.slug, outcome.result.slice(0, 500)]);
      }
    } catch (error: any) {
      held += 1;
      await q(`UPDATE posts SET social_automation_result=$2 WHERE slug=$1`, [post.slug, `dispatch_error:${String(error?.message || error).slice(0, 420)}`]);
    }
  }
  return { scanned: candidates.length, posted, held, disabled: false };
}
