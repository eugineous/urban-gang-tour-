import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found — Urban Gang Tour',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main style={{ background: '#E6218C', minHeight: '70vh', padding: '90px 22px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Permanent Marker'", color: '#111', fontSize: 22, transform: 'rotate(-2deg)' }}>
        lost in the crowd
      </div>
      <h1 style={{ fontFamily: "'Anton'", color: '#fff', fontSize: 'clamp(64px,16vw,160px)', margin: '6px 0 8px', WebkitTextStroke: '3px #111' }}>
        404
      </h1>
      <p style={{ color: '#111', fontWeight: 600, fontSize: 18, marginBottom: 26 }}>
        That page isn&apos;t on the tour. Let&apos;s get you back to the stage.
      </p>
      <a
        href="/"
        style={{ background: '#FFD400', color: '#111', fontFamily: "'Anton'", fontSize: 18, padding: '15px 26px', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111', display: 'inline-block' }}
      >
        BACK HOME
      </a>
    </main>
  );
}
