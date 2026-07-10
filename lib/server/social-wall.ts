// "From the Gram" wall — admin-curated list of Instagram post URLs stored in
// settings under key 'ig_wall'. No PII: the list holds only public post URLs.
import { q, db } from '@/lib/server/db';

// Only canonical public post/reel URLs are ever accepted or served.
export const IG_POST_RE = /^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]{5,40}\/?$/;
export const IG_WALL_MAX = 12;

// Normalise to a trailing-slash canonical form (the embed API expects it).
export function normalizeIgUrl(u: string): string {
  return u.endsWith('/') ? u : u + '/';
}

// Read the curated list; tolerate db()==null and bad data (returns []).
export async function getIgWall(): Promise<string[]> {
  try {
    if (!db()) return [];
    const rows = await q(`SELECT value FROM settings WHERE key='ig_wall'`);
    const raw = rows[0]?.value;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((u: any) => typeof u === 'string' && IG_POST_RE.test(u))
      .map(normalizeIgUrl)
      .slice(0, IG_WALL_MAX);
  } catch {
    return [];
  }
}
