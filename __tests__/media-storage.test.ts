import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ env: {} as any }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => ({ env: state.env }) }));
import { mediaPut, mediaGet, mediaDel, isMediaUrl } from '../lib/server/media';
let entries: Map<string, { value: ArrayBuffer; metadata: any }>;
beforeEach(() => {
  entries = new Map();
  state.env = { UGT_MEDIA: {
    put: vi.fn(async (key, value, options) => entries.set(key, { value: value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength), metadata: options.metadata })),
    getWithMetadata: vi.fn(async key => entries.get(key) || { value: null, metadata: null }),
    delete: vi.fn(async key => entries.delete(key)),
  } };
});
it('stores bytes and MIME metadata durably under an immutable same-origin URL', async () => {
  const body = Buffer.from('file bytes');
  const { url } = await mediaPut('gallery/photo.png', body, { contentType: 'image/png' });
  expect(url).toMatch(/^\/media\/gallery\/[a-f0-9]{64}\/photo.png$/);
  const stored = await mediaGet(url);
  expect(Buffer.from(stored!.value).toString()).toBe('file bytes');
  expect(stored!.metadata).toMatchObject({ contentType: 'image/png', size: body.length });
  expect(isMediaUrl(url)).toBe(true);
  await mediaDel(url); expect(await mediaGet(url)).toBeNull();
});
it('gives changed content a new URL while retaining the previous image', async () => {
  const first = await mediaPut('promo-hero/photo.png', Buffer.from('first'), { contentType: 'image/png' });
  const next = await mediaPut('promo-hero/photo.png', Buffer.from('second'), { contentType: 'image/png' });
  expect(first.url).not.toBe(next.url);
  expect(await mediaGet(first.url)).not.toBeNull();
});
it.each(['gallery/../file.png', 'gallery//file.png', 'gallery/%2e%2e/file.png', 'unknown/file.png'])('rejects unsafe upload keys: %s', async key => {
  await expect(mediaPut(key, Buffer.from('file'), { contentType: 'image/png' })).rejects.toThrow('invalid_pathname');
  expect(state.env.UGT_MEDIA.put).not.toHaveBeenCalled();
});
it('rejects executable types, oversized bodies, and forged external media URLs', async () => {
  await expect(mediaPut('gallery/photo.svg', Buffer.from('file'), { contentType: 'image/svg+xml' })).rejects.toThrow('invalid_content_type');
  await expect(mediaPut('documents/file.pdf', Buffer.alloc(15 * 1024 * 1024 + 1), { contentType: 'application/pdf' })).rejects.toThrow('invalid_size');
  expect(isMediaUrl('https://attacker.invalid/media/gallery/photo.png')).toBe(false);
  expect(isMediaUrl('/media/gallery/../photo.png')).toBe(false);
});
it('fails explicitly when durable upload storage is not bound', async () => {
  state.env = {};
  await expect(mediaPut('gallery/photo.png', Buffer.from('file'), { contentType: 'image/png' })).rejects.toThrow('media_not_configured');
});
