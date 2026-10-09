// Responsive media. Bundled assets use build-generated WebP files, so a
// disabled edge resizer cannot force phones to download the large originals.
// Other same-origin uploads retain the edge-resizing path and error fallback.
// scripts/build-light-media.mjs generates the versioned files before a build.

/** Widths generated at build time. Kept short so the cache stays hot. */
export const IMG_WIDTHS = [480, 960, 1440] as const;

const RESIZABLE = /\.(png|jpe?g|webp|avif)$/i;

/** True for a path we can safely route through the resizer. */
export function isResizable(src: string): boolean {
  if (!src) return false;
  // Already resized, an inline data URI, an unresolved template binding, or a
  // cross-origin asset the edge does not own.
  if (src.startsWith('/cdn-cgi/')) return false;
  if (src.startsWith('/assets/light-v1/')) return false;
  if (src.startsWith('data:')) return false;
  if (src.includes('{{')) return false;
  if (/^https?:\/\//i.test(src)) return false;
  if (!src.startsWith('/')) return false;
  // SVGs are already tiny and vector - resizing them only loses quality.
  if (/\.svg$/i.test(src)) return false;
  return RESIZABLE.test(src.split('?')[0]);
}

/** One resized URL. `fit=scale-down` never upscales past the source. */
export function cfImage(src: string, width: number, quality = 76): string {
  if (!isResizable(src)) return src;
  if (src.startsWith('/assets/')) {
    const size = IMG_WIDTHS.find((w) => w >= width) ?? 1440;
    return `/assets/light-v1/${src.slice('/assets/'.length).split('?')[0]}.${size}.webp`;
  }
  return `/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down/${src.replace(/^\//, '')}`;
}

/** A full srcset across IMG_WIDTHS so the browser picks per device and DPR. */
export function cfSrcSet(src: string, quality = 76): string {
  if (!isResizable(src)) return '';
  return IMG_WIDTHS.map((w) => `${cfImage(src, w, quality)} ${w}w`).join(', ');
}
