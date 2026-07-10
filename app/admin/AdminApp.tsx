'use client';

import { useEffect, useState, useCallback } from 'react';

// Urban Gang Control Room — real, database-backed admin.
// Styling follows v25: magenta/yellow/cyan, Anton headers, hard shadows.

const C = { pink: '#E6218C', yellow: '#FFD400', cyan: '#21C7E6', ink: '#111' };
const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111', padding: 16 };
const btn: React.CSSProperties = { background: C.yellow, color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer' };
const btnDark: React.CSSProperties = { ...btn, background: '#111', color: '#fff' };
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '2px solid #111', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '2px solid #111', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #eee', verticalAlign: 'top' };

const TABS = ['Dashboard', 'Bookings', 'Orders', 'Content', 'Newsroom', 'Comms', 'Site & SEO', 'People', 'Traffic'] as const;

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Dashboard');
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [editPost, setEditPost] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [seoPath, setSeoPath] = useState('/');
  const [setupInfo, setSetupInfo] = useState('');

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async (view: string) => {
    setBusy(true);
    const { status, data } = await api(`/api/admin/data?view=${view}`);
    setBusy(false);
    if (status === 401) { setAuthed(false); return []; }
    if (data.error) { say('⚠ ' + data.error); return []; }
    return data.rows || [];
  }, []);

  // initial auth probe
  useEffect(() => {
    api('/api/admin/data?view=stats').then(({ status, data }) => {
      if (status === 401) setAuthed(false);
      else { setAuthed(true); setStats(data.rows?.[0] || null); }
    });
  }, []);

  const viewFor: Record<string, string> = {
    Bookings: 'bookings', Orders: 'orders', Content: 'posts', Newsroom: 'submissions',
    People: 'users', Traffic: 'traffic',
  };

  useEffect(() => {
    if (!authed) return;
    if (tab === 'Dashboard') load('stats').then((r) => setStats(r[0] || null));
    else if (tab === 'Site & SEO') load('settings').then((r) => {
      const map: Record<string, any> = {};
      r.forEach((s: any) => (map[s.key] = s.value));
      setSettings(map);
    });
    else if (viewFor[tab]) load(viewFor[tab]).then(setRows);
  }, [tab, authed, load]);

  const login = async () => {
    setErr('');
    const { status, data } = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ code }) });
    if (status === 200) { setAuthed(true); const s = await load('stats'); setStats(s[0] || null); }
    else setErr(data.error === 'wrong_code' ? 'Wrong access code.' : data.error === 'admin_not_configured' ? 'ADMIN_ACCESS_CODE env var is not set in Vercel.' : 'Login failed: ' + (data.error || status));
  };

  // Google Sign-In (GIS) — alternative to the access code. The gsi/client
  // script is loaded globally in the layout; render the button once the
  // login card is showing and the library is ready.
  useEffect(() => {
    if (authed !== false) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    let tries = 0;
    const t = setInterval(() => {
      const g = (window as any).google?.accounts?.id;
      const holder = document.getElementById('gsi-admin-btn');
      if (g && holder && !holder.childElementCount) {
        clearInterval(t);
        g.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            setErr('');
            const { status, data } = await api('/api/admin/google', { method: 'POST', body: JSON.stringify({ credential: resp.credential }) });
            if (status === 200) { setAuthed(true); const s = await load('stats'); setStats(s[0] || null); }
            else setErr(data.error === 'not_authorised' ? `${data.email || 'This Google account'} is not authorised for the Control Room. Use your access code, or ask the owner to add this Google account.` : 'Google sign-in failed: ' + (data.error || status));
          },
        });
        g.renderButton(holder, { theme: 'filled_black', size: 'large', width: 320, text: 'signin_with' });
      } else if (++tries > 40) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [authed, load]);

  const save = async (kind: string, data: any, after?: () => void) => {
    setBusy(true);
    const r = await api('/api/admin/save', { method: 'POST', body: JSON.stringify({ kind, data }) });
    setBusy(false);
    if (r.data.ok) { say('✓ Saved'); after?.(); } else say('⚠ ' + (r.data.error || 'failed'));
  };

  const runSetup = async () => {
    setBusy(true);
    const { data } = await api('/api/admin/setup', { method: 'POST' });
    setBusy(false);
    setSetupInfo(data.ok ? `✓ Database ready — ${data.tables.length} tables, ${data.seeded} articles seeded` : '⚠ ' + (data.error || 'failed'));
  };

  if (authed === null) return <Shell><div style={{ ...card, textAlign: 'center' }}>Loading…</div></Shell>;

  if (!authed) {
    return (
      <Shell>
        <div style={{ ...card, maxWidth: 420, margin: '60px auto', textAlign: 'center' }}>
          <img src="/assets/ugt-logo-v2.png" alt="" style={{ height: 64, margin: '0 auto 10px' }} />
          <h1 style={{ fontFamily: 'Anton', fontSize: 28, margin: '0 0 4px' }}>CONTROL ROOM</h1>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>authorised staff only</div>
          <div id="gsi-admin-btn" style={{ display: 'flex', justifyContent: 'center', minHeight: 44, marginBottom: 14 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0 12px', color: '#aaa', fontSize: 12 }}>
            <span style={{ flex: 1, borderTop: '1px solid #ddd' }} /> or use your access code <span style={{ flex: 1, borderTop: '1px solid #ddd' }} />
          </div>
          <input style={inp} type="password" placeholder="Access code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          {err && <div style={{ color: '#c00', fontSize: 13, marginTop: 8 }}>{err}</div>}
          <button style={{ ...btnDark, width: '100%', marginTop: 12, color: C.yellow }} onClick={login}>ENTER CONTROL ROOM</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <img src="/assets/ugt-logo-v2.png" alt="" style={{ height: 44 }} />
        <h1 style={{ fontFamily: 'Anton', fontSize: 26, margin: 0, color: '#fff', WebkitTextStroke: '1px #111' }}>CONTROL ROOM</h1>
        <div style={{ flex: 1 }} />
        <button style={btn} onClick={runSetup} disabled={busy}>⚙ Setup / Repair DB</button>
        <button style={btnDark} onClick={async () => { await api('/api/admin/login', { method: 'DELETE' }); setAuthed(false); }}>Log out</button>
      </div>
      {setupInfo && <div style={{ ...card, marginBottom: 14, padding: 10, fontSize: 13 }}>{setupInfo}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t} style={{ ...btn, background: tab === t ? C.pink : '#fff', color: tab === t ? '#fff' : '#111' }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {toast && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, ...card, padding: '10px 16px', background: C.yellow }}>{toast}</div>}

      {tab === 'Dashboard' && <Dashboard stats={stats} />}
      {tab === 'Bookings' && (
        <Table rows={rows} cols={['id', 'name', 'org', 'type', 'email', 'phone', 'message', 'status']}
          exportKind="bookings"
          actions={(r) => (
            <select defaultValue={r.status} style={{ ...inp, width: 110, padding: 6 }}
              onChange={(e) => save('bookingStatus', { id: r.id, status: e.target.value }, () => {})}>
              {['new', 'review', 'confirmed', 'closed'].map((s) => <option key={s}>{s}</option>)}
            </select>
          )} />
      )}
      {tab === 'Orders' && (
        <>
          <div style={{ ...card, marginBottom: 12, fontSize: 13 }}>
            💡 Orders are the money ledger. <b>paid</b> = confirmed by M-Pesa callback (receipt shown). Use the CSV export to reconcile against your M-Pesa statement. Opening an order&apos;s <b>Receipt</b> gives a printable invoice.
          </div>
          <Table rows={rows} cols={['id', 'total', 'status', 'name', 'phone', 'mpesa_receipt']}
            exportKind="orders"
            actions={(r) => (
              <span style={{ display: 'flex', gap: 6 }}>
                <select defaultValue={r.status} style={{ ...inp, width: 110, padding: 6 }}
                  onChange={(e) => save('orderStatus', { id: r.id, status: e.target.value }, () => {})}>
                  {['pending', 'paid', 'failed', 'fulfilled', 'refunded'].map((s) => <option key={s}>{s}</option>)}
                </select>
                <button style={{ ...btn, padding: '6px 8px' }} onClick={() => {
                  const items = (typeof r.items === 'string' ? JSON.parse(r.items) : r.items) || [];
                  const w = window.open('', '_blank'); if (!w) return;
                  w.document.write(`<html><head><title>Receipt ${r.id}</title></head><body style="font-family:sans-serif;max-width:560px;margin:40px auto"><h2>Urban Gang Tour — Receipt</h2><p><b>Order:</b> ${r.id}<br/><b>Date:</b> ${new Date(r.created_at).toLocaleString()}<br/><b>Customer:</b> ${r.name || ''} · ${r.email || ''} · ${r.phone || ''}<br/><b>Status:</b> ${r.status}${r.mpesa_receipt ? '<br/><b>M-Pesa receipt:</b> ' + r.mpesa_receipt : ''}</p><table border="1" cellpadding="8" cellspacing="0" width="100%"><tr><th align="left">Item</th><th>Qty</th></tr>${items.map((i: any) => `<tr><td>${i.id}</td><td align="center">${i.qty}</td></tr>`).join('')}</table><h3>Total: KES ${Number(r.total).toLocaleString()}</h3><p style="color:#888">admin@urbangangtour.co.ke · Nairobi, Kenya</p><script>print()</script></body></html>`);
                }}>Receipt</button>
              </span>
            )} />
        </>
      )}
      {tab === 'Content' && (
        <ContentTab rows={rows} editPost={editPost} setEditPost={setEditPost}
          onSave={(p: any) => save('post', p, () => { setEditPost(null); load('posts').then(setRows); })}
          onDelete={(slug: string) => { if (confirm('Delete post "' + slug + '"?')) save('deletePost', { slug }, () => load('posts').then(setRows)); }} />
      )}
      {tab === 'Newsroom' && (
        <>
          <div style={{ ...card, marginBottom: 12, fontSize: 13 }}>Student blog pitches land here. Approve the good ones, then turn them into posts in the <b>Content</b> tab.</div>
          <Table rows={rows} cols={['id', 'name', 'school', 'title', 'pitch', 'email', 'status']}
            actions={(r) => (
              <select defaultValue={r.status} style={{ ...inp, width: 110, padding: 6 }}
                onChange={(e) => save('submissionStatus', { id: r.id, status: e.target.value }, () => {})}>
                {['new', 'approved', 'rejected'].map((s) => <option key={s}>{s}</option>)}
              </select>
            )} />
        </>
      )}
      {tab === 'Site & SEO' && (
        <SiteTab settings={settings} setSettings={setSettings} seoPath={seoPath} setSeoPath={setSeoPath}
          onSave={(key: string, value: any) => save('setting', { key, value })} />
      )}
      {tab === 'Comms' && <CommsTab say={say} onSaveSetting={(key: string, value: any) => save('setting', { key, value })} />}
      {tab === 'People' && <PeopleTab load={load} />}
      {tab === 'Traffic' && <TrafficTab rows={rows} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: C.pink, padding: '26px 18px 80px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</div>
  </div>;
}

function Dashboard({ stats }: { stats: any }) {
  if (!stats) return <div style={card}>No data yet — click <b>⚙ Setup / Repair DB</b> once to create the database, then refresh.</div>;
  const items = [
    ['New bookings', stats.new_bookings], ['Orders', stats.orders],
    ['Revenue (paid)', 'KES ' + Number(stats.revenue || 0).toLocaleString()],
    ['Published posts', stats.posts], ['User accounts', stats.users],
    ['Subscribers', stats.subscribers], ['Page views (7d)', stats.hits_7d],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
      {items.map(([label, v]) => (
        <div key={String(label)} style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 30 }}>{String(v ?? 0)}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// Contact details are admin-only; render them as one-click actions:
// email -> mail compose, phone -> WhatsApp chat with that person.
function renderCell(col: string, v: any): React.ReactNode {
  const s = String(v ?? '').slice(0, 140);
  if (!s) return '';
  if (col === 'email' && s.includes('@')) return <a href={`mailto:${s}`} style={{ color: C.pink, fontWeight: 700 }}>{s}</a>;
  if (col === 'phone') {
    const d = s.replace(/\D/g, '');
    const wa = d.startsWith('254') ? d : d.startsWith('0') ? '254' + d.slice(1) : d;
    return <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" style={{ color: '#1F8A5B', fontWeight: 700 }}>{s} ↗wa</a>;
  }
  return s;
}

function CommsTab({ say, onSaveSetting }: { say: (m: string) => void; onSaveSetting: (key: string, value: any) => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [social, setSocial] = useState('');
  const [waNum, setWaNum] = useState('');
  const [status, setStatus] = useState<any>(null);
  useEffect(() => { api('/api/admin/social').then(({ data }) => { setStatus(data); if (data.whatsapp_number) setWaNum(data.whatsapp_number); }); }, []);
  const chip = (ok: boolean, label: string) => (
    <span style={{ background: ok ? '#1F8A5B' : '#eee', color: ok ? '#fff' : '#666', borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{label}: {ok ? 'ready' : 'needs env keys'}</span>
  );
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...card }}>
        <h3 style={{ fontFamily: 'Anton', margin: '0 0 4px' }}>NEWSLETTER BROADCAST</h3>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Sends to every subscriber. New posts you publish in Content can be announced here.</div>
        <input style={{ ...inp, marginBottom: 8 }} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea style={{ ...inp, minHeight: 110 }} placeholder="Write the update…" value={body} onChange={(e) => setBody(e.target.value)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
          <button style={btn} onClick={async () => {
            const { status: st, data } = await api('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ subject, body }) });
            say(st === 200 ? `✓ Sent to ${data.sent} subscribers` : '⚠ ' + (data.error || data.hint || 'failed'));
          }}>Send to subscribers</button>
          <a style={{ ...btnDark, textDecoration: 'none' }} href="/api/admin/export?kind=subscribers">⬇ Subscriber list CSV</a>
          {status && chip(!!status.email_ready, 'Email')}
        </div>
      </div>
      <div style={{ ...card }}>
        <h3 style={{ fontFamily: 'Anton', margin: '0 0 4px' }}>POST TO SOCIALS</h3>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>With Meta keys set this posts directly to WhatsApp/Instagram. Without them, the buttons open each app with your text ready to send.</div>
        <textarea style={{ ...inp, minHeight: 90 }} placeholder="What's happening on the tour…" value={social} onChange={(e) => setSocial(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={btn} onClick={async () => {
            const { status: st, data } = await api('/api/admin/social', { method: 'POST', body: JSON.stringify({ text: social }) });
            say(st === 200 ? '✓ ' + (data.result || 'posted') : '⚠ ' + (data.error || data.hint || 'set META_* env vars'));
          }}>Post via API</button>
          <a style={{ ...btnDark, textDecoration: 'none' }} target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(social)}`}>WhatsApp</a>
          <a style={{ ...btnDark, textDecoration: 'none' }} target="_blank" rel="noopener" href={`https://www.facebook.com/sharer/sharer.php?u=https://urbangangtour.co.ke&quote=${encodeURIComponent(social)}`}>Facebook</a>
          <a style={{ ...btnDark, textDecoration: 'none' }} target="_blank" rel="noopener" href={`https://x.com/intent/tweet?text=${encodeURIComponent(social)}`}>X</a>
          <a style={{ ...btnDark, textDecoration: 'none' }} target="_blank" rel="noopener" href="https://www.instagram.com/urban_newsgang">Instagram ↗</a>
          {status && chip(!!status.whatsapp_ready, 'WhatsApp API')}
          {status && chip(!!status.instagram_ready, 'Instagram API')}
        </div>
      </div>
      <div style={{ ...card }}>
        <h3 style={{ fontFamily: 'Anton', margin: '0 0 4px' }}>WHATSAPP CHAT BUTTON (public site)</h3>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Visitors get a floating WhatsApp button that opens a chat straight to this number. Leave empty to hide it.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input style={{ ...inp, maxWidth: 260 }} placeholder="e.g. 254712345678" value={waNum} onChange={(e) => setWaNum(e.target.value)} />
          <button style={btn} onClick={() => { onSaveSetting('whatsapp_number', waNum.replace(/\D/g, '')); say('✓ Saved — live within 5 min'); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function Table({ rows, cols, actions, exportKind }: { rows: any[]; cols: string[]; actions?: (r: any) => React.ReactNode; exportKind?: string }) {
  const [qy, setQy] = useState('');
  const shown = rows.filter((r) => !qy || JSON.stringify(r).toLowerCase().includes(qy.toLowerCase()));
  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <input style={{ ...inp, maxWidth: 280 }} placeholder="Search…" value={qy} onChange={(e) => setQy(e.target.value)} />
        <div style={{ flex: 1 }} />
        {exportKind && <a style={{ ...btn, textDecoration: 'none' }} href={`/api/admin/export?kind=${exportKind}`}>⬇ Export CSV</a>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr>{cols.map((c) => <th key={c} style={th}>{c}</th>)}{actions && <th style={th}>actions</th>}</tr></thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => <td key={c} style={td}>{renderCell(c, r[c])}</td>)}
                {actions && <td style={td}>{actions(r)}</td>}
              </tr>
            ))}
            {!shown.length && <tr><td style={td} colSpan={cols.length + 1}>Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContentTab({ rows, editPost, setEditPost, onSave, onDelete }: any) {
  if (editPost) {
    const p = editPost;
    const set = (k: string, v: any) => setEditPost({ ...p, [k]: v });
    return (
      <div style={card}>
        <h3 style={{ fontFamily: 'Anton', marginTop: 0 }}>{p.slug ? 'EDIT: ' + p.slug : 'NEW POST'}</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <input style={inp} placeholder="Headline *" value={p.headline || ''} onChange={(e) => set('headline', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input style={inp} placeholder="Section (Tour Recap / Upcoming / Feature)" value={p.section || ''} onChange={(e) => set('section', e.target.value)} />
            <input style={inp} placeholder="Image path e.g. /assets/gal/lari.jpg" value={p.image || ''} onChange={(e) => set('image', e.target.value)} />
            <input style={inp} placeholder="Date YYYY-MM-DD" value={p.date ? String(p.date).slice(0, 10) : ''} onChange={(e) => set('date', e.target.value)} />
          </div>
          <input style={inp} placeholder="Dek — one-line summary shown on cards" value={p.dek || ''} onChange={(e) => set('dek', e.target.value)} />
          <textarea style={{ ...inp, minHeight: 220 }} placeholder="Full article. Separate paragraphs with a blank line."
            value={Array.isArray(p.body) ? p.body.join('\n\n') : (p.body || '')} onChange={(e) => set('body', e.target.value)} />
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={p.published !== false} onChange={(e) => set('published', e.target.checked)} /> Published (visible on the site + sitemap)</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btn} onClick={() => onSave(p)}>💾 Save post</button>
            <button style={btnDark} onClick={() => setEditPost(null)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={card}>
      <div style={{ display: 'flex', marginBottom: 10 }}>
        <div style={{ fontSize: 13 }}>These posts power <b>/urban-news</b> and <b>/blog</b> — save and they are live within 5 minutes (no code needed).</div>
        <div style={{ flex: 1 }} />
        <button style={btn} onClick={() => setEditPost({ published: true })}>＋ New post</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr>{['date', 'slug', 'headline', 'section', 'published', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.slug}>
                <td style={td}>{String(r.date).slice(0, 10)}</td>
                <td style={td}><a href={`/blog/${r.slug}`} target="_blank" style={{ color: C.pink, fontWeight: 700 }}>{r.slug}</a></td>
                <td style={td}>{r.headline}</td>
                <td style={td}>{r.section}</td>
                <td style={td}>{r.published ? '✅' : '—'}</td>
                <td style={td}>
                  <button style={{ ...btn, padding: '5px 9px', marginRight: 6 }} onClick={() => setEditPost(r)}>Edit</button>
                  <button style={{ ...btnDark, padding: '5px 9px' }} onClick={() => onDelete(r.slug)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SEO_PATHS = ['/', '/about', '/the-gang', '/experience', '/events', '/shop', '/gallery', '/urban-news', '/blog', '/partners', '/book', '/contact-us', '/work-with-us'];

function SiteTab({ settings, setSettings, seoPath, setSeoPath, onSave }: any) {
  const site = settings.site || {};
  const seo = settings['seo:' + seoPath] || {};
  const setSite = (k: string, v: string) => setSettings({ ...settings, site: { ...site, [k]: v } });
  const setSeo = (k: string, v: string) => setSettings({ ...settings, ['seo:' + seoPath]: { ...seo, [k]: v } });
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontFamily: 'Anton', marginTop: 0 }}>HERO & ANNOUNCEMENTS</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <input style={inp} placeholder="Announcement bar (empty = hidden)" value={site.announcement || ''} onChange={(e) => setSite('announcement', e.target.value)} />
          <input style={inp} placeholder="Next stop override e.g. LARI BOYS HIGH SCHOOL · KIMENDE · SUN 19 JULY" value={site.nextStop || ''} onChange={(e) => setSite('nextStop', e.target.value)} />
          <button style={{ ...btn, width: 180 }} onClick={() => onSave('site', site)}>💾 Save site settings</button>
          <div style={{ fontSize: 12, color: '#666' }}>These are stored centrally; the site reads them within 5 minutes. More hero fields can be wired on request.</div>
        </div>
      </div>
      <div style={card}>
        <h3 style={{ fontFamily: 'Anton', marginTop: 0 }}>SEO — PER PAGE</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <select style={inp} value={seoPath} onChange={(e) => setSeoPath(e.target.value)}>
            {SEO_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input style={inp} placeholder="Custom title (empty = default)" value={seo.title || ''} onChange={(e) => setSeo('title', e.target.value)} />
          <textarea style={{ ...inp, minHeight: 70 }} placeholder="Custom meta description (empty = default)" value={seo.description || ''} onChange={(e) => setSeo('description', e.target.value)} />
          <button style={{ ...btn, width: 180 }} onClick={() => onSave('seo:' + seoPath, seo)}>💾 Save SEO for {seoPath}</button>
          <div style={{ fontSize: 12, color: '#666' }}>Overrides what Google sees for that page. Live within 5 minutes. Leave blank to keep the professionally-written defaults.</div>
        </div>
      </div>
    </div>
  );
}

function PeopleTab({ load }: { load: (v: string) => Promise<any[]> }) {
  const [users, setUsers] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  useEffect(() => { load('users').then(setUsers); load('subscribers').then(setSubs); }, [load]);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontFamily: 'Anton', marginTop: 0 }}>USER ACCOUNTS ({users.length})</h3>
        <Table rows={users} cols={['id', 'email', 'phone', 'name', 'role', 'created_at']} />
      </div>
      <div style={card}>
        <h3 style={{ fontFamily: 'Anton', marginTop: 0 }}>NEWSLETTER SUBSCRIBERS ({subs.length})</h3>
        <Table rows={subs} cols={['email', 'created_at']} exportKind="subscribers" />
      </div>
    </div>
  );
}

function TrafficTab({ rows }: { rows: any[] }) {
  const byDay: Record<string, number> = {};
  const byPath: Record<string, number> = {};
  rows.forEach((r) => {
    const d = String(r.day).slice(0, 10);
    byDay[d] = (byDay[d] || 0) + r.hits;
    byPath[r.path] = (byPath[r.path] || 0) + r.hits;
  });
  const days = Object.entries(byDay).sort();
  const max = Math.max(1, ...days.map(([, v]) => v));
  const paths = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 12);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontFamily: 'Anton', marginTop: 0 }}>VIEWS — LAST 30 DAYS</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
          {days.map(([d, v]) => (
            <div key={d} title={`${d}: ${v}`} style={{ flex: 1, background: C.cyan, border: '2px solid #111', height: `${(v / max) * 100}%`, minHeight: 4 }} />
          ))}
          {!days.length && <div style={{ fontSize: 13 }}>No traffic data yet — it starts counting once visitors accept cookies.</div>}
        </div>
      </div>
      <div style={card}>
        <h3 style={{ fontFamily: 'Anton', marginTop: 0 }}>TOP PAGES</h3>
        {paths.map(([p, v]) => (
          <div key={p} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '4px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ flex: 1, fontWeight: 700 }}>{p}</div><div>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
