// Content corrections applied to the frozen server-rendered shells in
// app/_rendered/*.html.
//
// Those files are static DOM snapshots of the v25 runtime, and the tool that
// captured them (scratchpad/cap/) is no longer in the repo - so they cannot be
// regenerated, only edited. Rather than hand-patching ten snapshots and hoping
// none drift, the corrections are expressed once here and applied on the way
// out in app/_components/RenderedPage.tsx.
//
// Two corrections, both requested directly:
//   1. MC Paps and Sauti Moto are off the tour. They come out of the crew wall,
//      the partner wall, and any prose that names them.
//   2. PPP TV Kenya is the only partner. Everyone else on that wall is an
//      investor, and the labels have to say so.
//
// When these pages are eventually rebuilt as real React components reading
// app/_data, this module and the snapshots go away together.

interface RemoveOpts {
  /**
   * Restrict the search to one tag. Without this the match is the innermost
   * element of any kind that wraps the marker, which is usually too small: a
   * crew photo's innermost wrapper is the aspect-ratio box, not the card, so
   * removing it strips the picture and leaves the name and bio behind.
   * Crew cards are `<button class="scpr">`, so callers pass tag: 'button'.
   */
  tag?: string;
  /**
   * Keep walking outward until the element also contains this string. Used for
   * the partner wall, where the innermost <div> around a logo is just the 76px
   * logo well - the card is the ancestor that also carries the "PARTNER FILE"
   * badge.
   */
  alsoContains?: string;
}

/** Elements that can plausibly be "the card" wrapping a logo or a crew photo. */
const CARD_TAGS = ['button', 'a', 'article', 'li', 'div'];

/** Remove every element enclosing `marker` that satisfies `opts`. */
export function removeEnclosing(html: string, marker: string, opts: RemoveOpts = {}): string {
  let out = html;

  // Bounded: the same marker can appear in more than one section (home.html
  // carries the Sauti Moto tile twice). A runaway would be worse than a
  // leftover, so cap the passes.
  for (let guard = 0; guard < 12; guard++) {
    const at = out.indexOf(marker);
    if (at < 0) break;

    const found = enclosingRange(out, at, marker.length, opts);
    if (!found) break;

    out = out.slice(0, found.start) + out.slice(found.end);
  }

  return out;
}

function enclosingRange(
  html: string,
  markerAt: number,
  markerLen: number,
  opts: RemoveOpts,
): { start: number; end: number } | null {
  const tags = opts.tag ? [opts.tag.toLowerCase()] : CARD_TAGS;

  // Collect every opening tag before the marker, then walk back from the
  // nearest: the first one whose matching close falls after the marker is the
  // innermost element that actually encloses it.
  const openTag = new RegExp(`<(${tags.join('|')})\\b[^>]*>`, 'gi');
  const opens: { index: number; tag: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = openTag.exec(html)) && m.index < markerAt) {
    opens.push({ index: m.index, tag: m[1].toLowerCase() });
  }

  for (let i = opens.length - 1; i >= 0; i--) {
    const { index, tag } = opens[i];
    const end = matchingClose(html, index, tag);
    if (end < 0 || end < markerAt + markerLen) continue; // does not enclose the marker

    if (opts.alsoContains && !html.slice(index, end).includes(opts.alsoContains)) continue; // too small yet

    return { start: index, end };
  }
  return null;
}

/** Index just past the `</tag>` that closes the element opening at `from`. */
function matchingClose(html: string, from: number, tag: string): number {
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, 'gi');
  re.lastIndex = from;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const isClose = m[0].startsWith('</');
    // Void/self-closed forms never open a level.
    if (!isClose && m[0].endsWith('/>')) continue;
    depth += isClose ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

/** Text-level corrections that need no structural awareness. */
function correctProse(html: string): string {
  return (
    html
      // Crew and partner bios addressed the reader as a partner.
      .replace(/For partners,/g, 'For investors,')
      // Role labels on the wall and in the crew list. PPP TV keeps "Broadcast
      // Partner"; it is restored explicitly in correctShellContent().
      .replace(/\bExperience Partner\b/g, 'Experience Investor')
      .replace(/\bPhotography Partner\b/g, 'Photography Investor')
      .replace(/\bEnvironmental Partner\b/g, 'Environmental Investor')
      .replace(/\bSound Production Partner\b/g, 'Sound Production Investor')
      .replace(/\bPartner (&amp;|&) Hypeman\b/g, 'Investor $1 Hypeman')
      .replace(/official photography partner/gi, 'official photography investor')
      .replace(
        /network of media, government, education, creative, and safety partners/gi,
        'network of media, government, education, creative, and safety investors',
      )
      // Section and nav headings, and the calls to action that invited people
      // into a partnership that is no longer on offer.
      .replace(/Our Partners/g, 'Partners &amp; Investors')
      .replace(/>Partner With Us</g, '>Invest With Us<')
      .replace(/>Start a Partnership</g, '>Become an Investor<')
      // Contact form: the enquiry list offered a partnership that is no longer
      // available to anyone new.
      .replace(/>Partnership</g, '>Investment<')
      .replace(/Bookings, partnerships, media/g, 'Bookings, investment, media')
      // Prose that named a departed act.
      .replace(
        /MC Paps warmed up the hall before the first performances,\s*and the crowd/gi,
        'The crowd',
      )
      .replace(/,?\s*opened by MC Paps/gi, '')
  );
}

/**
 * Same seed photos the live template falls back to before the DB-backed
 * gallery loads (see public/v25-template.html's galSeeds). Duplicated here
 * rather than imported because this file has to stay parseable as plain
 * string transforms with zero build-time dependency on the template.
 */
const GALLERY_SEEDS: Record<string, string[]> = {
  'Senior Chief Koinange Girls': ['/assets/gal/koinange.jpg', '/assets/gal/g-winning.jpg'],
  'Loreto Kiambu Girls High': ['/assets/gal/loreto.jpg', '/assets/gal/g-street.jpg'],
  'Gituamba Girls High School': [
    '/assets/gal/gituamba.jpg',
    '/assets/gal/festival-colours.jpg',
    '/assets/gal/g-crowning.jpg',
    '/assets/gal/g-trees.jpg',
  ],
  'Lari Boys High School': ['/assets/gal/lari.jpg'],
};

/**
 * The captured gallery.html snapshot predates the "open the gallery up" fix
 * in public/v25-template.html - it has the school chips (correct - each
 * already shows the right photo count) but ends in a single hardcoded
 * placeholder div reading "tap a school to open its catalogue", because the
 * old runtime never rendered a photo grid until a chip was clicked. That
 * snapshot was never going to be true again: nobody re-runs the capture
 * tool (see the file header), so leaving it as-is would have permanently
 * shown a crawler, and any visitor on a slow connection during the ~1s
 * before the live runtime boots, a gallery page promising an interaction
 * that no longer matches the page's real behaviour.
 *
 * Replaces the placeholder with real photo-grid markup for every catalogue
 * that actually has photos, using the same seed data and layout the live
 * template renders. Runs before rewriteHtmlMedia() in RenderedPage.tsx, so
 * the <img> tags emitted here still get the edge-resize + lazy-load pass.
 */
function injectGalleryPhotos(html: string): string {
  const marker = 'tap a school to open its catalogue';
  if (!html.includes(marker)) return html; // not the gallery page, or already fixed

  const sections = Object.entries(GALLERY_SEEDS)
    .map(([name, photos]) => {
      const grid = photos
        .map(
          (url) =>
            `<div style="border:3px solid #111;border-radius:12px;overflow:hidden;background:#fff;box-shadow:4px 4px 0 #111">` +
            `<img src="${url}" alt="${name} — Urban Gang Tour photo" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">` +
            `</div>`,
        )
        .join('');
      return (
        `<div style="margin-bottom:34px">` +
        `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">` +
        `<h2 style="font-family:'Anton';font-size:clamp(22px,3vw,34px);text-transform:uppercase;margin:0">${name}</h2>` +
        `<span style="background:#FFD400;border:2px solid #111;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:800">${photos.length} photos</span>` +
        `</div>` +
        `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">${grid}</div>` +
        `</div>`
      );
    })
    .join('');

  // Replace the whole placeholder <div ...>...marker...</div>. The marker is
  // unique to this one element in the snapshot, so removeEnclosing's
  // innermost-match behaviour lands on exactly the right node.
  const at = html.indexOf(marker);
  const found = enclosingRange(html, at, marker.length, { tag: 'div' });
  if (!found) return html; // structure changed under us - leave it rather than guess
  return html.slice(0, found.start) + sections + html.slice(found.end);
}

/**
 * The partner wall's cards carry a hardcoded "PARTNER FILE" badge. Only PPP TV
 * is entitled to it. Each badge sits just above its card's logo, so the logo
 * filename that follows within the same card decides which label it gets.
 */
function correctPartnerBadges(html: string): string {
  return html.replace(/PARTNER FILE(<\/div>)/g, (whole, close: string, at: number) => {
    // Look ahead only as far as this card's logo - far enough to reach the
    // <img>, short enough not to run into the next card.
    const ahead = html.slice(at, at + 600);
    const isPppTv = /\/assets\/partners\/ppp-tv\./i.test(ahead);
    return `${isPppTv ? 'PARTNER FILE' : 'INVESTOR FILE'}${close}`;
  });
}

/**
 * Full pass over one captured shell.
 *
 * Order matters: structural removals run before prose corrections, so the
 * markers ("MC Paps", "sauti-moto.jpg") are still present to match on.
 */
export function correctShellContent(html: string): string {
  let out = html;

  // Crew wall: each member is one <button class="scpr"> holding photo, name,
  // role and bio. The photo filename is the stable marker - the display name is
  // split across spans by the capture, so it is not reliable to match on.
  out = removeEnclosing(out, '/assets/crew/mc-paps.webp', { tag: 'button' });

  // Partner wall, two different layouts:
  //  - partners.html renders full cards carrying a "PARTNER FILE" badge
  //  - home.html renders a compact logo strip, one <div> tile per logo
  out = removeEnclosing(out, '/assets/partners/sauti-moto.jpg', { alsoContains: 'PARTNER FILE' });
  out = removeEnclosing(out, '/assets/partners/sauti-moto.jpg', { tag: 'div' });

  out = correctPartnerBadges(out);
  out = injectGalleryPhotos(out);
  out = correctProse(out);

  // Restore the one real partner, in case a broad replace above caught it.
  out = out.replace(/PPP TV Kenya([\s\S]{0,400}?)Broadcast Investor/g, 'PPP TV Kenya$1Broadcast Partner');

  return out;
}

/** Names that must not survive into any rendered page. Used by the test below. */
export const DEPARTED = [/mc\s*paps/i, /sauti\s*moto/i];
