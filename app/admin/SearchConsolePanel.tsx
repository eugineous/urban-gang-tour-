'use client';

import { useEffect, useState } from 'react';

type Overview = {
  configured: boolean;
  property: string | null;
  state: 'not_configured' | 'connected' | 'property_unavailable' | 'service_unavailable';
  checkedAt: string;
  permissionLevel?: string;
  sitemaps?: { path: string; pending: boolean; errors: number; warnings: number; lastSubmitted: string | null; lastDownloaded: string | null }[];
  performance?: { startDate: string; endDate: string; daysWithData: number; clicks: number; impressions: number; ctr: number | null; position: number | null };
};

type Inspection = {
  inspectionUrl: string;
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: string | null;
  userCanonical: string | null;
  googleCanonical: string | null;
};

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ddd', borderRadius: 14, boxShadow: 'none', padding: 16 };
const button: React.CSSProperties = { background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '1px solid #ddd', borderRadius: 10, boxShadow: 'none', cursor: 'pointer' };
const field: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };

function formatWhen(value: string | null | undefined) {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined ? 'Not reported' : `${(value * 100).toFixed(1)}%`;
}

export default function SearchConsolePanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('https://urbangangtour.co.ke/');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [inspectError, setInspectError] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/search-console', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not read Search Console');
      setOverview(data.overview || null);
    } catch (reason: any) {
      setError(String(reason?.message || reason));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    // Verify admin session before allowing any data access.
    (async () => {
      try {
        const r = await fetch('/api/admin/me', { credentials: 'include' });
        if (r.ok) setAuthed(true);
      } catch { /* not authed */ }
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => { if (authed) load(); }, [authed]);

  const inspect = async () => {
    setInspecting(true); setInspectError(''); setInspection(null);
    try {
      const response = await fetch('/api/admin/search-console', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inspect', url }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Inspection could not run');
      setInspection(data.inspection || null);
    } catch (reason: any) {
      setInspectError(String(reason?.message || reason));
    } finally { setInspecting(false); }
  };

  const stateCopy = overview?.state === 'not_configured'
    ? 'Not connected. Add the configured service account as a read-only user on the exact Search Console property, then set the matching property URL in the server environment.'
    : overview?.state === 'property_unavailable'
      ? 'The service account cannot read this property. Check the property value and its Search Console user permission.'
      : overview?.state === 'service_unavailable'
        ? 'Google could not be reached just now. This does not indicate an indexing problem. Try refresh later.'
        : 'Connected with read-only access. These are Google-reported signals, not projections.';

  return <section style={card} aria-live="polite">
    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ fontFamily: 'inherit', margin: 0, fontSize: 24 }}>GOOGLE SEARCH CONSOLE</h3>
        <p style={{ color: '#666', fontSize: 13, maxWidth: 680, lineHeight: 1.5, margin: '6px 0 0' }}>Verification, sitemap health and Google Search signals. This panel uses read-only access and never submits sitemaps or requests indexing.</p>
      </div>
      <button type="button" style={{ ...button, opacity: loading ? .65 : 1 }} onClick={load} disabled={loading}>{loading ? 'Checking…' : 'Refresh status'}</button>
    </div>
    {error ? <p style={{ margin: '14px 0 0', color: '#9D1428', fontWeight: 700 }}>Could not load status: {error}</p> : null}
    {overview ? <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 16 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 11 }}><b>Connection</b><div style={{ marginTop: 5, fontSize: 13 }}>{overview.state.replace(/_/g, ' ')}</div></div>
        <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 11 }}><b>Property</b><div style={{ marginTop: 5, fontSize: 13, overflowWrap: 'anywhere' }}>{overview.property || 'Not configured'}</div></div>
        <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 11 }}><b>Access</b><div style={{ marginTop: 5, fontSize: 13 }}>{overview.permissionLevel || 'Not reported'}</div></div>
      </div>
      <p style={{ margin: '12px 0 0', color: '#555', fontSize: 13, lineHeight: 1.5 }}>{stateCopy} Checked {formatWhen(overview.checkedAt)}.</p>
      {overview.performance ? <div style={{ marginTop: 16 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 14, textTransform: 'uppercase' }}>Search performance, {overview.performance.startDate} to {overview.performance.endDate}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: 10 }}>
          {[["Clicks", overview.performance.clicks], ["Impressions", overview.performance.impressions], ["CTR", pct(overview.performance.ctr)], ["Average position", overview.performance.position ?? 'Not reported'], ["Days reported", overview.performance.daysWithData]].map(([label, value]) => <div key={String(label)} style={{ background: '#FFF8D8', border: '1px solid #ddd', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</div></div>)}
        </div>
        {!overview.performance.daysWithData ? <p style={{ color: '#666', fontSize: 12, marginBottom: 0 }}>Google returned no daily rows for this completed period. That can mean no reportable data, it is not a forecast or a zero-traffic claim.</p> : null}
      </div> : null}
      {overview.sitemaps ? <div style={{ marginTop: 16 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 14, textTransform: 'uppercase' }}>Sitemaps reported by Google</h4>
        {overview.sitemaps.length ? <div style={{ display: 'grid', gap: 8 }}>{overview.sitemaps.map((sitemap) => <div key={sitemap.path} style={{ border: '1px solid #bbb', borderRadius: 9, padding: '10px 12px', fontSize: 12 }}><b style={{ overflowWrap: 'anywhere' }}>{sitemap.path}</b><div style={{ marginTop: 5, color: sitemap.errors ? '#9D1428' : '#444' }}>{sitemap.pending ? 'Pending · ' : ''}{sitemap.errors} errors · {sitemap.warnings} warnings · submitted {formatWhen(sitemap.lastSubmitted)} · downloaded {formatWhen(sitemap.lastDownloaded)}</div></div>)}</div> : <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Google did not report a submitted sitemap for this property yet. The site still advertises its sitemap in robots.txt.</p>}
      </div> : null}
      {overview.state === 'connected' ? <div style={{ marginTop: 18, borderTop: '1px solid #ddd', paddingTop: 16 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 14, textTransform: 'uppercase' }}>Inspect one public URL</h4>
        <p style={{ margin: '0 0 10px', color: '#666', fontSize: 12, lineHeight: 1.45 }}>Runs one read-only URL Inspection request. Use a canonical HTTPS URL on the configured property, such as the homepage or a published story.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input style={{ ...field, flex: '1 1 300px' }} aria-label="Public URL to inspect" value={url} onChange={(event) => setUrl(event.target.value)} /><button type="button" style={{ ...button, opacity: inspecting ? .65 : 1 }} disabled={inspecting} onClick={inspect}>{inspecting ? 'Inspecting…' : 'Inspect URL'}</button></div>
        {inspectError ? <p style={{ color: '#9D1428', fontWeight: 700, fontSize: 13 }}>Inspection unavailable: {inspectError}</p> : null}
        {inspection ? <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(130px,auto) 1fr', gap: '7px 14px', margin: '12px 0 0', fontSize: 12 }}>
          {[["Verdict", inspection.verdict], ["Coverage", inspection.coverageState], ["Indexing", inspection.indexingState], ["Robots", inspection.robotsTxtState], ["Fetch", inspection.pageFetchState], ["Last crawl", formatWhen(inspection.lastCrawlTime)], ["User canonical", inspection.userCanonical], ["Google canonical", inspection.googleCanonical]].map(([label, value]) => <><dt key={`${label}-label`} style={{ fontWeight: 800 }}>{label}</dt><dd key={`${label}-value`} style={{ margin: 0, overflowWrap: 'anywhere' }}>{value || 'Not reported'}</dd></>)}
        </dl> : null}
      </div> : null}
    </> : null}
  </section>;
}
