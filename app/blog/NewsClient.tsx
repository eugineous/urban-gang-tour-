'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RouteRow } from '@/app/_lib/news-data';

// "Urban News" redesign (owner-supplied design, v2/comic-poster variant),
// reimplemented as a real Next.js client component instead of the dc-runtime
// .dc.html format it was authored in — this page already didn't use the v25
// dc-runtime (see app/blog/page.tsx history), so staying in that lighter,
// modern architecture rather than pulling the legacy runtime in just for one
// page. Every number/story here is real data passed down as props — none of
// the original design's sample content (fake view counts, a "roaming
// mascot" story that doesn't exist) survived the port.

export type Desk = 'fresh' | 'gang' | 'culture' | 'institutions';

export type Story = {
  slug: string;
  title: string;
  dek: string;
  image: string;
  date: string;
  desk: Desk;
};

export type TrendingItem = { title: string; slug: string; views: string; delta: string };
export type MostReadItem = { title: string; slug: string; image: string; metric: string };

const DESKS: { id: 'all' | Desk | 'route'; label: string }[] = [
  { id: 'all', label: 'All News' },
  { id: 'fresh', label: 'Event Recaps' },
  { id: 'route', label: 'Upcoming Events' },
  { id: 'gang', label: 'Hosts & Crew' },
  { id: 'culture', label: 'Community & Impact' },
  { id: 'institutions', label: 'For Institutions' },
];

const SEED_SEARCHES: [string, number, string?][] = [
  ['tickets', 187, 'https://urbangangtour.co.ke/events'],
  ['book the tour', 149, 'https://urbangangtour.co.ke/book'],
  ['Eugine Micah', 121],
  ['Lucy Ogunde', 108],
  ['color blast', 96],
  ['Mr & Miss', 84],
];

const STATUS_STYLE: Record<RouteRow['status'], string> = {
  'NEXT STOP': 'background:#F7A81B;color:#1A0E14;',
  CONFIRMED: 'background:#2e9e5b;color:#fff;',
  SCHEDULING: 'background:#5B1A8A;color:#fff;',
  DONE: 'background:#eee2ea;color:#6b5a63;',
};

function match(needle: string, haystack: string) {
  return !needle || haystack.toLowerCase().includes(needle);
}

function StoryCard({ s, big }: { s: Story; big?: boolean }) {
  return (
    <a
      href={`/blog/${s.slug}`}
      className="un-card"
      style={{
        border: '3px solid #1A0E14', borderRadius: 18, background: '#fff', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', textDecoration: 'none', color: 'inherit',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: big ? '16/10' : '4/3', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', bottom: 10, left: 10, background: '#F7A81B', color: '#1A0E14', fontFamily: "'Permanent Marker',cursive", fontSize: 12, padding: '3px 11px', borderRadius: 7, transform: 'rotate(-2deg)' }}>{s.date}</span>
      </div>
      <div style={{ padding: big ? '16px 16px 18px' : '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ margin: 0, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: big ? 16.5 : 15, lineHeight: 1.28, color: '#1A0E14' }}>{s.title}</h3>
        <p style={{ margin: 0, fontSize: big ? 13.5 : 13, lineHeight: 1.5, color: '#5b4a52' }}>{s.dek}</p>
      </div>
    </a>
  );
}

function SectionHeading({ a, b, tag }: { a: string; b: string; tag: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      <h2 style={{ margin: 0, display: 'inline-block', background: '#1A0E14', borderRadius: 12, padding: '9px 20px', transform: 'rotate(-1.2deg)', fontFamily: "'Titan One',cursive", fontSize: 21, fontWeight: 400 }}>
        <span style={{ color: '#F7A81B' }}>{a}</span> <span style={{ color: '#fff' }}>{b}</span>
      </h2>
      <span style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 15, color: '#fff' }}>{tag}</span>
    </div>
  );
}

export function NewsClient({
  hero, stories, routeRows, trending, mostRead,
}: {
  hero: Story | null;
  stories: Story[];
  routeRows: RouteRow[];
  trending: TrendingItem[];
  mostRead: MostReadItem[];
}) {
  const [query, setQuery] = useState('');
  const [desk, setDesk] = useState<'all' | Desk | 'route'>('all');
  const [tick, setTick] = useState(0);
  const [searchCounts, setSearchCounts] = useState<Record<string, number>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('desk')) setDesk(h.get('desk') as any);
    if (h.get('q')) setQuery(h.get('q')!);
    try { setSearchCounts(JSON.parse(localStorage.getItem('un-search-counts') || '{}')); } catch { /* ignore */ }

    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea/i.test(document.activeElement?.tagName || '');
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { searchRef.current?.blur(); setQuery(''); setDesk('all'); }
    };
    window.addEventListener('keydown', onKey);
    const iv = setInterval(() => setTick((t) => t + 1), 4500);
    return () => { window.removeEventListener('keydown', onKey); clearInterval(iv); };
  }, []);

  const setFilters = (patch: { query?: string; desk?: typeof desk }) => {
    const nextQuery = patch.query ?? query;
    const nextDesk = patch.desk ?? desk;
    if (patch.query !== undefined) setQuery(patch.query);
    if (patch.desk !== undefined) setDesk(patch.desk);
    const parts: string[] = [];
    if (nextDesk !== 'all') parts.push('desk=' + encodeURIComponent(nextDesk));
    if (nextQuery.trim()) parts.push('q=' + encodeURIComponent(nextQuery.trim()));
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname + location.search);
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ query: e.target.value });
    clearTimeout(recordTimer.current);
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 3) return;
    recordTimer.current = setTimeout(() => {
      setSearchCounts((prev) => {
        const next = { ...prev, [q]: (prev[q] || 0) + 1 };
        try { localStorage.setItem('un-search-counts', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }, 1500);
  };

  const clearFilters = () => setFilters({ query: '', desk: 'all' });

  const q = query.trim().toLowerCase();
  const filteredStories = useMemo(
    () => stories.filter((s) => match(q, s.title + ' ' + s.dek)),
    [stories, q]
  );
  const filteredRoute = useMemo(
    () => routeRows.filter((r) => match(q, r.school + ' ' + r.county + ' ' + r.note + ' ' + r.status)),
    [routeRows, q]
  );
  const by = (d: Desk) => filteredStories.filter((s) => s.desk === d);
  const fresh = by('fresh'), gang = by('gang'), culture = by('culture'), institutions = by('institutions');
  const counts = { all: filteredStories.length + filteredRoute.length, fresh: fresh.length, route: filteredRoute.length, gang: gang.length, culture: culture.length, institutions: institutions.length };
  const isFiltering = !!q || desk !== 'all';
  const vis = (id: Desk | 'route', n: number) => (desk === 'all' || desk === id) && n > 0;
  const total = counts.all;

  const searchChips = useMemo(() => {
    const merged = new Map<string, { term: string; count: number; href?: string }>();
    SEED_SEARCHES.forEach(([t, n, href]) => merged.set(t.toLowerCase(), { term: t, count: n, href }));
    Object.entries(searchCounts).forEach(([k, n]) => {
      const existing = merged.get(k);
      if (existing) existing.count += n; else merged.set(k, { term: k, count: n });
    });
    return Array.from(merged.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [searchCounts]);

  const breakingHeadlines = [
    ...(hero ? [hero.title] : []),
    ...stories.slice(0, 8).map((s) => s.title),
  ];
  const bi = breakingHeadlines.length ? tick % breakingHeadlines.length : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#C2187C 0%,#B5136F 45%,#A31164 100%)', position: 'relative', overflowX: 'hidden', fontFamily: "'Archivo',sans-serif", color: '#1A0E14' }}>
      <style>{`
        .un-card { transition: transform .15s; }
        .un-card:hover { transform: translate(-3px,-3px) rotate(-.5deg); box-shadow: 6px 6px 0 #1A0E14; }
        .un-btn:hover { filter: brightness(1.06); }
        @keyframes un-pop { 0%{transform:translateY(14px) rotate(-1.5deg);opacity:0} 60%{transform:translateY(-2px) rotate(.5deg);opacity:1} 100%{transform:translateY(0) rotate(0);opacity:1} }
        @keyframes un-pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes un-wiggle { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(3deg)} }
        input::placeholder { color:#9a8f83; }
        .un-search:focus { outline:3px solid #F7A81B; outline-offset:-3px; }
        @media (max-width:900px) { .un-main { grid-template-columns: 1fr !important; } .un-aside { position:static !important; } }
      `}</style>

      {/* utility strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 24px', background: '#1A0E14', color: '#fff', fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}><span>The culture&apos;s paper of record</span><span style={{ color: '#F7A81B' }}>Est. 2025</span></div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}><span>Nairobi</span><span>Free forever</span><span style={{ color: '#F7A81B' }}>On PPP TV · CH 430</span></div>
      </div>

      {/* masthead */}
      <header style={{ padding: '44px 24px 34px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 18, left: '6%', width: 70, height: 26, background: 'rgba(255,255,255,.35)', transform: 'rotate(-28deg)' }} />
        <div style={{ position: 'absolute', top: 30, right: '7%', width: 84, height: 26, background: 'rgba(255,255,255,.3)', transform: 'rotate(22deg)' }} />
        <div style={{ position: 'absolute', left: 24, top: 0, bottom: 0, borderLeft: '3px dashed rgba(26,14,20,.5)' }} />
        <div style={{ position: 'absolute', right: 24, top: 0, bottom: 0, borderRight: '3px dashed rgba(26,14,20,.5)' }} />
        <div style={{ position: 'absolute', bottom: -10, left: -40, width: 320, height: 120, background: 'rgba(255,255,255,.16)', borderRadius: '60% 40% 55% 45%', transform: 'rotate(-14deg)' }} />
        <div style={{ display: 'inline-block', background: '#1A0E14', color: '#fff', padding: '7px 20px', borderRadius: 8, transform: 'rotate(-2deg)', fontFamily: "'Permanent Marker',cursive", fontSize: 15, letterSpacing: '.06em', position: 'relative', zIndex: 2 }}>
          <span style={{ color: '#F7A81B' }}>URBAN GANG TOUR</span> PRESENTS
        </div>
        <div style={{ position: 'relative', zIndex: 2, marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Titan One',cursive", fontSize: 'clamp(52px,9vw,104px)', lineHeight: .95, color: '#fff', textShadow: '5px 5px 0 #1A0E14' }}>URBAN</span>
          <span style={{ fontFamily: "'Titan One',cursive", fontSize: 'clamp(52px,9vw,104px)', lineHeight: .95, color: '#F7A81B', textShadow: '5px 5px 0 #1A0E14' }}>NEWS</span>
          <span style={{ fontFamily: "'Titan One',cursive", fontSize: 36, color: '#fff', animation: 'un-wiggle 2.4s ease-in-out infinite', display: 'inline-block' }}>✦</span>
        </div>
        <p style={{ position: 'relative', zIndex: 2, margin: '14px auto 0', maxWidth: 560, fontFamily: "'Permanent Marker',cursive", fontSize: 17, color: '#fff', textShadow: '2px 2px 0 rgba(26,14,20,.4)' }}>
          everything the tour did, is doing, and is about to do — reported by the gang itself
        </p>
        <div style={{ position: 'relative', zIndex: 2, marginTop: 16, display: 'flex', justifyContent: 'center', gap: 14, fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', flexWrap: 'wrap' }}>
          <a href="/" style={{ color: '#fff' }}>← urbangangtour.co.ke</a><span style={{ color: 'rgba(255,255,255,.5)' }}>·</span>
          <a href="/events" style={{ color: '#fff' }}>Tickets</a><span style={{ color: 'rgba(255,255,255,.5)' }}>·</span>
          <a href="/book" style={{ color: '#fff' }}>Book the Tour</a><span style={{ color: 'rgba(255,255,255,.5)' }}>·</span>
          <a href="/shop" style={{ color: '#fff' }}>Shop</a>
        </div>
      </header>

      {/* sticky finder bar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: '#1A0E14', boxShadow: '0 4px 0 rgba(26,14,20,.35)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 24px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Titan One',cursive", fontSize: 16, color: '#F7A81B', flex: '0 0 auto' }}>URBAN NEWS</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: '1 1 auto' }}>
            {DESKS.map((d) => {
              const active = desk === d.id;
              const n = (counts as any)[d.id];
              return (
                <button
                  key={d.id}
                  onClick={() => setFilters({ desk: d.id })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                    border: `2px solid ${active ? '#F7A81B' : 'rgba(255,255,255,.55)'}`, borderRadius: 999, padding: '7px 14px',
                    whiteSpace: 'nowrap', fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '.02em', textTransform: 'uppercase',
                    background: active ? '#F7A81B' : 'transparent', color: active ? '#1A0E14' : '#fff',
                  }}
                >
                  {d.label}
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: active ? '#1A0E14' : '#C2187C', color: '#fff' }}>{n}</span>
                </button>
              );
            })}
          </div>
          <div style={{ position: 'relative', flex: '0 1 280px', minWidth: 200, display: 'flex', alignItems: 'center' }}>
            <input
              ref={searchRef}
              value={query}
              onChange={onSearch}
              placeholder="Find a school, a story, a name…"
              className="un-search"
              style={{ width: '100%', padding: '10px 40px 10px 16px', border: '3px solid #F7A81B', borderRadius: 999, background: '#fff', fontFamily: "'Archivo',sans-serif", fontSize: 13, fontWeight: 600, color: '#1A0E14', boxSizing: 'border-box' }}
            />
            <kbd style={{ position: 'absolute', right: 13, fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9a8f83', border: '1px solid #d8cebf', borderRadius: 4, padding: '1px 6px', background: '#F6F1E8', pointerEvents: 'none' }}>/</kbd>
          </div>
        </div>
      </nav>

      {/* breaking headline rotator */}
      {breakingHeadlines.length > 0 && (
        <div style={{ maxWidth: 1280, margin: '22px auto 0', padding: '0 24px', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => setTick((t) => t + 1)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, background: '#1A0E14', border: 'none', borderRadius: 18, padding: '14px 20px', cursor: 'pointer', textAlign: 'left', boxShadow: '6px 6px 0 rgba(26,14,20,.35)' }}
          >
            <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F7A81B', color: '#1A0E14', fontFamily: "'Permanent Marker',cursive", fontSize: 14, padding: '6px 14px', borderRadius: 8, transform: 'rotate(-2deg)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A0E14', animation: 'un-pulse 1.2s infinite' }} />BREAKING
            </span>
            <span key={bi} style={{ flex: 1, minWidth: 0, overflow: 'hidden', animation: 'un-pop .5s cubic-bezier(.2,.9,.3,1.3)', fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.35 }}>
              {breakingHeadlines[bi]}
            </span>
            <span style={{ flex: '0 0 auto', fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{bi + 1}/{breakingHeadlines.length} · tap for next</span>
          </button>
        </div>
      )}

      <main className="un-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '26px 24px 0', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 26, alignItems: 'start', position: 'relative', zIndex: 2 }}>
        <div style={{ minWidth: 0 }}>
          {isFiltering && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, fontFamily: "'Spline Sans Mono',monospace", fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: '#fff' }}>
              <span>{q ? `${total} result${total === 1 ? '' : 's'} for "${query}"` : `Showing: ${DESKS.find((d) => d.id === desk)?.label}`}</span>
              <button onClick={clearFilters} style={{ border: '2px solid #fff', background: 'transparent', borderRadius: 999, padding: '4px 14px', fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, cursor: 'pointer', color: '#fff' }}>Clear ✕</button>
            </div>
          )}

          {/* lead story */}
          {!isFiltering && hero && (
            <a href={`/blog/${hero.slug}`} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', border: '3px solid #1A0E14', borderRadius: 24, background: '#fff', marginBottom: 34, boxShadow: '8px 8px 0 #1A0E14', overflow: 'hidden', position: 'relative', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ position: 'relative', minHeight: 330 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero.image} alt={hero.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', top: 16, left: 16, background: '#F7A81B', color: '#1A0E14', fontFamily: "'Permanent Marker',cursive", fontSize: 14, padding: '6px 14px', borderRadius: 8, transform: 'rotate(-3deg)', boxShadow: '3px 3px 0 #1A0E14' }}>LEAD STORY</span>
              </div>
              <div style={{ padding: '30px 30px 26px', display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 13, color: '#C2187C' }}>{hero.date}</div>
                <h1 style={{ margin: 0, fontFamily: "'Titan One',cursive", fontSize: 'clamp(24px,2.6vw,34px)', lineHeight: 1.12, fontWeight: 400, color: '#1A0E14' }}>{hero.title}</h1>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#4a3a42' }}>{hero.dek}</p>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#8a7a82' }}>By Eugine Micah &amp; Lucy Ogunde</span>
                  <span className="un-btn" style={{ background: '#C2187C', color: '#fff', padding: '11px 20px', borderRadius: 999, fontWeight: 800, fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase', boxShadow: '3px 3px 0 #1A0E14' }}>Read the story →</span>
                </div>
              </div>
            </a>
          )}

          {vis('fresh', fresh.length) && (
            <section style={{ marginBottom: 38 }}>
              <SectionHeading a="EVENT" b="RECAPS" tag="fresh off the road ✦" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 20 }}>
                {fresh.map((s) => <StoryCard key={s.slug} s={s} big />)}
              </div>
            </section>
          )}

          {vis('route', filteredRoute.length) && (
            <section style={{ marginBottom: 38, border: '3px dotted #1A0E14', borderRadius: 28, background: '#fff', boxShadow: '8px 8px 0 rgba(26,14,20,.5)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '18px 24px 6px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, display: 'inline-block', background: '#1A0E14', borderRadius: 12, padding: '9px 20px', transform: 'rotate(-1.2deg)', fontFamily: "'Titan One',cursive", fontSize: 21, fontWeight: 400 }}>
                  <span style={{ color: '#F7A81B' }}>UPCOMING</span> <span style={{ color: '#fff' }}>TOUR DATES</span>
                </h2>
                <span style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 15, color: '#C2187C' }}>the route board · live →</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 8px 0' }}>
                {filteredRoute.map((r) => (
                  <div key={r.school} style={{ display: 'grid', gridTemplateColumns: '104px minmax(0,1fr)', gap: 16, alignItems: 'start', padding: '14px 18px', borderRadius: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 16, color: '#1A0E14' }}>{r.date}</span>
                      <span style={{ height: 7, width: 64, background: 'repeating-linear-gradient(115deg,#F7A81B 0 4px,transparent 4px 8px)', borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 15.5, color: '#1A0E14', textTransform: 'uppercase', letterSpacing: '.02em' }}>{r.school}</span>
                        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', padding: '3px 10px', borderRadius: 999, ...styleFromString(STATUS_STYLE[r.status]) }}>{r.status}</span>
                      </div>
                      <span style={{ fontSize: 12.5, color: '#6b5a63' }}>{r.note} · <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#C2187C' }}>{r.county}</span></span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 6, padding: '14px 24px', background: '#1A0E14', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 16, color: '#fff' }}>your school could be the next row on this board</span>
                <a href="/book" className="un-btn" style={{ background: '#F7A81B', color: '#1A0E14', padding: '10px 20px', borderRadius: 999, fontWeight: 800, fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase' }}>Get on the route →</a>
              </div>
            </section>
          )}

          {vis('gang', gang.length) && (
            <section style={{ marginBottom: 38 }}>
              <SectionHeading a="HOSTS" b="& CREW" tag="the gang files ✦" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(215px,1fr))', gap: 18 }}>
                {gang.map((s) => <StoryCard key={s.slug} s={s} />)}
              </div>
            </section>
          )}

          {vis('culture', culture.length) && (
            <section style={{ marginBottom: 38 }}>
              <SectionHeading a="COMMUNITY" b="& IMPACT" tag="culture desk ✦" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 20 }}>
                {culture.map((s) => <StoryCard key={s.slug} s={s} big />)}
              </div>
            </section>
          )}

          {vis('institutions', institutions.length) && (
            <section style={{ marginBottom: 38 }}>
              <SectionHeading a="FOR" b="INSTITUTIONS" tag="schools, campuses & partners ✦" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 20 }}>
                {institutions.map((s) => <StoryCard key={s.slug} s={s} big />)}
              </div>
            </section>
          )}

          {isFiltering && total === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 24px', border: '3px dashed #fff', borderRadius: 24, marginBottom: 38, color: '#fff' }}>
              <div style={{ fontFamily: "'Titan One',cursive", fontSize: 28 }}>NOTHING ON THE WIRE</div>
              <p style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 16, margin: '10px 0 20px' }}>no stories match &quot;{query}&quot; — try a school, a county, or a gang member</p>
              <button onClick={clearFilters} style={{ background: '#F7A81B', color: '#1A0E14', border: 'none', borderRadius: 999, padding: '11px 24px', fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '3px 3px 0 #1A0E14' }}>Show everything</button>
            </div>
          )}

          {!isFiltering && (
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 44 }}>
              <div style={{ border: '3px solid #1A0E14', borderRadius: 22, background: '#5B1A8A', color: '#fff', padding: 26, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '7px 7px 0 #1A0E14' }}>
                <span style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 14, color: '#F7A81B' }}>the show itself ✦</span>
                <h3 style={{ margin: 0, fontFamily: "'Titan One',cursive", fontSize: 25, fontWeight: 400, lineHeight: 1.12, color: '#fff' }}>URBAN NEWS ON PPP TV — CH 430</h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(255,255,255,.85)' }}>Every booked event includes a feature on Urban News. Your school or campus, on national TV.</p>
                <a href="https://www.youtube.com/@urban_newsgang" target="_blank" rel="noopener" className="un-btn" style={{ marginTop: 'auto', alignSelf: 'flex-start', background: '#F7A81B', color: '#1A0E14', padding: '11px 20px', borderRadius: 999, fontWeight: 800, fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase' }}>Watch on YouTube →</a>
              </div>
              <div style={{ border: '3px solid #1A0E14', borderRadius: 22, background: '#F7A81B', color: '#1A0E14', padding: 26, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '7px 7px 0 #1A0E14' }}>
                <span style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 14, color: '#5B1A8A' }}>student press pass ✦</span>
                <h3 style={{ margin: 0, fontFamily: "'Titan One',cursive", fontSize: 25, fontWeight: 400, lineHeight: 1.12 }}>WRITE FOR URBAN NEWS</h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: '#4a3208' }}>Students — submit your blog, review, or story from your school. The editors pick the best for publishing right here.</p>
                <a href="mailto:admin@urbangangtour.co.ke" className="un-btn" style={{ marginTop: 'auto', alignSelf: 'flex-start', background: '#1A0E14', color: '#fff', padding: '11px 20px', borderRadius: 999, fontWeight: 800, fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase' }}>Submit to the editors →</a>
              </div>
            </section>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="un-aside" style={{ position: 'sticky', top: 78, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {trending.length > 0 && (
            <section style={{ border: '3px solid #1A0E14', borderRadius: 20, background: '#fff', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(26,14,20,.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', background: '#1A0E14' }}>
                <h3 style={{ margin: 0, fontFamily: "'Titan One',cursive", fontSize: 15, fontWeight: 400 }}><span style={{ color: '#F7A81B' }}>TRENDING</span> <span style={{ color: '#fff' }}>NOW</span></h3>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F7A81B', animation: 'un-pulse 1.2s infinite' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {trending.map((t, i) => (
                  <a key={t.slug} href={`/blog/${t.slug}`} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 10, alignItems: 'start', textAlign: 'left', padding: '12px 16px', borderBottom: '2px dotted #e9d9e2', background: 'transparent', fontFamily: "'Archivo',sans-serif", textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ fontFamily: "'Permanent Marker',cursive", fontSize: 22, lineHeight: 1, color: '#C2187C' }}>{i + 1}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: '#1A0E14' }}>{t.title}</span>
                      <span style={{ display: 'flex', gap: 8, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, color: '#8a7a82' }}>
                        <span style={{ color: t.delta.startsWith('▲') ? '#2e9e5b' : t.delta.startsWith('▼') ? '#c0392b' : '#8a7a82' }}>{t.delta}</span><span>{t.views} views (7d)</span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
              <div style={{ padding: '9px 16px', fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a7a82' }}>real page views · last 7 days</div>
            </section>
          )}

          <section style={{ border: '3px solid #1A0E14', borderRadius: 20, background: '#fff', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(26,14,20,.5)' }}>
            <div style={{ padding: '12px 16px', background: '#1A0E14' }}>
              <h3 style={{ margin: 0, fontFamily: "'Titan One',cursive", fontSize: 15, fontWeight: 400 }}><span style={{ color: '#F7A81B' }}>MOST</span> <span style={{ color: '#fff' }}>SEARCHED</span></h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '14px 16px' }}>
              {searchChips.map((c) => (
                <button
                  key={c.term}
                  onClick={() => { if (c.href) window.open(c.href, '_blank'); else setFilters({ query: c.term, desk: 'all' }); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '2px solid #1A0E14', borderRadius: 999, padding: '6px 13px', background: 'transparent', cursor: 'pointer', fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 12, color: '#1A0E14' }}
                >
                  {c.term}<span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#C2187C' }}>{c.count}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: '0 16px 12px', fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a7a82' }}>site search · tap to search</div>
          </section>

          {mostRead.length > 0 && (
            <section style={{ border: '3px solid #1A0E14', borderRadius: 20, background: '#fff', overflow: 'hidden', boxShadow: '6px 6px 0 rgba(26,14,20,.5)' }}>
              <div style={{ padding: '12px 16px', background: '#1A0E14' }}>
                <h3 style={{ margin: 0, fontFamily: "'Titan One',cursive", fontSize: 15, fontWeight: 400 }}><span style={{ color: '#F7A81B' }}>MOST READ</span> <span style={{ color: '#fff' }}>THIS MONTH</span></h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {mostRead.map((m) => (
                  <a key={m.slug} href={`/blog/${m.slug}`} style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: '11px 16px', borderBottom: '2px dotted #e9d9e2', background: 'transparent', fontFamily: "'Archivo',sans-serif", textDecoration: 'none', color: 'inherit' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image} alt={m.title} style={{ width: 52, height: 52, flex: '0 0 auto', border: '2px solid #1A0E14', borderRadius: 10, objectFit: 'cover' }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, color: '#1A0E14' }}>{m.title}</span>
                      <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, color: '#8a7a82' }}>{m.metric} reads (30d)</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          <section style={{ border: '3px solid #1A0E14', borderRadius: 20, background: '#5B1A8A', color: '#fff', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '6px 6px 0 rgba(26,14,20,.5)' }}>
            <h3 style={{ margin: 0, fontFamily: "'Titan One',cursive", fontSize: 15, fontWeight: 400, color: '#F7A81B' }}>FOLLOW THE GANG</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <a href="https://www.instagram.com/urban_newsgang" target="_blank" rel="noopener" style={{ border: '2px solid #fff', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700, color: '#fff' }}>Instagram</a>
              <a href="https://www.tiktok.com/@urban_newsgang" target="_blank" rel="noopener" style={{ border: '2px solid #fff', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700, color: '#fff' }}>TikTok</a>
              <a href="https://www.youtube.com/@urban_newsgang" target="_blank" rel="noopener" style={{ border: '2px solid #fff', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700, color: '#fff' }}>YouTube</a>
              <a href="https://x.com/urban_newsgang" target="_blank" rel="noopener" style={{ border: '2px solid #fff', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700, color: '#fff' }}>X</a>
            </div>
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, letterSpacing: '.06em', color: 'rgba(255,255,255,.75)' }}>@urban_newsgang · everywhere</span>
          </section>
        </aside>
      </main>

      {/* bookings band */}
      <div style={{ marginTop: 44, background: '#1A0E14', padding: '34px 24px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: "'Titan One',cursive", fontSize: 'clamp(30px,5vw,54px)', color: '#fff', lineHeight: 1.05 }}>BOOKINGS STILL <span style={{ color: '#F7A81B' }}>OPEN</span></div>
        <a href="/book" className="un-btn" style={{ display: 'inline-block', marginTop: 16, background: '#C2187C', color: '#fff', padding: '13px 30px', borderRadius: 999, fontWeight: 800, fontSize: 14, letterSpacing: '.05em', textTransform: 'uppercase', boxShadow: '4px 4px 0 #F7A81B' }}>Book the tour for your school →</a>
      </div>
    </div>
  );
}

function styleFromString(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  css.split(';').filter(Boolean).forEach((decl) => {
    const [k, v] = decl.split(':');
    if (!k || !v) return;
    const camel = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v.trim();
  });
  return out as React.CSSProperties;
}
