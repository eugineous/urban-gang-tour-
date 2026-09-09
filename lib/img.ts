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

/**
 * Rewrite every <img> in a raw HTML string to go through the resizer, and make
 * it lazy + async-decoded. Used on both the server-rendered shells and the v25
 * template, so a single change covers images that are written as literal paths
 * anywhere in the markup.
 *
 * Runtime-bound sources (src="{{ expr }}") are deliberately left alone here -
 * they have no value yet at this point. installImageRewriter() in
 * app/_components/FastImages.tsx catches those once the runtime fills them in.
 */
export function rewriteHtmlImages(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (tag, attrs: string) => {
    const srcMatch = attrs.match(/\ssrc=["']([^"']+)["']/i);
    const src = srcMatch?.[1] ?? '';
    let out = attrs;
    if (src.includes('{{')) {
      out = out.replace(/\ssrc=/i, ' data-ugt-bound-src=');
    }

    if (isResizable(src)) {
      // Default the layout hint to full-width-on-mobile, half on desktop. Any
      // tag that already declares its own sizes keeps it.
      const sizes = /\ssizes=/i.test(attrs) ? '' : ' sizes="(max-width: 700px) 100vw, 50vw"';
      out =
        out.replace(/\ssrc=["'][^"']+["']/i, ` src="${cfImage(src, 960)}"`) +
        ` srcset="${cfSrcSet(src)}"${sizes}` +
        // The original path, kept so the page can fall back to it. Routing
        // everything through /cdn-cgi/image/ makes edge resizing a single point
        // of failure: if it is ever turned off, or the zone moves, every image
        // on the site 404s at once. installImageFallback() watches for that and
        // swaps this back in. It is also what makes the page work on localhost,
        // where /cdn-cgi/ does not exist at all.
        ` data-ugt-src="${src}"`;
    }

    // Every image below the fold decodes off the main thread and only when it
    // is actually near the viewport. This is the half that stops the OOM.
    if (!/\sloading=/i.test(out)) out += ' loading="lazy"';
    if (!/\sdecoding=/i.test(out)) out += ' decoding="async"';

    return `<img${out}>`;
  });
}

/**
 * Repair <video> tags in a raw HTML string.
 *
 * The v25 template writes React-style attributes into plain HTML:
 *   <video autoPlay="{{ true }}" muted="{{ true }}" playsInline="{{ true }}">
 * Those placeholders were never interpolated, so the live page had
 * playsinline=false and autoplay=false. On iOS that is fatal: Safari refuses
 * inline autoplay without a real `playsinline` + `muted`, the video never
 * paints, and the element's own `background:#E6218C` fills the screen. That is
 * the "orange screen" people were reporting.
 *
 * This also drops preload from "auto" to "none": a 3.5MB hero video was being
 * pulled down before anything else could render.
 */
export function rewriteHtmlVideos(html: string): string {
  return html.replace(/<video\b([^>]*)>/gi, (tag, attrs: string) => {
    let out = attrs
      // Strip both forms before re-adding: the broken pseudo-attributes
      // (playsInline="{{ true }}") and any already-correct bare booleans the
      // captured shells carry, so the result has exactly one of each rather
      // than `muted autoplay ... autoplay muted loop playsinline`.
      .replace(/\s(?:autoPlay|autoplay|muted|loop|playsInline|playsinline|disablePictureInPicture|disablepictureinpicture)(?:=["'][^"']*["'])?(?=\s|$)/gi, '')
      .replace(/\spreload=["'][^"']*["']/gi, '');

    // Real HTML boolean attributes. muted + playsinline are what make iOS allow
    // inline autoplay at all; without both, nothing plays on an iPhone.
    // Keep the source inert until FastImages sees the video in the viewport.
    // autoplay otherwise overrides preload=none, including in the hidden shell.
    out = out.replace(/\ssrc=(["'])(.*?)\1/i, ' data-ugt-video="$2"');
    out = out.replace(/\/assets\/video\/(hero-main|hero-1)\.mp4/g, '/assets/light-v1/video/$1.mp4');
    out += ' muted loop playsinline preload="none" disablepictureinpicture';

    // Point the poster at a resized still instead of the 9.3MB PNG.
    const poster = out.match(/\sposter=["']([^"']+)["']/i)?.[1];
    if (poster && isResizable(poster)) {
      out = out.replace(/\sposter=["'][^"']+["']/i, ` poster="${cfImage(poster, 960, 62)}"`);
    }

    return `<video${out}>`;
  });
}

/** Both HTML passes together. */
export function rewriteHtmlMedia(html: string): string {
  return rewriteHtmlVideos(rewriteHtmlImages(html));
}
