'use client';

// Quotes, invoices and receipts. Numbers are gapless (UGT-Q/INV/RCT-YYYY-NNN,
// issued server-side inside a transaction). Status chips are computed at
// render time: overdue = due date passed with a balance. Recording a payment
// that clears the balance auto-issues a receipt on the server.
// "From budget" pulls ONLY the package description + grand total: no internal
// cost data ever reaches an outbound document.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DocLine, docTotals, effectiveDocStatus, computeBudget, BudgetData } from '@/lib/ops/budget-calc';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, fmtKES, fmtDate, opsGet, opsPost, useEvents, EventSelect, Toast, useToast, waLink,
} from './ui';

interface DocRow {
  id: number;
  doc_type: string;
  doc_number: string;
  event_id: number | null;
  event_name?: string;
  bill_to: any;
  lines: DocLine[];
  payment_terms: string;
  due_date: string | null;
  pay_details: string;
  notes: string;
  status: string;
  created_at: string;
  paid: number;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#eee', fg: '#555' },
  sent: { bg: '#E3F2FD', fg: '#1565C0' },
  'part-paid': { bg: '#FDF2D9', fg: OC.orange },
  paid: { bg: '#E7F5EE', fg: OC.green },
  overdue: { bg: '#FBE9E7', fg: OC.red },
  issued: { bg: '#E7F5EE', fg: OC.green },
  accepted: { bg: '#E7F5EE', fg: OC.green },
  declined: { bg: '#FBE9E7', fg: OC.red },
};

function parse<T>(v: unknown, fallback: T): T {
  if (typeof v === 'string') { try { return JSON.parse(v) as T; } catch { return fallback; } }
  return (v as T) ?? fallback;
}

interface EditState {
  id: number | null;
  docType: 'quote' | 'invoice';
  eventId: number | null;
  sourceBudgetId: number | null;
  billToName: string; billToOrg: string; billToPhone: string; billToEmail: string; billToAddress: string;
  lines: DocLine[];
  paymentTerms: string; dueDate: string; payDetails: string; notes: string;
}

const EMPTY_EDIT: EditState = {
  id: null, docType: 'invoice', eventId: null, sourceBudgetId: null,
  billToName: '', billToOrg: '', billToPhone: '', billToEmail: '', billToAddress: '',
  lines: [{ label: '', qty: 1, amount: 0 }],
  paymentTerms: '50% deposit to confirm the date, balance due on or before event day.',
  dueDate: '', payDetails: 'M-Pesa Paybill / phone: ask admin@urbangangtour.co.ke for current details.', notes: '',
};

export default function Invoices() {
  const { events } = useEvents();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'quote' | 'invoice' | 'receipt'>('all');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [payFor, setPayFor] = useState<DocRow | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('mpesa');
  const [payRef, setPayRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet('documents');
    if (data.error) { say('Load failed: ' + data.error); return; }
    setRows((data.rows || []).map((r: any) => ({ ...r, lines: parse<DocLine[]>(r.lines, []), bill_to: parse(r.bill_to, {}), paid: Number(r.paid || 0) })));
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const withStatus = useMemo(() => rows.map((r) => ({
    ...r,
    liveStatus: effectiveDocStatus(r.status, r.doc_type, r.lines, r.paid, r.due_date),
    total: docTotals(r.lines).total,
  })), [rows]);

  const invoices = withStatus.filter((r) => r.doc_type === 'invoice');
  const outstanding = invoices.filter((r) => r.liveStatus !== 'draft').reduce((s, r) => s + Math.max(0, r.total - r.paid), 0);
  const overdueCount = invoices.filter((r) => r.liveStatus === 'overdue').length;
  const shown = withStatus.filter((r) => filter === 'all' || r.doc_type === filter);

  const startFromBudget = async (eventId: number | null) => {
    if (!eventId) { say('Pick an event first'); return; }
    const { data } = await opsGet('event', { id: eventId });
    if (data.error || !data.latestBudget) { say(data.error ? 'Load failed: ' + data.error : 'That event has no saved budget yet'); return; }
    const bd = data.latestBudget.data as BudgetData;
    const total = computeBudget(bd).grandTotal;
    // ONLY the package description and the grand total cross over. Internal
    // lines (crew pay, teacher cut, margins) stay in the budget sheet.
    setEdit({
      ...EMPTY_EDIT,
      eventId,
      sourceBudgetId: data.latestBudget.id,
      billToOrg: bd.school || data.event?.school || '',
      lines: [{ label: `Urban Gang Tour event package: ${bd.eventName || data.event?.name || 'event'}${bd.eventDate ? ' on ' + bd.eventDate : ''}`, qty: 1, amount: total }],
      dueDate: bd.eventDate || '',
    });
  };

  const saveDoc = async () => {
    if (!edit) return;
    if (!edit.lines.length || !edit.lines.some((l) => l.label.trim())) { say('Add at least one line item'); return; }
    setBusy(true);
    const payload = { ...edit, dueDate: edit.dueDate || null };
    const { data } = edit.id
      ? await opsPost('doc.update', payload)
      : await opsPost('doc.create', payload);
    setBusy(false);
    if (data.error) { say('Save failed: ' + data.error); return; }
    say(edit.id ? 'Document updated' : `Created ${data.row.doc_number}`);
    setEdit(null);
    reload();
  };

  const setStatus = async (id: number, status: string) => {
    const { data } = await opsPost('doc.status', { id, status });
    if (data.error) say('Failed: ' + data.error); else reload();
  };

  const recordPayment = async () => {
    if (!payFor || payAmount <= 0) { say('Enter a payment amount'); return; }
    setBusy(true);
    const { data } = await opsPost('payment.record', { invoiceId: payFor.id, eventId: payFor.event_id, amount: payAmount, method: payMethod, reference: payRef });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say(data.receipt ? `Paid in full. Receipt ${data.receipt.doc_number} created.` : 'Payment recorded (part-paid).');
    setPayFor(null); setPayAmount(0); setPayRef('');
    reload();
  };

  const whatsappText = (r: DocRow & { total: number; liveStatus: string }) => {
    const balance = r.total - r.paid;
    return `Hello ${r.bill_to?.name || r.bill_to?.org || ''}, this is Urban Gang Tour. ${r.doc_type === 'quote' ? 'Quotation' : 'Invoice'} ${r.doc_number} for ${fmtKES(r.total)}${r.doc_type === 'invoice' && r.paid > 0 ? ` (balance ${fmtKES(balance)})` : ''}${r.due_date ? ', due ' + fmtDate(r.due_date) : ''}. Reply here or call us to confirm. Thank you.`;
  };

  const copyWA = async (r: any) => {
    try { await navigator.clipboard.writeText(whatsappText(r)); say('WhatsApp text copied'); }
    catch { say('Copy failed: select and copy manually'); }
  };

  if (edit) {
    const totals = docTotals(edit.lines);
    const setL = (i: number, patch: Partial<DocLine>) => setEdit({ ...edit, lines: edit.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <Toast msg={toast} />
        <div style={card}>
          <h3 style={h3}>{edit.id ? 'EDIT DOCUMENT' : 'NEW ' + edit.docType.toUpperCase()}</h3>
          {!edit.id && (
            <div style={{ marginBottom: 10 }}>
              <span style={label}>Type</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['invoice', 'quote'] as const).map((t) => (
                  <button key={t} style={{ ...btnSmall, background: edit.docType === t ? OC.magenta : '#fff', color: edit.docType === t ? '#fff' : '#111' }} onClick={() => setEdit({ ...edit, docType: t })}>{t}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div><span style={label}>Linked event (optional)</span><EventSelect events={events} value={edit.eventId} onChange={(id) => setEdit({ ...edit, eventId: id })} allowNone noneLabel="- none -" /></div>
            <div><span style={label}>Bill to: name</span><input style={inp} value={edit.billToName} onChange={(e) => setEdit({ ...edit, billToName: e.target.value })} /></div>
            <div><span style={label}>Bill to: school / org</span><input style={inp} value={edit.billToOrg} onChange={(e) => setEdit({ ...edit, billToOrg: e.target.value })} /></div>
            <div><span style={label}>Bill to: phone</span><input style={inp} value={edit.billToPhone} onChange={(e) => setEdit({ ...edit, billToPhone: e.target.value })} /></div>
            <div><span style={label}>Bill to: email</span><input style={inp} value={edit.billToEmail} onChange={(e) => setEdit({ ...edit, billToEmail: e.target.value })} /></div>
            <div><span style={label}>Bill to: address</span><input style={inp} value={edit.billToAddress} onChange={(e) => setEdit({ ...edit, billToAddress: e.target.value })} /></div>
            <div><span style={label}>Due date</span><input style={inp} type="date" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={label}>Line items</span>
            <div style={{ display: 'grid', gap: 8 }}>
              {edit.lines.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input style={{ ...inp, flex: 3, minWidth: 160 }} placeholder="Description" value={l.label} onChange={(e) => setL(i, { label: e.target.value })} />
                  <input style={{ ...inp, width: 70 }} type="number" min={0} title="Qty" value={l.qty} onChange={(e) => setL(i, { qty: Math.max(0, Number(e.target.value) || 0) })} />
                  <input style={{ ...inp, width: 120 }} type="number" min={0} title="Unit amount KES" value={l.amount} onChange={(e) => setL(i, { amount: Number(e.target.value) || 0 })} />
                  <b style={{ minWidth: 90, fontSize: 13 }}>{fmtKES(l.qty * l.amount)}</b>
                  <button style={{ ...btnSmall, background: '#fff' }} onClick={() => setEdit({ ...edit, lines: edit.lines.filter((_, j) => j !== i) })}>x</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={btnSmall} onClick={() => setEdit({ ...edit, lines: [...edit.lines, { label: '', qty: 1, amount: 0 }] })}>+ Add line</button>
              <div style={{ flex: 1 }} />
              <b style={{ fontSize: 16 }}>Total: <span style={{ color: OC.magenta }}>{fmtKES(totals.total)}</span></b>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <div><span style={label}>Terms</span><textarea style={{ ...inp, minHeight: 60 }} value={edit.paymentTerms} onChange={(e) => setEdit({ ...edit, paymentTerms: e.target.value })} /></div>
            <div><span style={label}>Payment details (shown on PDF)</span><textarea style={{ ...inp, minHeight: 60 }} value={edit.payDetails} onChange={(e) => setEdit({ ...edit, payDetails: e.target.value })} /></div>
            <div><span style={label}>Notes</span><textarea style={{ ...inp, minHeight: 50 }} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={btnMagenta} disabled={busy} onClick={saveDoc}>{edit.id ? 'Save changes' : 'Create ' + edit.docType}</button>
            <button style={btnDark} onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: outstanding > 0 ? OC.orange : OC.green }}>{fmtKES(outstanding)}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Outstanding on invoices</div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 26, color: overdueCount ? OC.red : OC.green }}>{overdueCount}</div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Overdue invoices</div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>DOCUMENTS</h3>
          <div style={{ flex: 1 }} />
          <select style={{ ...inp, width: 130 }} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All types</option><option value="quote">Quotes</option><option value="invoice">Invoices</option><option value="receipt">Receipts</option>
          </select>
          <button style={btn} onClick={() => setEdit({ ...EMPTY_EDIT })}>+ New</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
          <span style={{ fontWeight: 700 }}>From budget:</span>
          <div style={{ minWidth: 220 }}><EventSelect events={events.filter((e) => e.latest_budget_version)} value={null} onChange={(id) => startFromBudget(id)} allowNone noneLabel="- pick event with a saved budget -" /></div>
          <span style={{ color: '#666' }}>pulls only the package description + total (never internal costs)</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{['number', 'event', 'bill to', 'total', 'paid', 'status', 'actions'].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {shown.map((r) => {
                const sc = STATUS_COLORS[r.liveStatus] || STATUS_COLORS.draft;
                const balance = r.total - r.paid;
                return (
                  <tr key={r.id}>
                    <td style={td}><b>{r.doc_number}</b><div style={{ fontSize: 11, color: '#888' }}>{fmtDate(r.created_at)}</div></td>
                    <td style={td}>{r.event_name || ''}</td>
                    <td style={td}>{r.bill_to?.name || ''}{r.bill_to?.org ? <div style={{ fontSize: 11, color: '#888' }}>{r.bill_to.org}</div> : null}</td>
                    <td style={td}><b>{fmtKES(r.total)}</b></td>
                    <td style={td}>{r.doc_type === 'invoice' ? fmtKES(r.paid) : ''}</td>
                    <td style={td}><Chip text={r.liveStatus} bg={sc.bg} color={sc.fg} />{r.doc_type === 'invoice' && r.due_date ? <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>due {fmtDate(r.due_date)}</div> : null}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <a style={{ ...btnSmall, textDecoration: 'none' }} href={`/api/admin/ops/pdf?type=doc&id=${r.id}`}>PDF</a>
                        <button style={{ ...btnSmall, background: '#fff' }} onClick={() => copyWA(r)}>WA text</button>
                        {r.bill_to?.phone ? <a style={{ ...btnSmall, textDecoration: 'none', background: '#E7F5EE', color: OC.green }} target="_blank" rel="noopener" href={waLink(r.bill_to.phone, whatsappText(r))}>Send</a> : null}
                        {r.doc_type !== 'receipt' && (
                          <button style={{ ...btnSmall, background: '#fff' }} onClick={() => setEdit({
                            id: r.id, docType: r.doc_type as 'quote' | 'invoice', eventId: r.event_id, sourceBudgetId: null,
                            billToName: r.bill_to?.name || '', billToOrg: r.bill_to?.org || '', billToPhone: r.bill_to?.phone || '', billToEmail: r.bill_to?.email || '', billToAddress: r.bill_to?.address || '',
                            lines: r.lines, paymentTerms: r.payment_terms || '', dueDate: fmtDate(r.due_date), payDetails: r.pay_details || '', notes: r.notes || '',
                          })}>Edit</button>
                        )}
                        {r.doc_type === 'invoice' && r.liveStatus === 'draft' && <button style={btnSmall} onClick={() => setStatus(r.id, 'sent')}>Mark sent</button>}
                        {r.doc_type === 'invoice' && balance > 0 && r.liveStatus !== 'draft' && (
                          <button style={{ ...btnSmall, background: OC.green, color: '#fff' }} onClick={() => { setPayFor(r); setPayAmount(balance); }}>Record payment</button>
                        )}
                        <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={async () => {
                          if (!confirm(`Delete ${r.doc_number}? The number is not reused.`)) return;
                          const { data } = await opsPost('doc.delete', { id: r.id });
                          if (data.error) say('Failed: ' + data.error); else { say('Deleted'); reload(); }
                        }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!shown.length && <tr><td style={td} colSpan={7}>No documents yet. Create one or start from a saved budget.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {payFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card, width: '100%', maxWidth: 380 }}>
            <h3 style={h3}>RECORD PAYMENT</h3>
            <div style={{ fontSize: 13, marginBottom: 10 }}>{payFor.doc_number}: total {fmtKES(docTotals(payFor.lines).total)}, paid {fmtKES(payFor.paid)}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><span style={label}>Amount (KES)</span><input style={inp} type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value) || 0)} /></div>
              <div><span style={label}>Method</span>
                <select style={inp} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {['mpesa', 'bank', 'cash', 'cheque', 'other'].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div><span style={label}>Reference (e.g. M-Pesa code)</span><input style={inp} value={payRef} onChange={(e) => setPayRef(e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={btnMagenta} disabled={busy} onClick={recordPayment}>Save payment</button>
              <button style={btnDark} onClick={() => setPayFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
