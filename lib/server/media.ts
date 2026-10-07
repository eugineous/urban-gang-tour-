// Durable uploaded images and generated documents use Workers KV. Bundled
// logos, photos, videos and fonts stay in ASSETS, not this upload store.
import { createHash } from 'node:crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export type MediaMetadata = { contentType: string; size: number };
interface MediaStore {
  put(key: string, value: Uint8Array, options: { metadata: MediaMetadata }): Promise<void>;
  getWithMetadata<T>(key: string, type: 'arrayBuffer'): Promise<{ value: ArrayBuffer | null; metadata: T | null }>;
  delete(key: string): Promise<void>;
}
const PREFIXES = ['gallery', 'promo-hero', 'promo-partner', 'documents', 'organizer-events'];
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_BYTES = 15 * 1024 * 1024;
function store(): MediaStore | null {
  try { return (getCloudflareContext().env as unknown as { UGT_MEDIA?: MediaStore }).UGT_MEDIA || null; }
  catch { return null; }
}
export const mediaConfigured = () => Boolean(store());
export function validMediaKey(key: string): boolean {
  const parts = key.split('/');
  return key.length <= 512 && parts.length >= 2 && PREFIXES.includes(parts[0]) &&
    parts.every(part => part !== '.' && part !== '..' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part));
}
export function mediaKey(url: string): string | null {
  let path = url;
  if (/^https?:\/\//.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== new URL(process.env.SITE_URL || 'https://urbangangtour.co.ke').origin || parsed.search || parsed.hash) return null;
      path = parsed.pathname;
    } catch { return null; }
  }
  if (!path.startsWith('/media/') || path.includes('%')) return null;
  const key = path.slice(7);
  return validMediaKey(key) && /\/[a-f0-9]{64}\//.test(key) ? key : null;
}
export const isMediaUrl = (url: string) => mediaKey(url) !== null;
export async function mediaPut(pathname: string, body: Buffer | Uint8Array, options: { contentType?: string } = {}) {
  if (!validMediaKey(pathname)) throw new Error('invalid_pathname');
  if (!TYPES.includes(options.contentType || '')) throw new Error('invalid_content_type');
  if (!body.byteLength || body.byteLength > MAX_BYTES) throw new Error('invalid_size');
  const storage = store();
  if (!storage) throw new Error('media_not_configured');
  const at = pathname.lastIndexOf('/');
  const digest = createHash('sha256').update(body).digest('hex');
  const key = `${pathname.slice(0, at)}/${digest}/${pathname.slice(at + 1)}`;
  await storage.put(key, new Uint8Array(body), { metadata: { contentType: options.contentType!, size: body.byteLength } });
  return { key, url: '/media/' + key };
}
export async function mediaGet(url: string) {
  const key = mediaKey(url);
  if (!key) return null;
  const storage = store();
  if (!storage) throw new Error('media_not_configured');
  const result = await storage.getWithMetadata<MediaMetadata>(key, 'arrayBuffer');
  if (!result.value || !result.metadata || !TYPES.includes(result.metadata.contentType)) return null;
  return { value: result.value, metadata: result.metadata };
}
export async function mediaDel(url: string): Promise<void> {
  const key = mediaKey(url);
  if (!key) throw new Error('invalid_url');
  const storage = store();
  if (!storage) throw new Error('media_not_configured');
  await storage.delete(key);
}
