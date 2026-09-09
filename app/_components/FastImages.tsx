'use client';

import { useEffect } from 'react';
import { cfImage, cfSrcSet, isResizable } from '@/lib/img';

// Runtime half of the image fix (the static half is rewriteHtmlMedia() in
// lib/img.ts).
//
// Most images on the v25 pages are not literal paths in the markup - they are
// bindings like src="{{ m.img }}" that the dc-runtime fills in after boot, from
// the crew/product/gallery data. Those never pass through the server-side HTML
// rewrite, so they were still pulling full-size originals: the shop grid alone
// fetched 6.5MB of merch PNGs, on the homepage, because the runtime renders
// every page into one DOM.
//
// A MutationObserver catches each <img> as the runtime inserts it and swaps the
// source for an edge-resized one before the browser has committed to the
// download. It also fixes any <video> the runtime injects, for the same
// iOS-autoplay reason described in lib/img.ts.

/** Marker attribute shared with the head script in app/layout.tsx. */
const FELL_BACK = 'data-ugt-fellback';

function fixImage(el: HTMLImageElement) {
  if (el.dataset.ugtFast === '1') return;
  // Already fell back to the unresized original because the resizer failed.
  // Without this the two halves fight: the fallback sets src back to
  // /assets/..., the observer below sees that src change and re-rewrites it to
  // the /cdn-cgi/ URL that just failed, and the image stays broken forever
  // because the fallback only fires once per element.
  //
  // getAttribute rather than dataset: the head script in app/layout.tsx has to
  // write this attribute too, and `dataset.ugtFellBack` would serialise to
  // data-ugt-fell-back, a different attribute from the one that script sets.
  if (el.getAttribute(FELL_BACK) === '1') return;
  // getAttribute, not .src - .src resolves to an absolute URL and would defeat
  // the isResizable() path check.
  const raw = el.getAttribute('src') || '';

  // An unresolved binding: the runtime has not filled it in yet. Leave it and
  // let the next mutation catch it. (These were being requested literally -
  // the live site was firing real GETs for "{{ line.img }}".)
  if (raw.includes('{{')) return;
  if (!isResizable(raw)) {
    el.dataset.ugtFast = '1';
    if (!el.loading) el.loading = 'lazy';
    return;
  }

  el.dataset.ugtFast = '1';
  el.setAttribute('data-ugt-src', raw); // fallback target - see installImageFallback below
  el.setAttribute('srcset', cfSrcSet(raw));
  if (!el.getAttribute('sizes')) el.setAttribute('sizes', '(max-width: 700px) 100vw, 50vw');
  el.setAttribute('src', cfImage(raw, 960));
  el.loading = 'lazy';
  el.decoding = 'async';
}

/**
 * Fall back to the unresized original whenever an edge-resized URL fails.
 *
 * Routing every image through /cdn-cgi/image/ makes Cloudflare's resizer a
 * single point of failure for the entire site's imagery. If it is disabled,
 * rate-limited, or the zone changes, every image 404s at once - and on
 * localhost the path does not exist at all. One capture-phase listener catches
 * those failures and restores the original path, so the worst case is the site
 * looking exactly like it did before this change rather than having no images.
 */
function installImageFallback(): () => void {
  const onError = (e: Event) => {
    const el = e.target;
    if (!(el instanceof HTMLImageElement)) return;
    const orig = el.getAttribute('data-ugt-src');
    if (!orig || el.getAttribute(FELL_BACK) === '1') return;
    el.setAttribute(FELL_BACK, '1');
    el.removeAttribute('srcset');
    el.removeAttribute('sizes');
    el.setAttribute('src', orig);
  };
  // Capture phase: image load errors do not bubble.
  document.addEventListener('error', onError, true);
  return () => document.removeEventListener('error', onError, true);
}

function fixVideo(el: HTMLVideoElement) {
  if (el.dataset.ugtFast === '1') return;
  el.dataset.ugtFast = '1';
  // These four together are what iOS requires to play a video inline without a
  // tap. Set as properties AND attributes: Safari checks the attribute at the
  // moment the element is inserted.
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  el.loop = true;
  el.setAttribute('muted', '');
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.setAttribute('loop', '');

  const poster = el.getAttribute('poster') || '';
  if (isResizable(poster)) el.setAttribute('poster', cfImage(poster, 960, 62));

  // On a metered or slow connection, never pull the video at all - the poster
  // is enough and the visitor keeps their data.
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slow = c?.saveData === true || /^(slow-)?2g$/.test(c?.effectiveType || '');
  if (slow) {
    el.removeAttribute('autoplay');
    el.preload = 'none';
    el.removeAttribute('src');
    el.load();
    return;
  }

  el.preload = 'metadata';
  el.autoplay = true;
  el.setAttribute('autoplay', '');
  // play() can still be rejected (low power mode). That is fine - the poster
  // stays up instead of a dead coloured rectangle.
  void el.play?.().catch(() => {});
}

function sweep(root: ParentNode) {
  root.querySelectorAll?.('img').forEach((el) => fixImage(el as HTMLImageElement));
  root.querySelectorAll?.('video').forEach((el) => fixVideo(el as HTMLVideoElement));
}

export function FastImages() {
  useEffect(() => {
    const removeFallback = installImageFallback();
    sweep(document);

    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' && r.target instanceof HTMLImageElement) {
          // The runtime re-wrote a src (a binding resolving, or a page switch).
          delete r.target.dataset.ugtFast;
          fixImage(r.target);
          continue;
        }
        for (const n of r.addedNodes) {
          if (n instanceof HTMLImageElement) fixImage(n);
          else if (n instanceof HTMLVideoElement) fixVideo(n);
          else if (n instanceof Element) sweep(n);
        }
      }
    });

    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });

    return () => {
      obs.disconnect();
      removeFallback();
    };
  }, []);

  return null;
}
