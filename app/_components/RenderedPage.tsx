import fs from 'node:fs';
import path from 'node:path';
import { routeByPath, SITE } from '@/lib/site';
import { rewriteHtmlMedia } from '@/lib/img';
import { correctShellContent } from '@/lib/content-rules';
import { V25App } from './V25App';
import { FastImages } from './FastImages';

// Renders the faithful v25 markup for a page. When a captured fragment exists at
// app/_rendered/<page>.html it is emitted verbatim (server-rendered — a crawler
// gets the full page HTML in the response). Until then, an on-brand server-rendered
// fallback keeps every URL live, unique and indexable.
function readCaptured(page: string): string | null {
  try {
    const p = path.join(process.cwd(), 'app', '_rendered', `${page}.html`);
    if (fs.existsSync(p)) {
      const html = fs.readFileSync(p, 'utf8').trim();
      // Two passes before this markup ever reaches a browser:
      //  - correctShellContent: drops departed acts and relabels the partner
      //    wall (these snapshots can no longer be regenerated - see
      //    lib/content-rules.ts).
      //  - rewriteHtmlMedia: routes images through the edge resizer and repairs
      //    the video attributes (25.6MB page, ~97MB decoded, dead iOS autoplay
      //    - see lib/img.ts).
      if (html.length > 0) return rewriteHtmlMedia(correctShellContent(html));
    }
  } catch {
    /* fall through to fallback */
  }
  return null;
}

export function RenderedPage({ pathName }: { pathName: string }) {
  const r = routeByPath(pathName);
  const page = r?.page ?? 'home';
  const captured = readCaptured(page);

  if (captured) {
    // captured markup already contains its own <main>; wrap in a fragment div.
    // V25App then boots the live interactive runtime for this page on top.
    return (
      <>
        <div dangerouslySetInnerHTML={{ __html: captured }} />
        <FastImages />
        <V25App page={page} />
      </>
    );
  }

  // Faithful fallback — v25 palette + type. Real, unique, indexable content per URL.
  // V25App still boots the live interactive runtime for this page on top.
  const heading = (r?.nav || r?.title.split('—')[0].trim() || 'Urban Gang Tour').toUpperCase();
  return (
    <>
    <FastImages />
    <V25App page={page} />
    <main style={{ background: '#E6218C', minHeight: '60vh', padding: '64px 22px 90px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div
          style={{
            fontFamily: "'Permanent Marker'",
            color: '#111',
            fontSize: 20,
            transform: 'rotate(-2deg)',
            marginBottom: 10,
          }}
        >
          {SITE.slogan}
        </div>
        <h1
          style={{
            fontFamily: "'Anton'",
            color: '#fff',
            fontSize: 'clamp(44px, 8vw, 96px)',
            lineHeight: 0.95,
            margin: '0 0 18px',
            textTransform: 'uppercase',
            WebkitTextStroke: '2px #111',
          }}
        >
          {heading}
        </h1>
        <p
          style={{
            color: '#111',
            fontSize: 18,
            fontWeight: 600,
            maxWidth: 720,
            lineHeight: 1.55,
            marginBottom: 28,
          }}
        >
          {r?.description}
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <a
            href="/book"
            style={{
              background: '#FFD400',
              color: '#111',
              fontFamily: "'Anton'",
              fontSize: 18,
              padding: '15px 26px',
              border: '3px solid #111',
              borderRadius: 14,
              boxShadow: '5px 5px 0 #111',
            }}
          >
            BOOK THE TOUR
          </a>
          <a
            href="/shop"
            style={{
              background: '#111',
              color: '#fff',
              fontFamily: "'Anton'",
              fontSize: 18,
              padding: '15px 26px',
              border: '3px solid #111',
              borderRadius: 14,
              boxShadow: '5px 5px 0 #21C7E6',
            }}
          >
            SHOP THE DROP
          </a>
        </div>
      </div>
    </main>
    </>
  );
}
