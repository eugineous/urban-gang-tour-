'use client';

import { useEffect, useRef } from 'react';

// "From the Gram" — official Instagram embeds for the admin-curated wall.
// The embed script is heavy, so it loads lazily: only once the section
// scrolls near the viewport (IntersectionObserver, 600px early margin).

const EMBED_SRC = 'https://www.instagram.com/embed.js';

const PROFILES = [
  { label: 'Follow @urban_newsgang on Instagram', href: 'https://www.instagram.com/urban_newsgang' },
  { label: 'Urban Gang on Facebook', href: 'https://www.facebook.com/urban_newsgang' },
];

function loadEmbedScript() {
  const w = window as any;
  if (w.instgrm?.Embeds) {
    w.instgrm.Embeds.process();
    return;
  }
  if (document.querySelector(`script[src="${EMBED_SRC}"]`)) return; // already loading
  const s = document.createElement('script');
  s.src = EMBED_SRC;
  s.async = true;
  document.body.appendChild(s);
}

export function InstagramWall({ urls }: { urls: string[] }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !urls.length) return;
    if (!('IntersectionObserver' in window)) {
      loadEmbedScript();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadEmbedScript();
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [urls.length]);

  if (!urls.length) return null;

  return (
    <section ref={ref} aria-label="From the Gram" style={{ marginTop: 56 }}>
      <div style={{ fontFamily: "'Permanent Marker'", color: '#111', fontSize: 18, transform: 'rotate(-2deg)' }}>
        @urban_newsgang
      </div>
      <h2 style={{ fontFamily: "'Anton'", color: '#fff', fontSize: 'clamp(30px,5.5vw,56px)', margin: '4px 0 22px', textTransform: 'uppercase', WebkitTextStroke: '2px #111' }}>
        From the Gram
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 22, alignItems: 'start' }}>
        {urls.map((u) => (
          <blockquote
            key={u}
            className="instagram-media"
            data-instgrm-permalink={u}
            data-instgrm-version="14"
            style={{ background: '#fff', border: '3px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', margin: 0, padding: 0, minHeight: 340, width: '100%', maxWidth: '100%', overflow: 'hidden' }}
          >
            <a href={u} target="_blank" rel="noopener" style={{ display: 'block', padding: 18, color: '#111', fontWeight: 700 }}>
              View this post on Instagram
            </a>
          </blockquote>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 22 }}>
        {PROFILES.map((p) => (
          <a
            key={p.href}
            href={p.href}
            target="_blank"
            rel="noopener"
            style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '8px 18px', background: '#111', color: '#FFD400', border: '2px solid #111', borderRadius: 100, boxShadow: '3px 3px 0 rgba(17,17,17,.35)', fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}
          >
            {p.label}
          </a>
        ))}
      </div>
    </section>
  );
}
