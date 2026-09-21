'use client';

// Admin landing cards, fed by one aggregate endpoint (view=dashboard):
// money outstanding, the next event and its checklist progress, follow-ups
// due today, the live promo, pending reviews and the latest audit entries.

import { useEffect, useState } from 'react';
import {
  OC, card, h3, Chip, fmtKES, fmtDate, opsGet, waLink,
} from './ui';

interface ClientErrorRow {
  id: number; msg: string; src: string; line: number; page: string; ua: string; created_at: string;
}

// Diagnostic-only, isSuperAdmin-gated: /api/admin/ops?view=clientErrors 403s
// for a crew_admin, so this simply renders nothing for them rather than
// surfacing an error card - the panel's existence isn't worth flagging to a
// scoped account, and the rest of the dashboard already works for them.
function RecentErrorsPanel() {
  const [rows, setRows] = useState<ClientErrorRow[] | null>(null);

  useEffect(() => {
    opsGet('clientErrors').then(({ data }) => {
      if (!data.error && Array.isArray(data.rows)) setRows(data.rows);
    });
  }, []);

  if (rows === null) return null;

  return (
    <div style={card}>
      <h3 style={h3}>RECENT CLIENT ERRORS ({rows.length})</h3>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        Runtime errors visitors' browsers reported (last 30 days, most recent 30 shown). Super-admin only — see app/api/client-error for the beacon that collects these.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr>{['when', 'page', 'message', 'source'].map((c) => <th key={c} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '2px solid #111', whiteSpace: 'nowrap' }}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #eee' }}>{e.page || '—'}</td>
                <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #eee', maxWidth: 340 }}>{e.msg || '—'}</td>
                <td style={{ padding: '8px 10px', fontSize: 11, color: '#888', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{e.src}{e.line ? `:${e.line}` : ''}</td>
              </tr>
            ))}
            {!rows.length && <tr><td style={{ padding: '8px 10px', fontSize: 13 }} colSpan={4}>No client errors reported in the last 30 days.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// One place to get any CSV instead of hunting through 11 ops tabs — every
// kind hits the same admin-gated unified endpoint (app/api/admin/export).
const EXPORT_KINDS: { kind: string; label: string }[] = [
  { kind: 'orders', label: 'Orders' },
  { kind: 'bookings', label: 'Bookings' },
  { kind: 'subscribers', label: 'Subscribers' },
  { kind: 'tickets', label: 'Tickets' },
  { kind: 'invoices', label: 'Invoices' },
  { kind: 'payments', label: 'Payments' },
  { kind: 'contacts', label: 'Contacts' },
  { kind: 'expenses', label: 'Expenses' },
  { kind: 'payouts', label: 'Crew payouts' },
];

interface ExportState {
  search: string;
  from: string;
  to: string;
}

const defaultExportState = (): ExportState => ({ search: '', from: '', to: '' });

function buildExportUrl(kind: string, state: ExportState): string {
  const params = new URLSearchParams({ kind });
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.from) params.set('from', state.from);
  if (state.to)   params.set('to', state.to);
  return `/api/admin/export?${params}`;
}

function ExportPanel() {
  const [states, setStates] = useState<Record<string, ExportState>>(
    () => Object.fromEntries(EXPORT_KINDS.map(({ kind }) => [kind, defaultExportState()]))
  );
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [open, setOpen] = useState<string | null>(null);

  const fetchCount = async (kind: string, state: ExportState) => {
    setCounts((prev) => ({ ...prev, [kind]: null }));
    try {
      const res = await fetch(buildExportUrl(kind, state), { method: 'HEAD' }).catch(() => null);
      if (res) {
        const total = res.headers.get('X-Total-Count');
        if (total !== null) { setCounts((prev) => ({ ...prev, [kind]: Number(total) })); return; }
      }
      // HEAD may not work if route doesn't support it; fall back to a range-0 GET
      const res2 = await fetch(buildExportUrl(kind, { ...state }) + '&limit=0&offset=0').catch(() => null);
      if (res2) {
        const total = res2.headers.get('X-Total-Count');
        if (total !== null) setCounts((prev) => ({ ...prev, [kind]: Number(total) }));
      }
    } catch {}
  };

  const upd = (kind: string, patch: Partial<ExportState>) => {
    setStates((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  };
  const miniInp: React.CSSProperties = {
    padding: '6px 8px',
    border: '2px solid #111',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    width: 160,
  };
  const miniLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    color: '#555',
    display: 'block',
    marginBottom: 2,
  };

  return (
    <div style={card}>
      <h3 style={h3}>EXPORT</h3>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        Every CSV in one place. Optionally filter by keyword, date range, then download. The{' '}
        <b>X-Total-Count</b> header tells you how many rows match.
      </div>
      {EXPORT_KINDS.map(({ kind, label }) => {
        const st = states[kind] || defaultExportState();
        const isOpen = open === kind;
        const cnt = counts[kind];
        return (
          <div key={kind} style={rowStyle}>
            <div style={{ minWidth: 100 }}>
              <b style={{ fontSize: 13 }}>{label}</b>
              {cnt !== null && cnt !== undefined && (
                <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                  {cnt} rows
                </span>
              )}
            </div>
            <button
              style={{ padding: '5px 9px', fontSize: 12, border: '2px solid #111', borderRadius: 8, background: isOpen ? '#eee' : '#fff', cursor: 'pointer', fontWeight: 700 }}
              onClick={() => setOpen(isOpen ? null : kind)}
              aria-expanded={isOpen}
            >
              {isOpen ? '▲ Filters' : '▼ Filters'}
            </button>
            {isOpen && (
              <>
                <div>
                  <span style={miniLabel}>Search</span>
                  <input
                    style={miniInp}
                    placeholder="keyword..."
                    value={st.search}
                    onChange={(e) => upd(kind, { search: e.target.value })}
                  />
                </div>
                <div>
                  <span style={miniLabel}>From date</span>
                  <input
                    style={miniInp}
                    type="date"
                    value={st.from}
                    onChange={(e) => upd(kind, { from: e.target.value })}
                  />
                </div>
                <div>
                  <span style={miniLabel}>To date</span>
                  <input
                    style={miniInp}
                    type="date"
                    value={st.to}
                    onChange={(e) => upd(kind, { to: e.target.value })}
                  />
                </div>
                <button
                  style={{ padding: '5px 9px', fontSize: 12, border: '2px solid #111', borderRadius: 8, background: '#21C7E6', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => fetchCount(kind, st)}
                >
                  Count
                </button>
              </>
            )}
            <a
              href={buildExportUrl(kind, st)}
              style={{ background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              ⬇ {label}
            </a>
          </div>
        );
      })}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '2px dashed #ccc' }}>
        <a href="/api/admin/backup" style={{ display: 'inline-block', background: '#111', color: '#FFD400', fontWeight: 800, fontSize: 13, padding: '11px 16px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #FFD400', cursor: 'pointer', textDecoration: 'none' }}>
          ⬇ Download Full Backup
        </a>
        <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Full backup, everything, one file. For disaster recovery, not routine reporting, so it is rate limited and every download is logged.</div>
      </div>
    </div>
  );
}

export default function OpsDashboard() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    opsGet('dashboard').then(({ data }) => {
      if (data.error) setErr(data.error); else setD(data);
    });
  }, []);

  if (err) return <div style={{ display: 'grid', gap: 14 }}><ExportPanel /><div style={{ ...card, fontSize: 13 }}>Ops dashboard unavailable: {err}</div></div>;
  if (!d) return <div style={{ display: 'grid', gap: 14 }}><ExportPanel /><div style={{ ...card, fontSize: 13 }}>Loading ops overview...</div></div>;

  const ne = d.nextEvent;
  const daysOut = ne?.event_date ? Math.max(0, Math.ceil((new Date(fmtDate(ne.event_date)).getTime() - Date.now()) / 86400000)) : null;
  const clTotal = Number(ne?.checklist_total || 0);
  const clDone = Number(ne?.checklist_done || 0);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ExportPanel />
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: d.outstanding > 0 ? OC.orange : OC.green }}>{fmtKES(d.outstanding)}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Outstanding on invoices</div>
          <div style={{ marginTop: 6 }}>
            <Chip text={`${d.overdueCount} overdue`} bg={d.overdueCount ? '#FBE9E7' : '#E7F5EE'} color={d.overdueCount ? OC.red : OC.green} />
          </div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          {ne ? (
            <>
              <div style={{ fontFamily: 'Anton', fontSize: 20 }}>{ne.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{ne.school}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <b>{fmtDate(ne.event_date)}</b>{daysOut !== null && <span style={{ color: OC.magenta, fontWeight: 800 }}> - {daysOut} day{daysOut === 1 ? '' : 's'} out</span>}
              </div>
              <div style={{ marginTop: 6 }}>
                <Chip text={clTotal ? `checklist ${clDone}/${clTotal}` : 'no checklist yet'} bg={clTotal && clDone === clTotal ? '#E7F5EE' : '#FDF2D9'} color={clTotal && clDone === clTotal ? OC.green : OC.orange} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'Anton', fontSize: 20, color: '#999' }}>No upcoming event</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Confirm a lead in the Pipeline, then budget it.</div>
            </>
          )}
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700, marginTop: 8 }}>Next event</div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: d.followups?.length ? OC.orange : OC.green }}>{d.followups?.length || 0}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Follow-ups due</div>
          <div style={{ marginTop: 6, display: 'grid', gap: 4, textAlign: 'left' }}>
            {(d.followups || []).slice(0, 3).map((f: any) => (
              <div key={f.id} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                <b>{f.name}</b><span style={{ color: '#888' }}>{f.org}</span>
                {f.phone && <a href={waLink(f.phone)} target="_blank" rel="noopener" style={{ color: OC.green, fontWeight: 700 }}>wa</a>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          {d.activePromo ? (
            <>
              <div style={{ fontFamily: 'Anton', fontSize: 20 }}>{d.activePromo.name}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <b style={{ color: OC.magenta }}>{d.activePromo.promo_type === 'percent' ? `${Number(d.activePromo.discount)}% off` : `KES ${Number(d.activePromo.discount).toLocaleString()} off`}</b>
                {d.activePromo.code ? <span> - code {d.activePromo.code}</span> : null}
              </div>
              {d.activePromo.ends_on && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>ends {fmtDate(d.activePromo.ends_on)}</div>}
            </>
          ) : (
            <div style={{ fontFamily: 'Anton', fontSize: 20, color: '#999' }}>No active promo</div>
          )}
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700, marginTop: 8 }}>Active promo</div>
        </div>

        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: d.pendingReviews ? OC.orange : OC.green }}>{d.pendingReviews}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Reviews awaiting moderation</div>
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>RECENT ACTIVITY</h3>
        {(d.audit || []).map((a: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '4px 0', borderBottom: '1px solid #eee', flexWrap: 'wrap' }}>
            <span style={{ color: '#888', minWidth: 78 }}>{fmtDate(a.created_at)}</span>
            <b>{a.action}</b>
            <span style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>{typeof a.detail === 'string' ? a.detail : JSON.stringify(a.detail || {})}</span>
          </div>
        ))}
        {!(d.audit || []).length && <div style={{ fontSize: 13, color: '#666' }}>No ops activity logged yet.</div>}
      </div>
      <RevenueChartPanel />
      <RecentErrorsPanel />
    </div>
  );
}

// Pure-CSS horizontal bar chart — no external charting library required.
// Each bar is a div whose width is set as a percentage of the max value.
function BarChart({
  data,
  label,
  color = '#E6218C',
}: {
  data: { label: string; value: number }[];
  label: string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr 52px',
              gap: 8,
              alignItems: 'center',
              fontSize: 11,
            }}
          >
            <span
              style={{
                color: '#666',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {d.label}
            </span>
            <div style={{ background: '#f4f4f4', borderRadius: 4, height: 16, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(d.value / max) * 100}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 4,
                  transition: 'width .3s',
                }}
              />
            </div>
            <span style={{ fontWeight: 700 }}>{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Fetches view=revenueChart and renders a weekly revenue bar chart.
function RevenueChartPanel() {
  const [rows, setRows] = useState<{ week: string; total: number; count: number }[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    opsGet('revenueChart').then(({ data }) => {
      if (data.error) setErr(data.error);
      else if (Array.isArray(data.rows)) setRows(data.rows);
    });
  }, []);

  // Silently hide for crew accounts that don't have the orders perm
  if (err === 'forbidden') return null;

  return (
    <div
      style={{
        ...card,
        boxShadow: '5px 5px 0 #111',
      }}
    >
      <h3 style={{ fontFamily: 'Anton', margin: '0 0 14px', fontSize: 18, letterSpacing: '.02em' }}>
        WEEKLY REVENUE — LAST 8 WEEKS
      </h3>
      {err && <div style={{ fontSize: 13, color: '#A11212' }}>Revenue chart unavailable: {err}</div>}
      {!err && rows === null && <div style={{ fontSize: 13, color: '#666' }}>Loading revenue chart…</div>}
      {rows !== null && rows.length === 0 && (
        <div style={{ fontSize: 13, color: '#666' }}>No paid orders in the last 8 weeks.</div>
      )}
      {rows !== null && rows.length > 0 && (
        <>
          <BarChart
            label="KES revenue per week (paid orders)"
            color="#E6218C"
            data={rows.map((r) => ({ label: r.week, value: r.total }))}
          />
          <div style={{ marginTop: 16 }}>
            <BarChart
              label="Orders per week"
              color="#21C7E6"
              data={rows.map((r) => ({ label: r.week, value: r.count }))}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#888' }}>
            Total:{' '}
            <b>
              KES{' '}
              {rows
                .reduce((sum, r) => sum + r.total, 0)
                .toLocaleString('en-KE')}
            </b>{' '}
            across <b>{rows.reduce((sum, r) => sum + r.count, 0)}</b> paid orders
          </div>
        </>
      )}
    </div>
  );
}
