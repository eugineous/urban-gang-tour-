// Durable uploaded images and generated documents use Workers KV. Bundled
// logos, photos, videos and fonts stay in ASSETS, not this upload store.
import { createHash } from 'node:crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {mediaBudgetKey,reserveMediaStorage,markMediaStored,releaseMediaStorage,mediaBudgetStatus} from './media-budget';

export type MediaMetadata = { contentType: string; size: number };
interface MediaStore {
  put(key: string, value: Uint8Array, options: { metadata: MediaMetadata }): Promise<void>;
  getWithMetadata<T>(key: string, type: 'arrayBuffer'): Promise<{ value: ArrayBuffer | null; metadata: T | null }>;
  delete(key: string): Promise<void>;
  list(options:{cursor?:string;limit:number}):Promise<{keys:{name:string;metadata?:MediaMetadata}[];list_complete:boolean;cursor?:string}>;
}
const PREFIXES = ['gallery', 'promo-hero', 'promo-partner', 'documents', 'organizer-events', 'admin-events', 'admin-stories', 'admin-campaigns', 'admin-products'];
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf','video/mp4'];
const MAX_BYTES = 15 * 1024 * 1024;
async function inventory(storage:MediaStore){
 const files:{key:string;bytes:number}[]=[];let cursor:string|undefined;
 for(let page=0;page<10;page++){
  const result=await storage.list({limit:1000,...(cursor?{cursor}:{})});
  for(const item of result.keys){
   const size=item.metadata?.size;
   // Older control records have no byte metadata. Reserve the KV object
   // maximum rather than read their private content or undercount storage.
   files.push({key:mediaBudgetKey(item.name),bytes:Number.isSafeInteger(size)&&Number(size)>0?Number(size):25*1024*1024});
  }
  if(result.list_complete)return files;
  if(!result.cursor||result.cursor===cursor)throw Error('media_inventory_unavailable');cursor=result.cursor;
 }
 throw Error('media_inventory_unavailable');
}
export async function mediaStorageStatus(){const storage=store();if(!storage)throw Error('media_not_configured');return mediaBudgetStatus(()=>inventory(storage))}
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
  if(options.contentType==='video/mp4'&&!pathname.startsWith('gallery/'))throw Error('invalid_content_type');
  if (!body.byteLength || body.byteLength > MAX_BYTES) throw new Error('invalid_size');
  const storage = store();
  if (!storage) throw new Error('media_not_configured');
  const at = pathname.lastIndexOf('/');
  const digest = createHash('sha256').update(body).digest('hex');
  const key = `${pathname.slice(0, at)}/${digest}/${pathname.slice(at + 1)}`;
  const budgetKey=mediaBudgetKey(key);
  if(await reserveMediaStorage(budgetKey,body.byteLength,()=>inventory(storage))){
   await storage.put(key, new Uint8Array(body), { metadata: { contentType: options.contentType!, size: body.byteLength } });
   await markMediaStored(budgetKey);
  }
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
  await releaseMediaStorage(mediaBudgetKey(key));
}
