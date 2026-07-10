'use client';

// Crew payouts per event: name / phone / role / rate rows, mark paid with a
// date stamp, running totals compared against the crew line of the latest
// budget (recomputed live), CSV export for records.

import { useCallback, useMemo, useState } from 'react';
import { computeBudget, BudgetData } from '@/lib/ops/budget-calc';
import {
  OC, card, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, fmtKES, fmtDate, opsGet, opsPost, useEvents, EventSelect, Toast, useToast, waLink, downloadCSV,
} from './ui';

export default function Payouts() {
  const { events } = useEvents();
  const [eventId, setEventId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [person, setPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const load = useCallback(async (id: number | null) => {
    setEventId(id);
    setDetail(null);
    if (!id) return;
    const { data } = await opsGet('event', { id });
    if (data.error) say('Load failed: ' + data.error); else setDetail(data);
  }, [say]);

  const payouts: any[] = detail?.payouts || [];
  const totals = useMemo(() => {
    const planned = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    const paid = payouts.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount || 0), 0);
    const budget = detail?.latestBudget?.data ? computeBudget(detail.latestBudget.data as BudgetData) : null;
    return { planned, paid, budgetCrew: budget ? budget.crewPay : null };
  }, [payouts, detail]);

  const add = async () => {
    if (!eventId || !person.trim()) { say('Name is required'); return; }
    setBusy(true);
    const { data } = await opsPost('payout.save', { eventId, person, phone, role, amount });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    setPerson(''); setPhone(''); setRole(''); setAmount(0);
    load(eventId);
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <h3 style={h3}>CREW PAYOUTS</h3>
        <EventSelect events={events} value={eventId} onChange={load} allowNone />
      </div>

      {detail && (
        <>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24 }}>{fmtKES(totals.planned)}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Planned payouts</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: OC.green }}>{fmtKES(totals.paid)}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Paid out</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: totals.budgetCrew !== null && totals.planned > totals.budgetCrew ? OC.red : OC.magenta }}>
                {totals.budgetCrew === null ? 'No budget' : fmtKES(totals.budgetCrew)}
              </div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Budget crew line</div>
              {totals.budgetCrew !== null && totals.planned > totals.budgetCrew && (
                <div style={{ fontSize: 11, color: OC.red, fontWeight: 700, marginTop: 4 }}>Planned exceeds budget by {fmtKES(totals.planned - totals.budgetCrew)}</div>
              )}
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>ADD CREW MEMBER</h3>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <div><span style={label}>Name *</span><input style={inp} value={person} onChange={(e) => setPerson(e.target.value)} /></div>
              <div><span style={label}>Phone</span><input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><span style={label}>Role</span><input style={inp} value={role} onChange={(e) => setRole(e.target.value)} placeholder="MC / dancer / logistics" /></div>
              <div><span style={label}>Rate (KES)</span><input style={inp} type="number" min={0} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></div>
            </div>
            <button style={{ ...btnMagenta, marginTop: 10 }} disabled={busy} onClick={add}>Add to payout list</button>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
              <h3 style={{ ...h3, marginBottom: 0 }}>PAYOUT LIST ({payouts.length})</h3>
              <div style={{ flex: 1 }} />
              <button style={btnSmall} onClick={() => downloadCSV(
                `crew-payouts-event-${eventId}.csv`,
                payouts.map((p) => ({ person: p.person, phone: p.phone, role: p.role, amount: p.amount, status: p.paid ? 'paid' : 'pending', paid_on: fmtDate(p.paid_on) })),
                ['person', 'phone', 'role', 'amount', 'status', 'paid_on'],
              )}>Export CSV</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr>{['name', 'phone', 'role', 'rate', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td style={td}><b>{p.person}</b></td>
                      <td style={td}>{p.phone ? <a href={waLink(p.phone)} target="_blank" rel="noopener" style={{ color: OC.green, fontWeight: 700 }}>{p.phone}</a> : ''}</td>
                      <td style={td}>{p.role}</td>
                      <td style={td}><b>{fmtKES(p.amount)}</b></td>
                      <td style={td}>
                        {p.paid ? <Chip text={'paid ' + fmtDate(p.paid_on)} bg="#E7F5EE" color={OC.green} /> : <Chip text="pending" bg="#FDF2D9" color={OC.orange} />}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <button style={{ ...btnSmall, background: p.paid ? '#fff' : OC.green, color: p.paid ? '#111' : '#fff' }} onClick={async () => {
                            const { data } = await opsPost('payout.togglePaid', { id: p.id });
                            if (data.error) say('Failed: ' + data.error); else load(eventId);
                          }}>{p.paid ? 'Mark pending' : 'Mark paid'}</button>
                          <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={async () => {
                            if (!confirm(`Remove ${p.person} from the payout list?`)) return;
                            const { data } = await opsPost('payout.delete', { id: p.id });
                            if (data.error) say('Failed: ' + data.error); else load(eventId);
                          }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!payouts.length && <tr><td style={td} colSpan={6}>No crew rows yet for this event.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {!eventId && <div style={{ ...card, fontSize: 13, color: '#666' }}>Pick an event to manage its crew payout list.</div>}
    </div>
  );
}
