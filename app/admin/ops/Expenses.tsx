'use client';

// Expenses per event with budget vs actual by category. Categories are the
// budget's own line labels (plus a few generics), so variance lines up with
// the plan. Green = at or under budget, red = over.

import { useCallback, useMemo, useState } from 'react';
import { computeBudget, BudgetData } from '@/lib/ops/budget-calc';
import {
  OC, card, btnMagenta, btnSmall, inp, label, h3, td, th,
  fmtKES, fmtDate, opsGet, opsPost, useEvents, EventSelect, Toast, useToast, TbdBadge,
} from './ui';

const GENERIC_CATEGORIES = ['Sound', 'Stage', 'Crew transport', 'Food and water', 'General'];

export default function Expenses() {
  const { events } = useEvents();
  const [eventId, setEventId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [labelTxt, setLabelTxt] = useState('');
  const [category, setCategory] = useState('General');
  const [amount, setAmount] = useState(0);
  const [spentOn, setSpentOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const load = useCallback(async (id: number | null) => {
    setEventId(id);
    setDetail(null);
    if (!id) return;
    const { data } = await opsGet('event', { id });
    if (data.error) say('Load failed: ' + data.error); else setDetail(data);
  }, [say]);

  const budget = useMemo(() => (detail?.latestBudget?.data ? computeBudget(detail.latestBudget.data as BudgetData) : null), [detail]);
  const expenses: any[] = detail?.expenses || [];

  // Budget reference per category: match a category to a budget cost line by
  // (case-insensitive) label. Unmatched categories compare against nothing.
  const categories = useMemo(() => {
    const budgetLabels = budget ? budget.costLines.map((l) => l.label) : [];
    return Array.from(new Set([...budgetLabels, ...GENERIC_CATEGORIES]));
  }, [budget]);

  const variance = useMemo(() => {
    const actualByCat = new Map<string, number>();
    for (const e of expenses) {
      const k = (e.category || 'General').toLowerCase();
      actualByCat.set(k, (actualByCat.get(k) || 0) + Number(e.amount || 0));
    }
    const rows: Array<{ cat: string; budget: number | null; actual: number }> = [];
    const seen = new Set<string>();
    if (budget) {
      for (const l of budget.costLines) {
        const k = l.label.toLowerCase();
        seen.add(k);
        rows.push({ cat: l.label, budget: l.tbd ? null : l.amount, actual: actualByCat.get(k) || 0 });
      }
    }
    for (const [k, v] of actualByCat.entries()) {
      if (!seen.has(k)) rows.push({ cat: expenses.find((e) => (e.category || 'General').toLowerCase() === k)?.category || k, budget: null, actual: v });
    }
    return rows.filter((r) => r.actual > 0 || r.budget !== null);
  }, [expenses, budget]);

  const totalActual = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const add = async () => {
    if (!eventId || !labelTxt.trim()) { say('What was the money spent on?'); return; }
    setBusy(true);
    const { data } = await opsPost('expense.save', { eventId, label: labelTxt, category, amount, spentOn: spentOn || null });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    setLabelTxt(''); setAmount(0); setSpentOn('');
    load(eventId);
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <h3 style={h3}>EVENT EXPENSES</h3>
        <EventSelect events={events} value={eventId} onChange={load} allowNone />
      </div>

      {detail && (
        <>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24 }}>{fmtKES(totalActual)}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Spent so far</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: OC.magenta }}>{budget ? fmtKES(budget.productionCost) : 'No budget'}</div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Budget production cost</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 24, color: budget && totalActual > budget.productionCost ? OC.red : OC.green }}>
                {budget ? fmtKES(budget.productionCost - totalActual) : 'n/a'}
              </div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Remaining vs budget</div>
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>ADD EXPENSE</h3>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div><span style={label}>Item *</span><input style={inp} value={labelTxt} onChange={(e) => setLabelTxt(e.target.value)} placeholder="e.g. 20 bags of colour powder" /></div>
              <div><span style={label}>Category</span>
                <select style={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><span style={label}>Amount (KES)</span><input style={inp} type="number" min={0} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></div>
              <div><span style={label}>Date</span><input style={inp} type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} /></div>
            </div>
            <button style={{ ...btnMagenta, marginTop: 10 }} disabled={busy} onClick={add}>Record expense</button>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
            <div style={card}>
              <h3 style={h3}>BUDGET VS ACTUAL BY CATEGORY</h3>
              {!budget && <div style={{ fontSize: 13, color: '#666' }}>Save a budget in the Budgeter to compare against a plan.</div>}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr>{['category', 'budget', 'actual', 'variance'].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
                  <tbody>
                    {variance.map((v) => {
                      const diff = v.budget === null ? null : v.budget - v.actual;
                      return (
                        <tr key={v.cat}>
                          <td style={td}>{v.cat}</td>
                          <td style={td}>{v.budget === null ? <TbdBadge /> : fmtKES(v.budget)}</td>
                          <td style={td}>{fmtKES(v.actual)}</td>
                          <td style={{ ...td, fontWeight: 800, color: diff === null ? '#888' : diff >= 0 ? OC.green : OC.red }}>
                            {diff === null ? 'no plan' : (diff >= 0 ? 'under by ' : 'OVER by ') + fmtKES(Math.abs(diff))}
                          </td>
                        </tr>
                      );
                    })}
                    {!variance.length && <tr><td style={td} colSpan={4}>Nothing to compare yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={card}>
              <h3 style={h3}>EXPENSE LOG ({expenses.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr>{['date', 'item', 'category', 'amount', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td style={td}>{fmtDate(e.spent_on)}</td>
                        <td style={td}>{e.label}</td>
                        <td style={td}>{e.category}</td>
                        <td style={td}><b>{fmtKES(e.amount)}</b></td>
                        <td style={td}>
                          <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={async () => {
                            if (!confirm('Delete this expense?')) return;
                            const { data } = await opsPost('expense.delete', { id: e.id });
                            if (data.error) say('Failed: ' + data.error); else load(eventId);
                          }}>Del</button>
                        </td>
                      </tr>
                    ))}
                    {!expenses.length && <tr><td style={td} colSpan={5}>No expenses recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
      {!eventId && <div style={{ ...card, fontSize: 13, color: '#666' }}>Pick an event to track what was actually spent against its budget.</div>}
    </div>
  );
}
