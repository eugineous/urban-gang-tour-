'use client';

// Event Budgeter: every figure is recomputed from inputs on every keystroke
// via lib/ops/budget-calc (no AI, no stored totals). Saving creates a new
// immutable version; any version can be reloaded; the internal PDF renders
// from the saved version so paper always matches the database.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BudgetData, computeBudget, emptyBudget, newLineId,
  SOUND_DEFAULTS, STAGE_DEFAULTS, CREW_TRANSPORT_BY_BAND, CREW_RATE_OPTIONS,
  FLOOR_REFERENCES, PER_STUDENT_BAND, DistanceBand, SoundMode, StageOption,
} from '@/lib/ops/budget-calc';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, TbdBadge, NumInput, fmtKES, fmtDate, opsGet, opsPost, useEvents, EventSelect, Toast, useToast,
} from './ui';

export default function Budgeter() {
  const { events, reload: reloadEvents } = useEvents();
  const [eventId, setEventId] = useState<number | null>(null);
  const [b, setB] = useState<BudgetData>(() => emptyBudget());
  const [versions, setVersions] = useState<Array<{ id: number; version: number; created_at: string }>>([]);
  const [loadedVersion, setLoadedVersion] = useState<{ id: number; version: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const r = useMemo(() => computeBudget(b), [b]);
  const set = useCallback(<K extends keyof BudgetData>(k: K, v: BudgetData[K]) => setB((prev) => ({ ...prev, [k]: v })), []);

  const loadEvent = useCallback(async (id: number | null) => {
    setEventId(id);
    setLoadedVersion(null);
    if (id === null) { setB(emptyBudget()); setVersions([]); return; }
    const { data } = await opsGet('event', { id });
    if (data.error) { say('Load failed: ' + data.error); return; }
    setVersions(data.budgets || []);
    if (data.latestBudget?.data) {
      setB(data.latestBudget.data as BudgetData);
      setLoadedVersion({ id: data.latestBudget.id, version: data.latestBudget.version });
    } else {
      const e = data.event;
      setB({ ...emptyBudget(), eventName: e.name || '', school: e.school || '', eventDate: fmtDate(e.event_date), distanceBand: (e.distance_band || 'near') as DistanceBand });
    }
  }, [say]);

  const loadVersion = useCallback(async (budgetId: number) => {
    const { data } = await opsGet('budget', { id: budgetId });
    if (data.error) { say('Load failed: ' + data.error); return; }
    setB(data.row.data as BudgetData);
    setLoadedVersion({ id: data.row.id, version: data.row.version });
    say('Loaded version ' + data.row.version);
  }, [say]);

  const saveVersion = useCallback(async () => {
    if (!b.eventName.trim()) { say('Give the event a name first'); return; }
    setBusy(true);
    const { data } = await opsPost('budget.save', { eventId, data: b });
    setBusy(false);
    if (data.error) { say('Save failed: ' + data.error); return; }
    say('Saved version ' + data.row.version);
    setLoadedVersion({ id: data.row.id, version: data.row.version });
    setEventId(data.eventId);
    const vs = await opsGet('budgets', { eventId: data.eventId });
    if (!vs.data.error) setVersions(vs.data.rows || []);
    reloadEvents();
  }, [b, eventId, say, reloadEvents]);

  const setDistance = (band: DistanceBand) => {
    setB((prev) => ({
      ...prev,
      distanceBand: band,
      lines: prev.lines.map((ln) => (ln.kind === 'default' && ln.label === 'Crew transport' ? { ...ln, amount: CREW_TRANSPORT_BY_BAND[band] } : ln)),
    }));
  };
  const setSound = (mode: SoundMode) => setB((prev) => ({ ...prev, soundMode: mode, soundCost: SOUND_DEFAULTS[mode] }));
  const setStage = (opt: StageOption) => setB((prev) => ({ ...prev, stageOption: opt, stageCost: STAGE_DEFAULTS[opt] }));

  const setLine = (id: string, patch: Partial<{ label: string; amount: number | null }>) =>
    setB((prev) => ({ ...prev, lines: prev.lines.map((ln) => (ln.id === id ? { ...ln, ...patch } : ln)) }));
  const removeLine = (id: string) => setB((prev) => ({ ...prev, lines: prev.lines.filter((ln) => ln.id !== id) }));
  const addLine = () => setB((prev) => ({ ...prev, lines: [...prev.lines, { id: newLineId(), label: '', amount: null, kind: 'custom' as const }] }));

  const [customRateOn, setCustomRateOn] = useState(false);
  // Loading an old version with a non-preset rate must land on "Custom".
  const customRate = customRateOn || !CREW_RATE_OPTIONS.includes(b.crewRate);

  const profitColor = r.profitTone === 'green' ? OC.green : r.profitTone === 'orange' ? OC.orange : OC.red;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />

      <div style={card}>
        <h3 style={h3}>EVENT BUDGETER</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <span style={label}>Event</span>
            <EventSelect events={events} value={eventId} onChange={loadEvent} allowNone noneLabel="+ New event (start blank)" />
          </div>
          <div>
            <span style={label}>Event name</span>
            <input style={inp} value={b.eventName} onChange={(e) => set('eventName', e.target.value)} placeholder="e.g. Lari Boys Colour Fest" />
          </div>
          <div>
            <span style={label}>School</span>
            <input style={inp} value={b.school} onChange={(e) => set('school', e.target.value)} placeholder="School / institution" />
          </div>
          <div>
            <span style={label}>Event date</span>
            <input style={inp} type="date" value={b.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
          </div>
          <div>
            <span style={label}>Distance band</span>
            <select style={inp} value={b.distanceBand} onChange={(e) => setDistance(e.target.value as DistanceBand)}>
              <option value="near">Near (transport {fmtKES(CREW_TRANSPORT_BY_BAND.near)})</option>
              <option value="mid">Mid (transport {fmtKES(CREW_TRANSPORT_BY_BAND.mid)})</option>
              <option value="far">Far (transport {fmtKES(CREW_TRANSPORT_BY_BAND.far)})</option>
            </select>
          </div>
          <div>
            <span style={label}>Expected income (KES)</span>
            <NumInput value={b.expectedIncome} onChange={(v) => set('expectedIncome', v)} min={0} />
          </div>
          <div>
            <span style={label}>Student count</span>
            <NumInput value={b.studentCount} onChange={(v) => set('studentCount', v)} min={0} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          <span style={{ ...label, margin: 0 }}>Reference floors (display only):</span>
          {FLOOR_REFERENCES.map(([name, amt]) => <Chip key={name} text={`${name}: ${fmtKES(amt)}`} bg="#EFE7EC" color={OC.magenta} />)}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        {/* -------- inputs column -------- */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={card}>
            <h3 style={h3}>SOUND AND STAGE</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <span style={label}>Sound mode</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={{ ...btnSmall, background: b.soundMode === 'partner_favour' ? OC.magenta : '#fff', color: b.soundMode === 'partner_favour' ? '#fff' : '#111' }} onClick={() => setSound('partner_favour')}>Partner favour (transport {fmtKES(SOUND_DEFAULTS.partner_favour)})</button>
                  <button style={{ ...btnSmall, background: b.soundMode === 'full_pa' ? OC.magenta : '#fff', color: b.soundMode === 'full_pa' ? '#fff' : '#111' }} onClick={() => setSound('full_pa')}>Full PA ({fmtKES(SOUND_DEFAULTS.full_pa)})</button>
                </div>
              </div>
              <div>
                <span style={label}>Sound cost (KES)</span>
                <NumInput value={b.soundCost} onChange={(v) => set('soundCost', v)} min={0} />
                {b.soundMode === 'partner_favour' && r.partnerSaving > 0 && (
                  <div style={{ fontSize: 12, color: OC.green, fontWeight: 700, marginTop: 4 }}>Partner sound saving: {fmtKES(r.partnerSaving)}</div>
                )}
              </div>
              <div>
                <span style={label}>Stage</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={{ ...btnSmall, background: b.stageOption === 'canopy' ? OC.magenta : '#fff', color: b.stageOption === 'canopy' ? '#fff' : '#111' }} onClick={() => setStage('canopy')}>With canopy ({fmtKES(STAGE_DEFAULTS.canopy)})</button>
                  <button style={{ ...btnSmall, background: b.stageOption === 'no_canopy' ? OC.magenta : '#fff', color: b.stageOption === 'no_canopy' ? '#fff' : '#111' }} onClick={() => setStage('no_canopy')}>No canopy ({fmtKES(STAGE_DEFAULTS.no_canopy)})</button>
                </div>
              </div>
              <div>
                <span style={label}>Stage cost (KES)</span>
                <NumInput value={b.stageCost} onChange={(v) => set('stageCost', v)} min={0} />
              </div>
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>PRODUCTION LINES</h3>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Empty amount = TBD: shown with a badge and EXCLUDED from totals.</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {b.lines.map((ln) => (
                <div key={ln.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input style={{ ...inp, flex: 2 }} value={ln.label} placeholder="Line item" onChange={(e) => setLine(ln.id, { label: e.target.value })} />
                  <NumInput style={{ flex: 1, maxWidth: 130 }} value={ln.amount} onChange={(v) => setLine(ln.id, { amount: v })} min={0} />
                  {ln.amount === null && <TbdBadge />}
                  <button style={{ ...btnSmall, background: '#fff' }} title="Remove line" onClick={() => removeLine(ln.id)}>x</button>
                </div>
              ))}
            </div>
            <button style={{ ...btnSmall, marginTop: 10 }} onClick={addLine}>+ Add custom line</button>
          </div>

          <div style={card}>
            <h3 style={h3}>CREW, TEACHER, CONTINGENCY</h3>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <div>
                <span style={label}>Crew count (per event)</span>
                <input style={inp} type="number" inputMode="numeric" min={0} value={b.crewCount} onChange={(e) => set('crewCount', Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
              </div>
              <div>
                <span style={label}>Rate per crew (KES)</span>
                <select style={inp} value={customRate ? 'custom' : String(b.crewRate)} onChange={(e) => {
                  if (e.target.value === 'custom') { setCustomRateOn(true); return; }
                  setCustomRateOn(false);
                  set('crewRate', Number(e.target.value));
                }}>
                  {CREW_RATE_OPTIONS.map((o) => <option key={o} value={o}>{o.toLocaleString()}</option>)}
                  <option value="custom">Custom</option>
                </select>
                {customRate && (
                  <input style={{ ...inp, marginTop: 6 }} type="number" inputMode="numeric" min={0} value={b.crewRate} onChange={(e) => set('crewRate', Math.max(0, Number(e.target.value) || 0))} />
                )}
              </div>
              <div>
                <span style={label}>Teacher percent (of income)</span>
                <input style={inp} type="number" inputMode="decimal" min={0} max={100} step={0.5} value={b.teacherPct} onChange={(e) => set('teacherPct', Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div>
                <span style={label}>Contingency percent (5 to 10)</span>
                <input style={inp} type="number" inputMode="decimal" min={5} max={10} step={0.5} value={b.contingencyPct} onChange={(e) => set('contingencyPct', Number(e.target.value) || 7.5)} />
                <input type="range" min={5} max={10} step={0.5} value={Math.min(10, Math.max(5, b.contingencyPct))} onChange={(e) => set('contingencyPct', Number(e.target.value))} style={{ width: '100%', marginTop: 6, accentColor: OC.magenta }} />
              </div>
            </div>
          </div>
        </div>

        {/* -------- live results column -------- */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ ...card, borderColor: OC.magenta, boxShadow: `5px 5px 0 ${OC.magenta}` }}>
            <h3 style={h3}>LIVE NUMBERS</h3>
            {r.tbdCount > 0 && (
              <div style={{ background: '#FDF2D9', border: `2px solid ${OC.orange}`, borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 700, color: OC.orange, marginBottom: 10 }}>
                {r.tbdCount} line{r.tbdCount > 1 ? 's are' : ' is'} TBD and excluded from every total below.
              </div>
            )}
            {[
              ['Production cost', fmtKES(r.productionCost)],
              [`Crew total (${b.crewCount} x ${b.crewRate.toLocaleString()})`, fmtKES(r.crewPay)],
              [`Teacher cut (${r.teacherPct}%)`, fmtKES(r.teacherCut)],
              [`Contingency (${r.contingencyPct}%)`, fmtKES(r.contingency)],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
                <span style={{ color: '#555' }}>{l}</span><b>{v}</b>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: 17 }}>
              <b>GRAND TOTAL</b><b style={{ color: OC.magenta }}>{fmtKES(r.grandTotal)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 15 }}>
              <span style={{ color: '#555' }}>Expected income</span><b>{fmtKES(r.income)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 10, background: r.profitTone === 'green' ? '#E7F5EE' : r.profitTone === 'orange' ? '#FDF2D9' : '#FBE9E7', marginTop: 4, fontSize: 16 }}>
              <b style={{ color: profitColor }}>{r.profit >= 0 ? 'PROFIT' : 'LOSS'}</b>
              <b style={{ color: profitColor }}>{fmtKES(r.profit)}</b>
            </div>
            {r.crewFundingShortfall && (
              <div style={{ background: OC.red, color: '#fff', borderRadius: 10, padding: '10px 12px', fontWeight: 800, fontSize: 13, marginTop: 10 }}>
                This deal cannot fund crew pay at this rate. Short by {fmtKES(Math.abs(r.crewFundingHeadroom))}.
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: '#555' }}>Per student:</span>
              {r.perStudent === null ? <TbdBadge /> : (
                <>
                  <b style={{ color: r.perStudent >= PER_STUDENT_BAND[0] && r.perStudent <= PER_STUDENT_BAND[1] ? OC.green : OC.orange }}>{fmtKES(r.perStudent)}</b>
                  <Chip text={`reference band ${PER_STUDENT_BAND[0]} to ${PER_STUDENT_BAND[1]}`} bg="#EFE7EC" color={OC.magenta} />
                </>
              )}
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>SAVE AND EXPORT</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btnMagenta} disabled={busy} onClick={saveVersion}>Save as new version</button>
              {loadedVersion ? (
                <a style={{ ...btnDark, textDecoration: 'none' }} href={`/api/admin/ops/pdf?type=budget&id=${loadedVersion.id}`}>Internal budget PDF (v{loadedVersion.version})</a>
              ) : (
                <button style={{ ...btnDark, opacity: 0.5, cursor: 'not-allowed' }} title="Save a version first">Internal budget PDF</button>
              )}
            </div>
            {loadedVersion && <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Currently loaded: version {loadedVersion.version}. Saving creates version {(versions[0]?.version || 0) + 1}.</div>}
            {versions.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr><th style={th}>Version</th><th style={th}>Saved</th><th style={th}>Actions</th></tr></thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={v.id}>
                        <td style={td}>v{v.version}{loadedVersion?.id === v.id ? ' (loaded)' : ''}</td>
                        <td style={td}>{fmtDate(v.created_at)}</td>
                        <td style={td}>
                          <button style={btnSmall} onClick={() => loadVersion(v.id)}>Load</button>{' '}
                          <a style={{ ...btnSmall, textDecoration: 'none', background: '#fff' }} href={`/api/admin/ops/pdf?type=budget&id=${v.id}`}>PDF</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
