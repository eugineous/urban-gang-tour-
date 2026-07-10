'use client';

// Last-resort boundary: catches crashes in the root layout itself. Must render
// its own <html>/<body> because the layout is gone. Keep it dependency-free.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error('[global-error]', error);
  return (
    <html lang="en-KE">
      <body style={{ margin: 0, background: '#111', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 22px' }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(34px,6vw,56px)', fontWeight: 900, color: '#E6218C', textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '0.5px' }}>
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
      </body>
    </html>
  );
}
