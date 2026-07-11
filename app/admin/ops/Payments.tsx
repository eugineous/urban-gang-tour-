'use client';

// Payments and event money view. Per event: agreed amount, deposit ledger,
// balance and next due date. The money view compares income received against
// the latest budget grand total (recomputed from inputs, never stored) and
// against crew actually paid.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeBudget, BudgetData } from '@/lib/ops/budget-calc';
import {
  OC, card, btnMagenta, btnSmall, inp, label, h3, td, th,
  fmtKES, fmtDate, opsGet, opsPost, useEvents, FilterableEventSelect, Toast, useToast, NumInput,
  SearchBox, useSearch,
} from './ui';

export default function Payments() {
  const { events, reload: reloadEvents } = useEvents();
  const [eventId, setEventId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [agreed, setAgreed] = useState<number | null>(null);
  const [nextDue, setNextDue] = useState('');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('mpesa');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState('');
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const load = useCallback(async (id: number | null) => {
    setEventId(id);
    setDetail(null);
    if (!id) return;
    const { data } = await opsGet('event', { id });
    if (data.error) { say('Load failed: ' + data.error); return; }
    setDetail(data);
    setAgreed(data.event.agreed_amount);
    setNextDue(fmtDate(data.event.next_due_date));
  }, [say]);

  const money = useMemo(() => {
    if (!detail) return null;
    const received = (detail.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const budget = detail.latestBudget?.data ? computeBudget(detail.latestBudget.data as BudgetData) : null;
    const crewPaid = (detail.payouts || []).filter((p: any) => p.paid).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const crewPlanned = (detail.payouts || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    return { received, budget, crewPaid, crewPlanned };
  }, [detail]);

  const saveEventMoney = async () => {
    if (!detail) return;
    setBusy(true);
    const e = detail.event;
    const { data } = await opsPost('event.save', {
      id: e.id, name: e.name, school: e.school, eventDate: fmtDate(e.event_date), distanceBand: e.distance_band,
      agreedAmount: agreed, nextDueDate: nextDue || null, status: e.status,
    });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Saved');
    reloadEvents();
    load(e.id);
  };

  const addPayment = async () => {
    if (!eventId || amount <= 0) { say('Enter an amount'); return; }
    setBusy(true);
    const { data } = await opsPost('payment.record', { eventId, amount, method, reference, paidOn: paidOn || null });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Deposit recorded');
    setAmount(0); setReference(''); setPaidOn('');
    load(eventId);
  };

  const balance = agreed !== null && money ? agreed - money.received : null;
  const shownPayments = useSearch((detail?.payments || []) as any[], qy);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <h3 style={h3}>PAYMENTS AND EVENT MONEY</h3>
        <FilterableEventSelect events={events} value={eventId} onChange={load} allowNone />
      </div>

      {detail && money && (
        <>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: OC.green }}>{fmtKES(money.received)}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Income received</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: OC.magenta }}>{money.budget ? fmtKES(money.budget.grandTotal) : 'No budget'}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Latest budget grand total</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: money.crewPaid >= money.crewPlanned ? OC.green : OC.orange }}>{fmtKES(money.crewPaid)}<span style={{ fontSize: 14, color: '#888' }}> / {fmtKES(money.crewPlanned)}</span></div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Crew paid / planned</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: balance !== null && balance > 0 ? OC.orange : OC.green }}>{balance === null ? 'Set agreed' : fmtKES(balance)}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Balance vs agreed</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
            <div style={card}>
              <h3 style={h3}>AGREED TERMS</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <div><span style={label}>Agreed amount (KES)</span><NumInput value={agreed} onChange={setAgreed} min={0} /></div>
                <div><span style={label}>Next payment due</span><input style={inp} type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} /></div>
                <button style={btnMagenta} disabled={busy} onClick={saveEventMoney}>Save terms</button>
              </div>
              <div style={{ marginTop: 14 }}>
                <a style={{ ...btnSmall, textDecoration: 'none', background: '#111', color: '#fff' }} href={`/api/admin/ops/pdf?type=report&eventId=${eventId}`}>Event financial report PDF (internal)</a>
              </div>
            </div>

            <div style={card}>
              <h3 style={h3}>RECORD DEPOSIT</h3>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                <div><span style={label}>Amount (KES)</span><input style={inp} type="number" min={1} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></div>
                <div><span style={label}>Date</span><input style={inp} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
                <div><span style={label}>Method</span>
                  <select style={inp} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {['mpesa', 'bank', 'cash', 'cheque', 'other'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div><span style={label}>Reference</span><input style={inp} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="M-Pesa code" /></div>
              </div>
              <button style={{ ...btnMagenta, marginTop: 10 }} disabled={busy} onClick={addPayment}>Add deposit</button>
              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Payments against a specific invoice are recorded in the Invoices tool so receipts auto-issue.</div>
            </div>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <h3 style={{ ...h3, marginBottom: 0 }}>DEPOSITS ({(detail.payments || []).length})</h3>
              <div style={{ flex: 1 }} />
              <SearchBox value={qy} onChange={setQy} placeholder="Search deposits..." />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr>{['date', 'amount', 'method', 'reference', 'invoice', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
                <tbody>
                  {shownPayments.map((p: any) => (
                    <tr key={p.id}>
                      <td style={td}>{fmtDate(p.paid_on)}</td>
                      <td style={td}><b>{fmtKES(p.amount)}</b></td>
                      <td style={td}>{p.method}</td>
                      <td style={td}>{p.reference}</td>
                      <td style={td}>{p.invoice_id ? '#' + p.invoice_id : ''}</td>
                      <td style={td}>
                        <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={async () => {
                          if (!confirm('Delete this payment record?')) return;
                          const { data } = await opsPost('payment.delete', { id: p.id });
                          if (data.error) say('Failed: ' + data.error); else load(eventId);
                        }}>Del</button>
                      </td>
                    </tr>
                  ))}
                  {!shownPayments.length && <tr><td style={td} colSpan={6}>{(detail.payments || []).length ? 'No deposits match your search.' : 'No deposits recorded yet.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {!eventId && <div style={{ ...card, fontSize: 13, color: '#666' }}>Pick an event to manage its money. Events are created in the Budgeter or by converting a pipeline lead.</div>}
    </div>
  );
}
