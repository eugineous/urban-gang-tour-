// Edge image resizing.
//
// Why this exists: the homepage was shipping 25.6MB and decoding ~97MB of image
// RAM in one go (poster.png alone was 9.3MB; lucy-ogunde.jpg was 2783x2783 and
// 2.7MB). That is what OOM-killed iOS Safari mid-scroll - the tab dies and the
// visitor gets a blank or flat-colour screen - and what made the site unusable
// on a slow Kenyan mobile connection.
//
// The zone already has Cloudflare Image Resizing enabled, so every /assets/
// image can be served through /cdn-cgi/image/ and come back correctly sized and
// in WebP/AVIF for whatever browser asked. Measured on the live site:
// lucy-ogunde.jpg 2,724,803 bytes -> 21,698 bytes at width=400. No binary in the
// repo changes; the edge does the work and caches the result.

/** Widths we are willing to ask the edge for. Kept short so the cache stays hot. */
export const IMG_WIDTHS = [320, 480, 640, 960, 1280, 1600] as const;

const RESIZABLE = /\.(png|jpe?g|webp|avif)$/i;

/** True for a path we can safely route through the resizer. */
export function isResizable(src: string): boolean {
  if (!src) return false;
  // Already resized, an inline data URI, an unresolved template binding, or a
  // cross-origin asset the edge does not own.
  if (src.startsWith('/cdn-cgi/')) return false;
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

    if (isResizable(src)) {
      // Default the layout hint to full-width-on-mobile, half on desktop. Any
      // tag that already declares its own sizes keeps it.
      const sizes = /\ssizes=/i.test(attrs) ? '' : ' sizes="(max-width: 700px) 100vw, 50vw"';
      out =
        out.replace(/\ssrc=["'][^"']+["']/i, ` src="${cfImage(src, 960)}"`) +
        ` srcset="${cfSrcSet(src)}"${sizes}`;
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
      // strip the broken pseudo-attributes in every casing they appear in
      .replace(/\s(?:autoPlay|autoplay|muted|loop|playsInline|playsinline)=["'][^"']*["']/gi, '')
      .replace(/\spreload=["'][^"']*["']/gi, '');

    // Real HTML boolean attributes. muted + playsinline are what make iOS allow
    // inline autoplay at all; without both, nothing plays on an iPhone.
    out += ' autoplay muted loop playsinline preload="none" disablepictureinpicture';

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
