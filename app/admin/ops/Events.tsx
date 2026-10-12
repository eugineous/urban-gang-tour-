'use client';

// Tour events: ticketed concerts (real prices, real payments), school tour
// stops, and past-client showcase logos. Single source of truth for
// the public event feed, the ticket checkout
// pricing layer (lib/server/catalog.ts) and the /events JSON-LD — see
// app/api/site-data/events/route.ts for the public read side.

import { useCallback, useEffect, useState } from 'react';
import { EVENT_STATUSES, isPubliclyVisible, type EventStatus } from '@/lib/server/event-lifecycle';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, fmtDate, opsGet, opsPost, Toast, useToast,
  SearchBox, useSearch,
} from './ui';

type Kind = 'ticketed' | 'school' | 'past';
// Full lifecycle — mirrors lib/server/event-lifecycle.ts, which is the single
// source of truth the server validates against.
type Status = EventStatus;

interface Tier { name: string; price: number; capacity?: number | null; per_order_min?: number; per_order_max?: number }

// Provenance for a row recovered from source history rather than entered as a
// live operational record. `unverified` means the values come from an old
// commit — see lib/server/recovered-legacy-events.ts.
interface RecoveryInfo {
  recovered_from_commit: string; recovered_at: string;
  verification_status: 'unverified' | 'verified' | 'rejected';
  verified_at: string | null; verified_by: string | null; recovery_notes: string;
}

interface TourEvent {
  id: string; kind: Kind; name: string; event_date: string | null; date_label: string;
  event_time: string; venue: string; city: string; accent: string; status: Status;
  priority: number; image: string; description: string; tiers: Tier[] | string;
  logo: string; testimonial: string;
  recovery?: RecoveryInfo | null;
  previous_start_at?: string | null;
}

const EMPTY = {
  id: '' as string, kind: 'school' as Kind, name: '', eventDate: '', dateLabel: '',
  eventTime: '', venue: '', city: '', accent: '', status: 'draft' as Status,
  priority: 0, image: '', description: '', tiers: [{ name: 'Regular', price: 0 }] as Tier[],
  logo: '', testimonial: '',
};

const KIND_LABEL: Record<Kind, string> = { ticketed: 'Ticketed', school: 'School Tour', past: 'Past Client' };
const KIND_TABS: (Kind | 'all')[] = ['all', 'ticketed', 'school', 'past'];
const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft', pending_review: 'Pending review', published: 'Published',
  sales_paused: 'Sales paused', sold_out: 'Sold out', postponed: 'Postponed',
  rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed', archived: 'Archived',
};

function visibilityNote(status: Status, kind: Kind): string {
  if (!isPubliclyVisible(status)) return 'Hidden from the public site';
  if (status === 'completed') return 'Public history · no ticket sales';
  if (kind !== 'ticketed') return 'Public information · no ticket sales';
  if (status !== 'published') return 'Public event · ticket sales closed';
  return 'Public event · sales depend on available inventory and sale window';
}

function safeJson(v: string): RecoveryInfo | null {
  try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : null; } catch { return null; }
}

function parseTiers(v: Tier[] | string): Tier[] {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// tourEvent.save replaces every editable field, rather than accepting a
// partial patch. Priority shortcuts must retain the full existing record.
function eventSavePayload(r: TourEvent, priority: number) {
  return {
    id: r.id, kind: r.kind, name: r.name, eventDate: r.event_date ? fmtDate(r.event_date) : null,
    dateLabel: r.date_label || '', eventTime: r.event_time || '', venue: r.venue || '', city: r.city || '',
    accent: r.accent || '', status: r.status, priority, image: r.image || '',
    description: r.description || '', tiers: parseTiers(r.tiers),
    logo: r.logo || '', testimonial: r.testimonial || '',
  };
}

export default function Events() {
  const [rows, setRows] = useState<TourEvent[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [kindTab, setKindTab] = useState<Kind | 'all'>('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { status, data } = await opsGet('tourEvents');
      if (status >= 400 || data.error || !Array.isArray(data.rows)) {
        setLoadError(status === 401 || status === 403
          ? 'Your session does not have access to tour events. Sign in with an account assigned the Events module.'
          : 'Tour events could not be loaded. Retry to view the current records.');
        return;
      }
      setRows(data.rows.map((r: any) => ({
        ...r,
        tiers: parseTiers(r.tiers),
        recovery: typeof r.recovery === 'string' ? safeJson(r.recovery) : (r.recovery || null),
      })));
    } catch {
      setLoadError('Tour events could not be loaded. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!edit || !edit.name.trim()) { say('Name is required'); return; }
    setBusy(true);
    try {
    const { status, data } = await opsPost('tourEvent.save', {
      id: edit.id || undefined, kind: edit.kind, name: edit.name, eventDate: edit.eventDate || null,
      dateLabel: edit.dateLabel, eventTime: edit.eventTime, venue: edit.venue, city: edit.city,
      accent: edit.accent, status: edit.status, priority: edit.priority, image: edit.image,
      description: edit.description, tiers: edit.kind === 'ticketed' ? edit.tiers : [],
      logo: edit.logo, testimonial: edit.testimonial,
    });
    if (status >= 400 || data.error) { say('Failed: ' + (data.error || 'event could not be saved')); return; }
    say('Saved');
    setEdit(null);
    reload();
    } catch {
      say('Could not save the event. Check your connection and retry. Your changes are still here.');
    } finally {
      setBusy(false);
    }
  };

  const cancelEvent = async (r: TourEvent) => {
    if (!confirm(`Cancel "${r.name}"? It stops appearing on the site but stays in order history.`)) return;
    setBusy(true);
    try {
      const { status, data } = await opsPost('tourEvent.delete', { id: r.id });
      if (status >= 400 || data.error) { say('Failed: ' + (data.error || 'event could not be cancelled')); return; }
      say('Cancelled');
      await reload();
    } catch {
      say('Could not cancel the event. Check your connection and retry.');
    } finally {
      setBusy(false);
    }
  };

  // One-time recovery of the three LEGACY ticketed events that shipped before
  // the DB cutover (lib/server/recovered-legacy-events.ts). These are evidence
  // recovered from source history, NOT verified commercial facts: a date that
  // has passed is recorded as `completed` (history, never sellable), and a
  // future date stays `draft` until a human confirms it. Nothing is published,
  // nothing is emailed, and a second run cannot duplicate or overwrite.
  const recoverLegacyEvents = async () => {
    if (!confirm('Recover the 3 legacy pre-migration ticketed events?\n\nExperience Hub Dance Event · Urban Festival Of Colours · Campus Rave\n\nThese are RECOVERED FROM SOURCE HISTORY, not verified current facts. A past date is recorded as completed (history, not sellable). A future date stays a draft until you confirm it. Each row is marked UNVERIFIED until you publish it.')) return;
    setBusy(true);
    try {
    const { status, data } = await opsPost('tourEvent.recoverLegacyEvents', {});
    if (status >= 400 || data.error) { say('Failed: ' + (data.error || 'events could not be recovered')); return; }
    const recovered: Record<string, string> = data.recovered || {};
    const ids = Object.keys(recovered);
    say(ids.length
      ? `Recovered ${ids.length} (${Array.from(new Set(Object.values(recovered))).join('/')}) — confirm each date before publishing.`
      : 'Already present — nothing recovered, nothing overwritten.');
    await reload();
    } catch {
      say('Could not recover the records. Check your connection and retry.');
    } finally {
      setBusy(false);
    }
  };

  // "Prioritize / non-prioritize": a one-click pin to the top of its kind, or
  // drop back to 0 — priority is still a plain int under the hood (so an
  // admin who wants finer control can still edit it directly in the form).
  const maxPriorityFor = (kind: Kind) => rows.filter((r) => r.kind === kind).reduce((m, r) => Math.max(m, r.priority), 0);
  const setPriority = async (r: TourEvent, priority: number) => {
    setBusy(true);
    try {
      const { status, data } = await opsPost('tourEvent.save', eventSavePayload(r, priority));
      if (status >= 400 || data.error) { say('Failed: ' + (data.error || 'priority could not be saved')); return; }
      say('Priority saved');
      await reload();
    } catch {
      say('Could not update the priority. Check your connection and retry.');
    } finally {
      setBusy(false);
    }
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
  const publicCount = rows.filter(r => isPubliclyVisible(r.status)).length;
  const reviewCount = rows.filter(r => r.status === 'draft' || r.status === 'pending_review').length;
  const publishedTicketCount = rows.filter(r => r.kind === 'ticketed' && r.status === 'published').length;

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT EVENT' : 'NEW EVENT'}</h3>

        {/* Overview */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Overview</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div><label style={label} htmlFor="tour-event-kind">Kind *</label>
              <select id="tour-event-kind" style={inp} value={edit.kind} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Kind })}>
                <option value="ticketed">Ticketed concert</option>
                <option value="school">School tour stop</option>
                <option value="past">Past client</option>
              </select>
            </div>
            <div><label style={label} htmlFor="tour-event-name">Name *</label><input id="tour-event-name" style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Lari Boys High School" /></div>
            <div><label style={label} htmlFor="tour-event-priority">Priority (higher shows first)</label><input id="tour-event-priority" style={inp} type="number" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value) || 0 })} /></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={label} htmlFor="tour-event-description">{edit.kind === 'ticketed' ? 'Tagline' : 'Description'}</label>
            <input id="tour-event-description" style={inp} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          </div>
          {edit.kind === 'past' && (
            <div style={{ marginTop: 10 }}>
              <label style={label} htmlFor="tour-event-testimonial">Testimonial</label>
              <textarea id="tour-event-testimonial" style={{ ...inp, minHeight: 70 }} value={edit.testimonial} onChange={(e) => setEdit({ ...edit, testimonial: e.target.value })} />
            </div>
          )}
        </div>

        {/* Schedule */}
        {edit.kind !== 'past' && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Schedule</p>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div><label style={label} htmlFor="tour-event-date">Date {edit.kind === 'school' ? '(leave blank if TBA)' : '*'}</label><input id="tour-event-date" style={inp} type="date" value={edit.eventDate} onChange={(e) => setEdit({ ...edit, eventDate: e.target.value })} /></div>
              {edit.kind === 'school' && !edit.eventDate && (
                <div><label style={label} htmlFor="tour-event-date-label">Date label (shown instead, e.g. &quot;Date to be confirmed&quot;)</label><input id="tour-event-date-label" style={inp} value={edit.dateLabel} onChange={(e) => setEdit({ ...edit, dateLabel: e.target.value })} placeholder="Date to be confirmed" /></div>
              )}
              {edit.kind === 'ticketed' && (
                <div><label style={label} htmlFor="tour-event-time">Time</label><input id="tour-event-time" style={inp} value={edit.eventTime} onChange={(e) => setEdit({ ...edit, eventTime: e.target.value })} placeholder="2:00 PM" /></div>
              )}
            </div>
          </div>
        )}

        {/* Venue */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Venue</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div><label style={label} htmlFor="tour-event-venue">{edit.kind === 'ticketed' ? 'Venue' : 'Location line'}</label><input id="tour-event-venue" style={inp} value={edit.venue} onChange={(e) => setEdit({ ...edit, venue: e.target.value })} placeholder={edit.kind === 'ticketed' ? 'KICC Grounds' : 'Kimende, Lari, Kiambu County'} /></div>
            {edit.kind === 'ticketed' && (
              <div><label style={label} htmlFor="tour-event-city">City</label><input id="tour-event-city" style={inp} value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} placeholder="Nairobi" /></div>
            )}
          </div>
        </div>

        {/* Tickets */}
        {edit.kind === 'ticketed' && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Tickets</p>
            <span style={label}>Ticket tiers (real prices — checkout charges exactly this)</span>
            {edit.tiers.map((t, i) => (
              <fieldset key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
                <legend>Tier {i + 1}</legend>
                <label style={label}>Name<input aria-label={`Ticket tier ${i + 1} name`} style={inp} value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="Tier name" /></label>
                <label style={label}>Price · KES<input aria-label={`Ticket tier ${i + 1} price in KES`} style={inp} type="number" min={0} step={1} value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) || 0 })} /></label>
                <label style={label}>Total capacity<input aria-label={`Ticket tier ${i + 1} capacity`} style={inp} type="number" min={0} step={1} value={t.capacity ?? ''} onChange={(e) => setTier(i, { capacity: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Required to open sales" /></label>
                <label style={label}>Minimum per order<input aria-label={`Ticket tier ${i + 1} minimum per order`} style={inp} type="number" min={1} max={20} step={1} value={t.per_order_min ?? 1} onChange={(e) => setTier(i, { per_order_min: Number(e.target.value) })} /></label>
                <label style={label}>Maximum per order<input aria-label={`Ticket tier ${i + 1} maximum per order`} style={inp} type="number" min={t.per_order_min ?? 1} max={20} step={1} value={t.per_order_max ?? 20} onChange={(e) => setTier(i, { per_order_max: Number(e.target.value) })} /></label>
                <button style={btnSmall} onClick={() => setEdit({ ...edit, tiers: edit.tiers.filter((_, idx) => idx !== i) })}>Remove</button>
              </fieldset>
            ))}
            <button style={btnSmall} onClick={() => setEdit({ ...edit, tiers: [...edit.tiers, { name: '', price: 0 }] })}>+ Add tier</button>
            <p style={{fontSize:12,color:'#555'}}>Capacity is the total allocation, including issued tickets and active reservations. Blank capacity keeps sales closed. Do not rename or reorder tiers after orders have been created; tier indexes identify existing tickets.</p>
          </div>
        )}

        {/* Media */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Media</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div><label style={label} htmlFor="tour-event-image">Image path</label><input id="tour-event-image" style={inp} value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} placeholder="/assets/gal/lari.jpg" /></div>
            {edit.kind === 'ticketed' && (
              <div><label style={label} htmlFor="tour-event-accent">Accent colour (hex)</label><input id="tour-event-accent" style={inp} value={edit.accent} onChange={(e) => setEdit({ ...edit, accent: e.target.value })} placeholder="#E6218C" /></div>
            )}
            {edit.kind === 'past' && (
              <div><label style={label} htmlFor="tour-event-logo">Logo path</label><input id="tour-event-logo" style={inp} value={edit.logo} onChange={(e) => setEdit({ ...edit, logo: e.target.value })} placeholder="/assets/partners/logo.png" /></div>
            )}
          </div>
        </div>

        {/* Lifecycle */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Lifecycle</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div><label style={label} htmlFor="tour-event-status">Status</label>
              <select id="tour-event-status" style={inp} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })} aria-describedby="tour-event-visibility">
                {EVENT_STATUSES.map(status => <option value={status} key={status}>{STATUS_LABEL[status]} ({isPubliclyVisible(status) ? 'public' : 'hidden'})</option>)}
              </select>
            </div>
          </div>
          <div id="tour-event-visibility" style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            {visibilityNote(edit.status, edit.kind)}.
            {edit.kind === 'school' && ' A school stop is information about the tour, not a public ticket offer.'}
            {edit.status === 'cancelled' && ' Review affected orders and arrange any refunds through event operations.'}
            {!edit.id && ' New records start as drafts. Confirm the date, venue, media permissions and commercial details before publishing.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save event'}</button>
          <button style={btnDark} disabled={busy} onClick={() => setEdit(null)}>Cancel</button>
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
          {!loading && !loadError && !rows.some((r) => r.kind === 'ticketed') && (
            <button style={{ ...btn, background: '#111', color: '#fff' }} disabled={busy} onClick={recoverLegacyEvents} title="One-time recovery of the 3 legacy ticketed events from source history">Recover legacy events</button>
          )}
          <button style={btn} disabled={busy || loading || !!loadError} onClick={() => openEdit()}>+ New event</button>
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
        {!loading && !loadError && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }} aria-label="Event publishing overview">
          <Chip text={`${publicCount} public records`} bg="#E7F5EE" color={OC.green} />
          <Chip text={`${reviewCount} drafts / awaiting review`} bg="#FDF2D9" color={OC.orange} />
          <Chip text={`${publishedTicketCount} published ticketed events`} />
        </div>}
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          These records supply the public event feed and ticket prices. Published school stops are informational; only ticketed events can offer tickets, subject to available inventory and the sale window. Priority orders the feed within each kind. Cancel keeps the record for order history and hides it from public views. The recorded tour-history archive is maintained separately.
        </div>
        {loading && <p role="status">Loading tour events…</p>}
        {loadError && <div role="alert" style={{ background: '#FBE7E7', padding: 14, borderRadius: 10, marginBottom: 14 }}><p style={{ margin: '0 0 10px' }}>{loadError}</p><button style={btnSmall} onClick={reload}>Retry loading events</button></div>}
        {!loading && !loadError && !rows.some((r) => r.kind === 'ticketed') && (
          <div style={{ fontSize: 12, color: '#7A4F1A', background: '#FDF2D9', border: '1px solid #EBD9A8', padding: '10px 12px', marginBottom: 10 }}>
            <b>No ticketed events — nothing can be sold and /events/[id] has no live page.</b>{' '}
            &quot;Recover legacy events&quot; copies the three ticketed events that shipped before the DB cutover
            (The Experience Hub Dance Event · KICC, Urban Festival Of Colours · Uhuru Gardens, Campus Rave · Carnivore Grounds)
            out of source history. This is <b>evidence recovery, not verification</b>: names, venues and tier prices come from
            an old commit that nobody has confirmed against today&apos;s reality. Past dates are recorded as
            <b> completed</b> (history, never sellable); the future one stays a <b>draft</b>. Each row is tagged
            <b> UNVERIFIED</b> until a person confirms it and publishes it. Recovery is transactional and repeat-safe —
            it will never overwrite or duplicate an event you have already edited.
          </div>
        )}
        {!loading && !loadError && <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{['kind', 'name', 'date', 'venue / location', 'priority', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Chip text={KIND_LABEL[r.kind]} /></td>
                  <td style={td}><b>{r.name}</b>{r.recovery && r.recovery.verification_status !== 'verified' ? <Chip text={'recovered · ' + r.recovery.verification_status} bg="#FBE7E7" color={OC.red} /> : null}{r.recovery?.verification_status === 'verified' ? <Chip text="recovered · verified" bg="#E7F5EE" color={OC.green} /> : null}{r.kind === 'ticketed' ? <div style={{ fontSize: 11, color: '#888' }}>{parseTiers(r.tiers).map((t) => `${t.name} KES ${t.price.toLocaleString()}`).join(' · ')}</div> : null}</td>
                  <td style={td}>{r.event_date ? fmtDate(r.event_date) : (r.date_label || '—')}{r.event_time ? ` · ${r.event_time}` : ''}{r.previous_start_at && r.previous_start_at !== r.event_date ? <div style={{ fontSize: 11, color: '#B26A00' }}>was {fmtDate(r.previous_start_at)}</div> : null}</td>
                  <td style={td}>{r.venue}{r.city ? `, ${r.city}` : ''}</td>
                  <td style={td}>{r.priority}</td>
                  <td style={td}>
                    <Chip text={STATUS_LABEL[r.status] || r.status}
                      bg={r.status === 'published' ? '#E7F5EE' : r.status === 'cancelled' ? '#FBE7E7' : '#eee'}
                      color={r.status === 'published' ? OC.green : r.status === 'cancelled' ? OC.red : '#333'} />
                    <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>{visibilityNote(r.status, r.kind)}</div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button style={btnSmall} disabled={busy} onClick={() => openEdit(r)}>Edit</button>
                      <button style={btnSmall} disabled={busy} onClick={() => setPriority(r, maxPriorityFor(r.kind) + 10)} title="Prioritize in the public feed while keeping this event's date, venue and media">↑ Pin</button>
                      {r.priority > 0 && <button style={btnSmall} disabled={busy} onClick={() => setPriority(r, 0)} title="Remove feed priority while keeping this event's details">↓ Unpin</button>}
                      {r.kind === 'ticketed' && isPubliclyVisible(r.status) && <a style={{ ...btnSmall, textDecoration: 'none' }} href={`/events/${encodeURIComponent(r.id)}`} target="_blank" rel="noopener noreferrer">View event</a>}
                      {r.status === 'cancelled'
                        ? <button style={btnSmall} disabled={busy} onClick={() => openEdit(r)} title="Review the existing details and choose a lifecycle status before saving">Review to restore</button>
                        : <button style={{ ...btnSmall, background: '#111', color: '#fff' }} disabled={busy} onClick={() => cancelEvent(r)}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td style={td} colSpan={7}>{byKind.length ? 'No events match your search.' : 'No events in this filter.'}</td></tr>}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}
