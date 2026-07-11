'use client';

// Tour events: ticketed concerts (real prices, real payments), school tour
// stops, and past-client showcase logos. Single source of truth for
// public/v25-template.html's MAIN_EVENTS/STOPS/WORKS, the ticket checkout
// pricing layer (lib/server/catalog.ts) and the /events JSON-LD — see
// app/api/site-data/events/route.ts for the public read side.

import { useCallback, useEffect, useState } from 'react';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, fmtDate, opsGet, opsPost, Toast, useToast,
  SearchBox, useSearch,
} from './ui';

type Kind = 'ticketed' | 'school' | 'past';
type Status = 'draft' | 'published' | 'cancelled' | 'completed';

interface Tier { name: string; price: number }
interface TourEvent {
  id: string; kind: Kind; name: string; event_date: string | null; date_label: string;
  event_time: string; venue: string; city: string; accent: string; status: Status;
  priority: number; image: string; description: string; tiers: Tier[] | string;
  logo: string; testimonial: string;
}

const EMPTY = {
  id: '' as string, kind: 'school' as Kind, name: '', eventDate: '', dateLabel: '',
  eventTime: '', venue: '', city: '', accent: '', status: 'published' as Status,
  priority: 0, image: '', description: '', tiers: [{ name: 'Regular', price: 0 }] as Tier[],
  logo: '', testimonial: '',
};

const KIND_LABEL: Record<Kind, string> = { ticketed: 'Ticketed', school: 'School Tour', past: 'Past Client' };
const KIND_TABS: (Kind | 'all')[] = ['all', 'ticketed', 'school', 'past'];

function parseTiers(v: Tier[] | string): Tier[] {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export default function Events() {
  const [rows, setRows] = useState<TourEvent[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [kindTab, setKindTab] = useState<Kind | 'all'>('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet('tourEvents');
    if (data.error) say('Load failed: ' + data.error);
    else setRows((data.rows || []).map((r: any) => ({ ...r, tiers: parseTiers(r.tiers) })));
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!edit || !edit.name.trim()) { say('Name is required'); return; }
    setBusy(true);
    const { data } = await opsPost('tourEvent.save', {
      id: edit.id || undefined, kind: edit.kind, name: edit.name, eventDate: edit.eventDate || null,
      dateLabel: edit.dateLabel, eventTime: edit.eventTime, venue: edit.venue, city: edit.city,
      accent: edit.accent, status: edit.status, priority: edit.priority, image: edit.image,
      description: edit.description, tiers: edit.kind === 'ticketed' ? edit.tiers : [],
      logo: edit.logo, testimonial: edit.testimonial,
    });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Saved');
    setEdit(null);
    reload();
  };

  const cancelEvent = async (r: TourEvent) => {
    if (!confirm(`Cancel "${r.name}"? It stops appearing on the site but stays in order history.`)) return;
    const { data } = await opsPost('tourEvent.delete', { id: r.id });
    if (data.error) say('Failed: ' + data.error); else { say('Cancelled'); reload(); }
  };

  const restore = async (r: TourEvent) => {
    const { data } = await opsPost('tourEvent.save', { id: r.id, kind: r.kind, name: r.name, status: 'published', priority: r.priority, tiers: parseTiers(r.tiers) });
    if (data.error) say('Failed: ' + data.error); else { say('Restored'); reload(); }
  };

  // "Prioritize / non-prioritize": a one-click pin to the top of its kind, or
  // drop back to 0 — priority is still a plain int under the hood (so an
  // admin who wants finer control can still edit it directly in the form).
  const maxPriorityFor = (kind: Kind) => rows.filter((r) => r.kind === kind).reduce((m, r) => Math.max(m, r.priority), 0);
  const pin = async (r: TourEvent) => {
    const { data } = await opsPost('tourEvent.save', { id: r.id, kind: r.kind, name: r.name, status: r.status, priority: maxPriorityFor(r.kind) + 10, tiers: parseTiers(r.tiers) });
    if (data.error) say('Failed: ' + data.error); else reload();
  };
  const unpin = async (r: TourEvent) => {
    const { data } = await opsPost('tourEvent.save', { id: r.id, kind: r.kind, name: r.name, status: r.status, priority: 0, tiers: parseTiers(r.tiers) });
    if (data.error) say('Failed: ' + data.error); else reload();
  };

  const openEdit = (r?: TourEvent) => {
    if (!r) { setEdit({ ...EMPTY, kind: kindTab === 'all' ? 'school' : kindTab }); return; }
    setEdit({
      id: r.id, kind: r.kind, name: r.name, eventDate: fmtDate(r.event_date), dateLabel: r.date_label || '',
      eventTime: r.event_time || '', venue: r.venue || '', city: r.city || '', accent: r.accent || '',
      status: r.status, priority: r.priority, image: r.image || '', description: r.description || '',
      tiers: parseTiers(r.tiers).length ? parseTiers(r.tiers) : [{ name: 'Regular', price: 0 }],
      logo: r.logo || '', testimonial: r.testimonial || '',
    });
  };

  const setTier = (i: number, patch: Partial<Tier>) => {
    if (!edit) return;
    const tiers = edit.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setEdit({ ...edit, tiers });
  };

  const byKind = rows.filter((r) => (kindTab === 'all' || r.kind === kindTab) && (showCancelled || r.status !== 'cancelled'));
  const visible = useSearch(byKind, qy);

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT EVENT' : 'NEW EVENT'}</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div><span style={label}>Kind *</span>
            <select style={inp} value={edit.kind} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Kind })}>
              <option value="ticketed">Ticketed concert</option>
              <option value="school">School tour stop</option>
              <option value="past">Past client</option>
            </select>
          </div>
          <div><span style={label}>Name *</span><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Lari Boys High School" /></div>
          <div><span style={label}>Status</span>
            <select style={inp} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (live)</option>
              <option value="completed">Completed (past)</option>
              <option value="cancelled">Cancelled (hidden)</option>
            </select>
          </div>
          <div><span style={label}>Priority (higher shows first)</span><input style={inp} type="number" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value) || 0 })} /></div>
          {edit.kind !== 'past' && (
            <>
              <div><span style={label}>Date {edit.kind === 'school' ? '(leave blank if TBA)' : '*'}</span><input style={inp} type="date" value={edit.eventDate} onChange={(e) => setEdit({ ...edit, eventDate: e.target.value })} /></div>
              {edit.kind === 'school' && !edit.eventDate && (
                <div><span style={label}>Date label (shown instead, e.g. &quot;TBA · AUG 2026&quot;)</span><input style={inp} value={edit.dateLabel} onChange={(e) => setEdit({ ...edit, dateLabel: e.target.value })} placeholder="TBA · AUG 2026" /></div>
              )}
              {edit.kind === 'ticketed' && (
                <div><span style={label}>Time</span><input style={inp} value={edit.eventTime} onChange={(e) => setEdit({ ...edit, eventTime: e.target.value })} placeholder="2:00 PM" /></div>
              )}
            </>
          )}
          <div><span style={label}>{edit.kind === 'ticketed' ? 'Venue' : 'Location line'}</span><input style={inp} value={edit.venue} onChange={(e) => setEdit({ ...edit, venue: e.target.value })} placeholder={edit.kind === 'ticketed' ? 'KICC Grounds' : 'Kimende, Lari, Kiambu County'} /></div>
          {edit.kind === 'ticketed' && (
            <>
              <div><span style={label}>City</span><input style={inp} value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} placeholder="Nairobi" /></div>
              <div><span style={label}>Accent colour (hex)</span><input style={inp} value={edit.accent} onChange={(e) => setEdit({ ...edit, accent: e.target.value })} placeholder="#E6218C" /></div>
            </>
          )}
          <div><span style={label}>Image path</span><input style={inp} value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} placeholder="/assets/gal/lari.jpg" /></div>
          {edit.kind === 'past' && (
            <div><span style={label}>Logo path</span><input style={inp} value={edit.logo} onChange={(e) => setEdit({ ...edit, logo: e.target.value })} placeholder="/assets/partners/logo.png" /></div>
          )}
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>{edit.kind === 'ticketed' ? 'Tagline' : 'Description'}</span>
          <input style={inp} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        </div>
        {edit.kind === 'past' && (
          <div style={{ marginTop: 10 }}>
            <span style={label}>Testimonial</span>
            <textarea style={{ ...inp, minHeight: 70 }} value={edit.testimonial} onChange={(e) => setEdit({ ...edit, testimonial: e.target.value })} />
          </div>
        )}
        {edit.kind === 'ticketed' && (
          <div style={{ marginTop: 14 }}>
            <span style={label}>Ticket tiers (real prices — checkout charges exactly this)</span>
            {edit.tiers.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input style={{ ...inp, flex: 2 }} value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="Tier name" />
                <input style={{ ...inp, flex: 1 }} type="number" min={0} value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) || 0 })} placeholder="Price KES" />
                <button style={btnSmall} onClick={() => setEdit({ ...edit, tiers: edit.tiers.filter((_, idx) => idx !== i) })}>Remove</button>
              </div>
            ))}
            <button style={btnSmall} onClick={() => setEdit({ ...edit, tiers: [...edit.tiers, { name: '', price: 0 }] })}>+ Add tier</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>Save event</button>
          <button style={btnDark} onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>TOUR EVENTS</h3>
          <div style={{ flex: 1 }} />
          <SearchBox value={qy} onChange={setQy} placeholder="Search events..." />
          <button style={btn} onClick={() => openEdit()}>+ New event</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {KIND_TABS.map((k) => (
            <button key={k} style={{ ...btnSmall, background: kindTab === k ? OC.magenta : '#fff', color: kindTab === k ? '#fff' : '#111' }} onClick={() => setKindTab(k)}>
              {k === 'all' ? 'All' : KIND_LABEL[k]}
            </button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginLeft: 8 }}>
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Show cancelled
          </label>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Live: this is the only place tour events, school dates, and ticket prices live — the site, the ticket checkout, and Google (event JSON-LD) all read straight from here. Cancel keeps the row (past ticket sales still reference it) but hides it everywhere public.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{['kind', 'name', 'date', 'venue / location', 'priority', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Chip text={KIND_LABEL[r.kind]} /></td>
                  <td style={td}><b>{r.name}</b>{r.kind === 'ticketed' ? <div style={{ fontSize: 11, color: '#888' }}>{parseTiers(r.tiers).map((t) => `${t.name} KES ${t.price.toLocaleString()}`).join(' · ')}</div> : null}</td>
                  <td style={td}>{r.event_date ? fmtDate(r.event_date) : (r.date_label || '—')}{r.event_time ? ` · ${r.event_time}` : ''}</td>
                  <td style={td}>{r.venue}{r.city ? `, ${r.city}` : ''}</td>
                  <td style={td}>{r.priority}</td>
                  <td style={td}>
                    {r.status === 'published' ? <Chip text="published" bg="#E7F5EE" color={OC.green} />
                      : r.status === 'completed' ? <Chip text="completed" bg="#eee" />
                      : r.status === 'cancelled' ? <Chip text="cancelled" bg="#FBE7E7" color={OC.red} />
                      : <Chip text="draft" bg="#FDF2D9" color={OC.orange} />}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button style={btnSmall} onClick={() => openEdit(r)}>Edit</button>
                      <button style={btnSmall} onClick={() => pin(r)} title="Prioritize — pin to top of its kind">↑ Pin</button>
                      {r.priority > 0 && <button style={btnSmall} onClick={() => unpin(r)} title="Non-prioritize">↓ Unpin</button>}
                      {r.status === 'cancelled'
                        ? <button style={btnSmall} onClick={() => restore(r)}>Restore</button>
                        : <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => cancelEvent(r)}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td style={td} colSpan={7}>{byKind.length ? 'No events match your search.' : 'No events in this filter.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
