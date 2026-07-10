// Meta Graph API posting — SERVER-SIDE ONLY. Tokens come from env vars and are
// never sent to the client. Every function returns { ok, error? } and never
// throws, so callers can fire-and-forget without risking the request path.
//
// Env (see .env.local.example):
//   META_FB_PAGE_ID  + META_FB_PAGE_TOKEN  -> Facebook Page feed posts
//   META_IG_USER_ID  + META_IG_TOKEN       -> Instagram Business feed posts

const GRAPH = 'https://graph.facebook.com/v21.0';

export type SocialResult = { ok: boolean; error?: string };

export function facebookConfigured(): boolean {
  return !!(process.env.META_FB_PAGE_ID && process.env.META_FB_PAGE_TOKEN);
}

export function instagramConfigured(): boolean {
  return !!(process.env.META_IG_USER_ID && process.env.META_IG_TOKEN);
}

async function graphPost(path: string, body: Record<string, string>): Promise<{ ok: boolean; data: any }> {
  const r = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

function graphError(data: any): string {
  return String(data?.error?.message || 'graph_api_error').slice(0, 200);
}

// Post a message (optionally with a link preview) to the Facebook Page feed.
export async function postToFacebookPage(input: { message: string; link?: string }): Promise<SocialResult> {
  if (!facebookConfigured()) return { ok: false, error: 'facebook_not_configured' };
  try {
    const body: Record<string, string> = {
      message: input.message,
      access_token: process.env.META_FB_PAGE_TOKEN!,
    };
    if (input.link) body.link = input.link;
    const { ok, data } = await graphPost(`${process.env.META_FB_PAGE_ID}/feed`, body);
    return ok ? { ok: true } : { ok: false, error: graphError(data) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 200) };
  }
}

// Instagram feed post — two-step: create a media container, then publish it.
// imageUrl must be a public absolute https URL (Meta fetches it server-side).
export async function postToInstagram(input: { imageUrl: string; caption: string }): Promise<SocialResult> {
  if (!instagramConfigured()) return { ok: false, error: 'instagram_not_configured' };
  if (!/^https:\/\//.test(input.imageUrl)) return { ok: false, error: 'image_url_must_be_https' };
  try {
    const igUser = process.env.META_IG_USER_ID!;
    const token = process.env.META_IG_TOKEN!;
    const create = await graphPost(`${igUser}/media`, {
      image_url: input.imageUrl,
      caption: input.caption,
      access_token: token,
    });
    if (!create.ok || !create.data?.id) return { ok: false, error: graphError(create.data) };
    const publish = await graphPost(`${igUser}/media_publish`, {
      creation_id: String(create.data.id),
      access_token: token,
    });
    return publish.ok ? { ok: true } : { ok: false, error: graphError(publish.data) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 200) };
  }
}
