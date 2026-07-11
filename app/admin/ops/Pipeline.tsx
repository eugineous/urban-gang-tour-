'use client';

// Booking pipeline: leads move through
// new -> contacted -> negotiating -> confirmed -> contracted -> completed
// (or -> lost, with a reason). Kanban-style columns that scroll horizontally
// on a phone; move buttons instead of drag and drop so it works one-handed.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3,
  Chip, fmtDate, opsGet, opsPost, Toast, useToast, waLink,
  SearchBox, useSearch,
} from './ui';

const STAGES = ['new', 'contacted', 'negotiating', 'confirmed', 'contracted', 'completed', 'lost'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<Stage, string> = {
  new: '#1565C0', contacted: '#6A1B9A', negotiating: OC.orange,
  confirmed: OC.green, contracted: OC.magenta, completed: '#111', lost: OC.red,
};

const LOST_REASONS = ['Budget too low', 'Chose another provider', 'Date clash', 'School cancelled', 'No response', 'Other'];

interface Lead {
  id: number; name: string; org: string; phone: string; email: string;
  note: string; stage: Stage; lost_reason: string; event_id: number | null; updated_at: string;
}

const EMPTY = { id: null as number | null, name: '', org: '', phone: '', email: '', note: '', stage: 'new' as Stage };

export default function Pipeline() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [losing, setLosing] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [qy, setQy] = useState('');
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet('leads');
    if (data.error) say('Load failed: ' + data.error); else setRows(data.rows || []);
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const visibleRows = useSearch(rows, qy);

  const byStage = useMemo(() => {
    const m = new Map<Stage, Lead[]>();
    STAGES.forEach((s) => m.set(s, []));
    visibleRows.forEach((r) => m.get((STAGES as readonly string[]).includes(r.stage) ? r.stage : 'new')!.push(r));
    return m;
  }, [visibleRows]);

  const toggleSelectedNew = (id: number) => setSelectedNew((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Bulk "mark contacted": loops the same lead.move POST the per-card
  // "move forward" button already uses (identical hasPerm('ops_pipeline')
  // gate, one request per lead). lead.move calls opsAudit('ops.lead.move', ...)
  // per call, so looping naturally produces one audit_log row per lead
  // moved - never a single combined row that would hide which leads
  // actually changed. Confirmed live: two separate calls show as two
  // separate ops.lead.move rows in the dashboard's Recent Activity feed.
  const bulkMarkContacted = async () => {
    const ids = (byStage.get('new') || []).filter((l) => selectedNew.has(l.id)).map((l) => l.id);
    if (!ids.length) { say('Select at least one new lead'); return; }
    setBusy(true);
    let ok = 0; let fail = 0;
    for (const id of ids) {
      const { data } = await opsPost('lead.move', { id, stage: 'contacted' });
      if (data.error) fail++; else ok++;
    }
    setBusy(false);
    setSelectedNew(new Set());
    say(fail ? `Marked ${ok} contacted, ${fail} failed` : `Marked ${ok} lead${ok === 1 ? '' : 's'} contacted`);
    reload();
  };

  const move = async (lead: Lead, dir: 1 | -1) => {
    const idx = STAGES.indexOf(lead.stage);
    const nonLost = STAGES.slice(0, STAGES.length - 1);
    const next = nonLost[Math.min(nonLost.length - 1, Math.max(0, idx + dir))];
    if (next === lead.stage) return;
    const { data } = await opsPost('lead.move', { id: lead.id, stage: next });
    if (data.error) say('Failed: ' + data.error); else reload();
  };

  const markLost = async () => {
    if (!losing) return;
    const { data } = await opsPost('lead.move', { id: losing.id, stage: 'lost', lostReason });
    if (data.error) say('Failed: ' + data.error); else { say('Marked lost'); setLosing(null); reload(); }
  };

  const convert = async (lead: Lead) => {
    if (!confirm(`Create an ops event from "${lead.org || lead.name}"?`)) return;
    const { data } = await opsPost('lead.convert', { id: lead.id });
    if (data.error) say('Failed: ' + data.error);
    else { say(data.already ? 'Already linked to an event' : 'Event created: open the Budgeter to price it'); reload(); }
  };

  const save = async () => {
    if (!edit || !edit.name.trim()) { say('Name is required'); return; }
    setBusy(true);
    const { data } = await opsPost('lead.save', edit);
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Saved');
    setEdit(null);
    reload();
  };

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT LEAD' : 'NEW LEAD'}</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div><span style={label}>Contact name *</span><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><span style={label}>School / org</span><input style={inp} value={edit.org} onChange={(e) => setEdit({ ...edit, org: e.target.value })} /></div>
          <div><span style={label}>Phone</span><input style={inp} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
          <div><span style={label}>Email</span><input style={inp} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Note</span>
          <textarea style={{ ...inp, minHeight: 70 }} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>Save lead</button>
          <button style={btnDark} onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={{ ...card, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ ...h3, marginBottom: 0 }}>BOOKING PIPELINE ({rows.length})</h3>
        <div style={{ flex: 1 }} />
        <SearchBox value={qy} onChange={setQy} placeholder="Search leads..." />
        <button style={btn} onClick={() => setEdit({ ...EMPTY })}>+ New lead</button>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
        {STAGES.map((stage) => (
          <div key={stage} style={{ ...card, minWidth: 250, width: 250, flexShrink: 0, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ width: 10, height: 10, borderRadius: 10, background: STAGE_COLORS[stage], border: '1px solid #111' }} />
              <b style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>{stage}</b>
              <span style={{ fontSize: 12, color: '#888' }}>({byStage.get(stage)!.length})</span>
              {stage === 'new' && byStage.get('new')!.length > 0 && (
                <button style={{ ...btnSmall, padding: '3px 7px', marginLeft: 'auto', background: selectedNew.size ? OC.magenta : '#fff', color: selectedNew.size ? '#fff' : '#111' }}
                  disabled={busy || !selectedNew.size} title="Mark selected new leads as contacted" onClick={bulkMarkContacted}>
                  Mark contacted ({selectedNew.size})
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {byStage.get(stage)!.map((l) => (
                <div key={l.id} style={{ border: '2px solid #111', borderRadius: 10, padding: 8, fontSize: 13, background: '#fff' }}>
                  {stage === 'new' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, color: '#666', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedNew.has(l.id)} onChange={() => toggleSelectedNew(l.id)} /> select
                    </label>
                  )}
                  <b>{l.org || l.name}</b>
                  {l.org && <div style={{ fontSize: 12, color: '#666' }}>{l.name}</div>}
                  {l.phone && <div style={{ marginTop: 2 }}><a href={waLink(l.phone)} target="_blank" rel="noopener" style={{ color: OC.green, fontWeight: 700, fontSize: 12 }}>{l.phone}</a></div>}
                  {l.note && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{l.note.slice(0, 90)}</div>}
                  {stage === 'lost' && l.lost_reason && <div style={{ marginTop: 4 }}><Chip text={l.lost_reason} bg="#FBE9E7" color={OC.red} /></div>}
                  {l.event_id && <div style={{ marginTop: 4 }}><Chip text={'event #' + l.event_id} bg="#EFE7EC" color={OC.magenta} /></div>}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                    {stage !== 'lost' && stage !== 'new' && <button style={{ ...btnSmall, padding: '3px 7px', background: '#fff' }} title="Move back" onClick={() => move(l, -1)}>&lt;</button>}
                    {stage !== 'lost' && stage !== 'completed' && <button style={{ ...btnSmall, padding: '3px 7px' }} title="Move forward" onClick={() => move(l, 1)}>&gt;</button>}
                    {(stage === 'confirmed' || stage === 'contracted') && !l.event_id && (
                      <button style={{ ...btnSmall, padding: '3px 7px', background: OC.magenta, color: '#fff' }} onClick={() => convert(l)}>To event</button>
                    )}
                    {stage !== 'lost' && stage !== 'completed' && (
                      <button style={{ ...btnSmall, padding: '3px 7px', background: '#FBE9E7', color: OC.red }} onClick={() => { setLosing(l); setLostReason(LOST_REASONS[0]); }}>Lost</button>
                    )}
                    <button style={{ ...btnSmall, padding: '3px 7px', background: '#fff' }} onClick={() => setEdit({ id: l.id, name: l.name, org: l.org, phone: l.phone, email: l.email, note: l.note, stage: l.stage })}>Edit</button>
                    <button style={{ ...btnSmall, padding: '3px 7px', background: '#111', color: '#fff' }} onClick={async () => {
                      if (!confirm('Delete this lead?')) return;
                      const { data } = await opsPost('lead.delete', { id: l.id });
                      if (data.error) say('Failed: ' + data.error); else reload();
                    }}>x</button>
                  </div>
                </div>
              ))}
              {!byStage.get(stage)!.length && <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '10px 0' }}>empty</div>}
            </div>
          </div>
        ))}
      </div>

      {losing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card, width: '100%', maxWidth: 360 }}>
            <h3 style={h3}>MARK LOST</h3>
            <div style={{ fontSize: 13, marginBottom: 10 }}>{losing.org || losing.name}: why was it lost?</div>
            <select style={inp} value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
              {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ ...btnMagenta, background: OC.red }} onClick={markLost}>Mark lost</button>
              <button style={btnDark} onClick={() => setLosing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
