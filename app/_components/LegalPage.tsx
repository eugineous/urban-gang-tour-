// Shared renderer for legal/policy pages — server-rendered, indexable, on-brand.
export function LegalPage({ title, updated, sections }: {
  title: string; updated: string;
  sections: { h: string; p: string[] }[];
}) {
  return (
    <main style={{ background: '#E6218C', minHeight: '60vh', padding: '52px 20px 90px' }}>
      <article style={{ maxWidth: 820, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 18, boxShadow: '8px 8px 0 #111', padding: '34px 34px 44px' }}>
        <h1 style={{ fontFamily: "'Anton'", fontSize: 'clamp(28px,5vw,44px)', margin: '0 0 6px', textTransform: 'uppercase' }}>{title}</h1>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 22 }}>Last updated: {updated} · Urban Gang Tour, Nairobi, Kenya · admin@urbangangtour.co.ke</div>
        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 19, margin: '0 0 8px' }}>{s.h}</h2>
            {s.p.map((t, j) => <p key={j} style={{ fontSize: 15, lineHeight: 1.7, color: '#222', margin: '0 0 10px' }}>{t}</p>)}
          </section>
        ))}
      </article>
    </main>
  );
}
