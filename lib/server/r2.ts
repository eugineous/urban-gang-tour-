// Cloudflare R2 storage helpers - replaces @vercel/blob.
//
// Uses the native R2 Workers binding (env.UGT_UPLOADS, declared in
// wrangler.toml) instead of R2's S3-compatible API. No R2 API credentials
// exist anywhere in this app: the binding is authenticated by Cloudflare
// itself (same account, same Worker) with zero keys to generate, store, or
// rotate. This does mean uploads that used to go straight from the browser
// to storage via a presigned URL (@vercel/blob/client's handleUpload, then
// the R2 S3-API presigned-PUT equivalent) now proxy through this Worker
// instead - see app/api/admin/gallery/upload/route.ts and
// app/api/admin/docs/hero-upload/route.ts. Cloudflare's own presigned-URL
// docs confirm there is no way to generate an R2 presigned URL without R2 API
// credentials (accessKeyId/secretAccessKey) even from inside a Worker - the
// binding's zero-credential model and presigned URLs are mutually exclusive.
// Since these are admin-only, low-traffic upload paths (gallery photos,
// promo hero/partner images), routing the file bytes through the Worker
// instead of a direct-to-storage PUT is a fine trade.
//
// Required env var:
//   R2_PUBLIC_URL_BASE - the public base URL for the bucket: either the
//                         bucket's r2.dev subdomain (R2 > bucket > Settings
//                         > Public Access) or a custom domain mapped to it
//                         (e.g. "https://uploads.urbangangtour.co.ke"). Not a
//                         credential - just a URL prefix used to build the
//                         link returned to callers after an upload. Required
//                         for uploads to be link-able/servable - without it
//                         uploads still succeed but the returned URL will
//                         not be publicly reachable.
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Deliberately NOT importing the real `R2Bucket` type from
// `@cloudflare/workers-types` (and not globally augmenting `CloudflareEnv`
// with it either): that package declares its types as bare global ambients
// (Response, Request, Headers, fetch, etc. among them), and merging those
// into this Next.js app's DOM-typed program (tsconfig's `lib: ["dom", ...]`)
// silently changed unrelated code's inferred types elsewhere in the app -
// found the hard way, it broke `Response.json()`'s return type in
// app/_components/PromoBanner.tsx during a real build. A narrow local
// interface for just the 2 methods called here (put/delete) avoids that
// global conflict entirely while still being fully accurate for our usage.
interface MinimalR2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string | null,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

function bucket(): MinimalR2Bucket | null {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as { UGT_UPLOADS?: MinimalR2Bucket }).UGT_UPLOADS ?? null;
  } catch {
    // getCloudflareContext() throws when called outside a Cloudflare
    // request context (e.g. a plain `next build`/`next start` invocation
    // with no Workers runtime under it, or local dev without
    // initOpenNextCloudflareForDev() wired into next.config.mjs).
    return null;
  }
}

export function r2Configured(): boolean {
  return !!bucket();
}

function publicBase(): string {
  return (process.env.R2_PUBLIC_URL_BASE || '').replace(/\/+$/, '');
}

function publicUrlFor(key: string): string {
  const base = publicBase();
  if (base) return `${base}/${key}`;
  // No public base configured yet - return something obviously non-public
  // rather than a URL that looks right but 403s, so a missing env var is
  // loud instead of silently broken.
  return `unconfigured://R2_PUBLIC_URL_BASE-not-set/${key}`;
}

// True if `url` points at our configured R2 public bucket (as opposed to a
// legacy public/assets/ path, or - pre-migration - a Vercel Blob URL). Used
// wherever code used to check against *.blob.vercel-storage.com.
export function isR2Url(url: string): boolean {
  const base = publicBase();
  if (!base) return false;
  return url.startsWith(base + '/');
}

export interface PutResult {
  url: string;
  key: string;
}

// Server-side buffer upload - replaces @vercel/blob's put(). Used both by
// call sites that already hold the full file in memory server-side
// (app/api/admin/docs/generate/route.ts) and by the proxy-upload routes
// below (the browser POSTs the file to us, we .put() it to R2 via the
// binding).
export async function r2Put(key: string, body: Buffer | Uint8Array, opts: { contentType?: string } = {}): Promise<PutResult> {
  const b = bucket();
  if (!b) throw new Error('r2_not_configured');
  await b.put(key, body, {
    httpMetadata: opts.contentType ? { contentType: opts.contentType } : undefined,
  });
  return { url: publicUrlFor(key), key };
}

// Replaces @vercel/blob's del(). Accepts either a full public URL (the key is
// recovered from it) or a raw key.
export async function r2Del(urlOrKey: string): Promise<void> {
  const b = bucket();
  if (!b) throw new Error('r2_not_configured');
  const base = publicBase();
  const key = base && urlOrKey.startsWith(base + '/') ? urlOrKey.slice(base.length + 1) : urlOrKey;
  await b.delete(key);
}
