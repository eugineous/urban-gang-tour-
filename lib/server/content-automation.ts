import { hasDb, q } from './db';
import { SITE } from '@/lib/site';
import { facebookConfigured, instagramConfigured, postToFacebookPage, postToInstagram } from '@/lib/meta-social';

export type ScheduledPost = { slug: string; headline: string; dek: string; image: string };

// Outbound publishing is deliberately a two-key decision. Credentials only
// prove that a channel can be reached; they must not turn every new article
// into a post. An owner has to opt in to automation and name each target.
// Keeping this server-side also means a browser or a saved settings row cannot
// enable external delivery by accident.
export function contentAutomationEnabled(): boolean {
  return process.env.UGT_SOCIAL_AUTOMATION_ENABLED === 'true';
}

function automatedTargets(): Set<'fb' | 'ig'> {
  const raw = process.env.META_AUTOPOST_TARGETS || '';
  const values = raw.toLowerCase().split(',').map((value) => value.trim());
  const targets = new Set<'fb' | 'ig'>();
  if (values.includes('fb')) targets.add('fb');
  if (values.includes('ig')) targets.add('ig');
  return targets;
}

function hasAutomatedChannel(): boolean {
  const targets = automatedTargets();
  return (targets.has('fb') && facebookConfigured()) || (targets.has('ig') && instagramConfigured());
}

// Readiness is intentionally stricter than the owner switch. Publishing a
// story while targets or channel credentials are incomplete never creates a
// latent queue which could surprise the owner later when credentials appear.
export function contentAutomationReady(): boolean {
  return contentAutomationEnabled() && hasAutomatedChannel();
}

// Sends only the announcement of an already-public article. This function
// never changes publication state, creates content, or accepts browser input.
export async function announcePublishedArticle(post: ScheduledPost): Promise<{ posted: boolean; result: string }> {
  if (!contentAutomationEnabled()) return { posted: false, result: 'automation_disabled' };
  const url = `${SITE.domain}/blog/${post.slug}`;
  const summary = [post.headline, post.dek].filter(Boolean).join('\n\n');
  const targets = automatedTargets();
  const results: string[] = [];
  let posted = false;

  if (targets.has('fb') && facebookConfigured()) {
    const r = await postToFacebookPage({ message: `${summary}\n\n${url}`, link: url });
    results.push(r.ok ? 'facebook:posted' : `facebook:failed(${r.error || 'error'})`);
    posted ||= r.ok;
  }
  if (targets.has('ig') && instagramConfigured()) {
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

export async function ensureContentAutomationSchema(): Promise<void> {
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_posted_at TIMESTAMPTZ`);
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_automation_claimed_at TIMESTAMPTZ`);
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_automation_result TEXT DEFAULT ''`);
  // Legacy published rows are deliberately opt-out. Only a Control Room save
  // that explicitly enters the publication workflow can enable an outbound
  // social announcement. Connecting a channel must never blast the archive.
  await q(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS social_automation_enabled BOOLEAN NOT NULL DEFAULT false`);
}

type DispatchOutcome = 'posted' | 'held' | 'skipped';

// Claims the current database row before making any external request. Calling
// this from both the immediate publish hook and the scheduled Worker means a
// later unpublish, an edit, or a second worker invocation cannot deliver an
// old in-memory copy of the story.
export async function dispatchArticleAnnouncement(slug: string): Promise<DispatchOutcome> {
  if (!hasDb()) throw new Error('db_not_configured');
  if (!contentAutomationReady()) return 'skipped';
  await ensureContentAutomationSchema();
  const claim = await q<ScheduledPost>(
    `UPDATE posts
       SET social_automation_claimed_at=now(), social_automation_result='dispatching'
     WHERE slug=$1
       AND published
       AND date <= CURRENT_DATE
       AND social_automation_enabled=true
       AND social_posted_at IS NULL
       AND social_automation_claimed_at IS NULL
     RETURNING slug, headline, dek, image`,
    [slug],
  );
  const post = claim[0];
  if (!post) return 'skipped';
  try {
    const outcome = await announcePublishedArticle(post);
    if (outcome.posted) {
      await q(
        `UPDATE posts
           SET social_posted_at=now(), social_automation_enabled=false, social_automation_result=$2
         WHERE slug=$1`,
        [post.slug, outcome.result.slice(0, 500)],
      );
      return 'posted';
    }
    await q(`UPDATE posts SET social_automation_result=$2 WHERE slug=$1`, [post.slug, outcome.result.slice(0, 500)]);
    return 'held';
  } catch (error: any) {
    await q(
      `UPDATE posts SET social_automation_result=$2 WHERE slug=$1`,
      [post.slug, `dispatch_error:${String(error?.message || error).slice(0, 420)}`],
    );
    return 'held';
  }
}

// A conservative queue for stories explicitly enabled at their first Control
// Room publication. A row is claimed before any network call, and a failed
// attempt remains claimed rather than blindly retrying and creating duplicate
// public posts. A super admin can intentionally re-save the article to clear
// the claim after correcting its image or copy.
export async function dispatchDueArticleAnnouncements(limit = 10): Promise<{ scanned: number; posted: number; held: number; disabled: boolean }> {
  if (!hasDb()) throw new Error('db_not_configured');
  if (!contentAutomationReady()) {
    return { scanned: 0, posted: 0, held: 0, disabled: true };
  }
  await ensureContentAutomationSchema();
  const candidates = await q<{ slug: string }>(
    `SELECT slug FROM posts
     WHERE published AND date <= CURRENT_DATE
       AND social_automation_enabled=true
       AND social_posted_at IS NULL AND social_automation_claimed_at IS NULL
     ORDER BY date ASC, slug ASC LIMIT $1`,
    [Math.max(1, Math.min(25, Math.floor(limit)))]
  );
  let posted = 0;
  let held = 0;
  for (const post of candidates) {
    const outcome = await dispatchArticleAnnouncement(post.slug);
    if (outcome === 'posted') posted += 1;
    if (outcome === 'held') held += 1;
  }
  return { scanned: candidates.length, posted, held, disabled: false };
}
