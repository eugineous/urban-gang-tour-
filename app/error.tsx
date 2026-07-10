'use client';

// Route-level error boundary: a render/runtime crash inside a page shows this
// on-brand screen instead of a white page. Layout (header/footer) survives.
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[page-error]', error);
  }, [error]);

  return (
    <main style={{ background: '#111', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 22px' }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(34px,6vw,56px)', color: '#E6218C', textTransform: 'uppercase', lineHeight: 1.05 }}>
          Something broke
        </div>
        <p style={{ color: '#ddd', fontSize: 16, lineHeight: 1.6, margin: '16px 0 26px' }}>
          Not you, us. Reload the page or head back home and try again.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{ background: '#E6218C', color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 22px', border: '3px solid #fff', borderRadius: 12, cursor: 'pointer' }}
          >
            RELOAD
          </button>
          <a
            href="/"
            style={{ background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 14, padding: '12px 22px', border: '3px solid #fff', borderRadius: 12, textDecoration: 'none', display: 'inline-block' }}
          >
            GO HOME
          </a>
        </div>
      </div>
    </main>
  );
}
