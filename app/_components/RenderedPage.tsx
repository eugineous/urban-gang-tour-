import fs from 'node:fs';
import path from 'node:path';
import { routeByPath, SITE } from '@/lib/site';

// Renders the faithful v25 markup for a page. When a captured fragment exists at
// app/_rendered/<page>.html it is emitted verbatim (server-rendered — a crawler
// gets the full page HTML in the response). Until then, an on-brand server-rendered
// fallback keeps every URL live, unique and indexable.
function readCaptured(page: string): string | null {
  try {
    const p = path.join(process.cwd(), 'app', '_rendered', `${page}.html`);
    if (fs.existsSync(p)) {
      const html = fs.readFileSync(p, 'utf8').trim();
      if (html.length > 0) return html;
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
    // captured markup already contains its own <main>; wrap in a fragment div
    return <div dangerouslySetInnerHTML={{ __html: captured }} />;
  }

  // Faithful fallback — v25 palette + type. Real, unique, indexable content per URL.
  const heading = (r?.nav || r?.title.split('—')[0].trim() || 'Urban Gang Tour').toUpperCase();
  return (
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
  );
}
