'use client';

// Third-party ticketing marketplace oversight: organizer approval queue
// (approving creates a live Paystack subaccount — see app/api/admin/ops
// marketplaceOrganizer.approve), event approval queue, admin-editable
// commission percent, and a read-only ledger of marketplace orders/commission
// earned to date. Follows Events.tsx's exact conventions.

import { useCallback, useEffect, useState } from 'react';
import { OC, card, btnMagenta, btnSmall, inp, h3, td, th, Chip, fmtDate, fmtKES, opsGet, opsPost, Toast, useToast, SearchBox, useSearch } from './ui';

interface Organizer {
  id: string; business_name: string; contact_name: string; email: string; phone: string;
  paystack_subaccount_code: string; settlement_bank: string; settlement_account: string;
  status: string; rejection_reason: string; applied_at: string; approved_at: string | null; event_count: number;
}
interface MktEvent {
  id: string; organizer_id: string; name: string; event_date: string | null; venue: string; city: string;
  status: string; rejection_reason: string; organizer_business_name: string; organizer_status: string; tickets_sold: number;
}
interface MktOrder {
  id: string; total: number; status: string; name: string; phone: string; commission_amount: number; organizer_amount: number;
  created_at: string; organizer_business_name: string; event_name: string;
}

export default function Marketplace() {
  const [tab, setTab] = useState<'organizers' | 'events' | 'orders' | 'commission'>('organizers');
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [events, setEvents] = useState<MktEvent[]>([]);
  const [orders, setOrders] = useState<MktOrder[]>([]);
  const [totals, setTotals] = useState<{ commission: string; organizer_share: string; count: string } | null>(null);
  const [commission, setCommission] = useState<number>(8);
  const [commissionInput, setCommissionInput] = useState('8');
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reloadOrganizers = useCallback(async () => {
    const { data } = await opsGet('marketplaceOrganizers');
    if (data.error) say('Load failed: ' + data.error); else setOrganizers(data.rows || []);
  }, [say]);
  const reloadEvents = useCallback(async () => {
    const { data } = await opsGet('marketplaceEvents');
    if (data.error) say('Load failed: ' + data.error); else setEvents(data.rows || []);
  }, [say]);
  const reloadOrders = useCallback(async () => {
    const { data } = await opsGet('marketplaceOrders');
    if (data.error) say('Load failed: ' + data.error); else { setOrders(data.rows || []); setTotals(data.totals || null); }
  }, [say]);
  const reloadCommission = useCallback(async () => {
    const { data } = await opsGet('marketplaceCommission');
    if (!data.error) { setCommission(data.percent); setCommissionInput(String(data.percent)); }
  }, []);

  useEffect(() => { reloadOrganizers(); reloadEvents(); reloadCommission(); }, [reloadOrganizers, reloadEvents, reloadCommission]);
  useEffect(() => { if (tab === 'orders') reloadOrders(); }, [tab, reloadOrders]);

  const approveOrganizer = async (o: Organizer) => {
    if (!confirm(`Approve "${o.business_name}"? This creates a live Paystack subaccount using their submitted bank details.`)) return;
    setBusy(true);
    const { data } = await opsPost('marketplaceOrganizer.approve', { id: o.id });
    setBusy(false);
    if (data.error) say('⚠ Approve failed: ' + data.error);
    else { say(data.already ? 'Already approved' : `✓ Approved — subaccount ${data.row?.paystack_subaccount_code}`); reloadOrganizers(); }
  };
  const rejectOrganizer = async (o: Organizer) => {
    const reason = prompt(`Reason for rejecting "${o.business_name}"?`);
    if (reason === null) return;
    setBusy(true);
    const { data } = await opsPost('marketplaceOrganizer.reject', { id: o.id, reason });
    setBusy(false);
    if (data.error) say('⚠ ' + data.error); else { say('Rejected'); reloadOrganizers(); }
  };
  const suspendOrganizer = async (o: Organizer) => {
    if (!confirm(`Suspend "${o.business_name}"? Their events stop being sellable immediately.`)) return;
    const { data } = await opsPost('marketplaceOrganizer.suspend', { id: o.id });
    if (data.error) say('⚠ ' + data.error); else { say('Suspended'); reloadOrganizers(); }
  };
  const reinstateOrganizer = async (o: Organizer) => {
    const { data } = await opsPost('marketplaceOrganizer.reinstate', { id: o.id });
    if (data.error) say('⚠ ' + data.error); else { say('Reinstated'); reloadOrganizers(); }
  };

  const approveEvent = async (e: MktEvent) => {
    if (!confirm(`Publish "${e.name}"? It becomes sellable on /marketplace immediately.`)) return;
    const { data } = await opsPost('marketplaceEvent.approve', { id: e.id });
    if (data.error) say('⚠ ' + data.error); else { say('✓ Published'); reloadEvents(); }
  };
  const rejectEvent = async (e: MktEvent) => {
    const reason = prompt(`Reason for rejecting "${e.name}"?`);
    if (reason === null) return;
    const { data } = await opsPost('marketplaceEvent.reject', { id: e.id, reason });
    if (data.error) say('⚠ ' + data.error); else { say('Rejected'); reloadEvents(); }
  };
  const cancelEvent = async (e: MktEvent) => {
    if (!confirm(`Cancel "${e.name}"? It stops being sellable.`)) return;
    const { data } = await opsPost('marketplaceEvent.cancel', { id: e.id });
    if (data.error) say('⚠ ' + data.error); else { say('Cancelled'); reloadEvents(); }
  };

  const saveCommission = async () => {
    const pct = Number(commissionInput);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) { say('Enter a number between 0 and 100'); return; }
    setBusy(true);
    const { data } = await opsPost('marketplaceCommission.save', { percent: pct });
    setBusy(false);
    if (data.error) say('⚠ ' + data.error); else { say(`✓ Commission set to ${pct}% — live on the next checkout`); setCommission(pct); }
  };

  const pendingOrganizers = organizers.filter((o) => o.status === 'pending');
  const pendingEvents = events.filter((e) => e.status === 'pending_review');
  const shownOrganizers = useSearch(organizers, qy);
  const shownEvents = useSearch(events, qy);
  const shownOrders = useSearch(orders, qy);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>MARKETPLACE</h3>
          <div style={{ flex: 1 }} />
          {pendingOrganizers.length > 0 && <Chip text={`${pendingOrganizers.length} organizer${pendingOrganizers.length > 1 ? 's' : ''} pending`} bg="#FDF2D9" color={OC.orange} />}
          {pendingEvents.length > 0 && <Chip text={`${pendingEvents.length} event${pendingEvents.length > 1 ? 's' : ''} pending`} bg="#FDF2D9" color={OC.orange} />}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Third-party organizers sell tickets through urbangangtour.co.ke. UGT takes {commission}% commission per ticket,
          split automatically by Paystack at the moment of sale — UGT never holds or manually pays out organizer funds.
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['organizers', 'events', 'orders', 'commission'] as const).map((t) => (
            <button key={t} style={{ ...btnSmall, background: tab === t ? OC.magenta : '#fff', color: tab === t ? '#fff' : '#111', textTransform: 'capitalize' }} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
          {tab !== 'commission' && <SearchBox value={qy} onChange={setQy} placeholder={`Search ${tab}...`} style={{ marginLeft: 'auto' }} />}
        </div>
      </div>

      {tab === 'organizers' && (
        <div style={card}>
          <h3 style={h3}>ORGANIZERS ({organizers.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr>{['business', 'contact', 'bank / account', 'subaccount', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
              <tbody>
                {shownOrganizers.map((o) => (
                  <tr key={o.id}>
                    <td style={td}><b>{o.business_name}</b><div style={{ fontSize: 11, color: '#888' }}>{o.event_count} event{o.event_count === 1 ? '' : 's'}</div></td>
                    <td style={td}>{o.contact_name}<div style={{ fontSize: 11, color: '#888' }}>{o.email} · {o.phone}</div></td>
                    <td style={td}>{o.settlement_bank} · {o.settlement_account}</td>
                    <td style={td}>{o.paystack_subaccount_code ? <code style={{ fontSize: 11 }}>{o.paystack_subaccount_code}</code> : '—'}</td>
                    <td style={td}>
                      {o.status === 'approved' ? <Chip text="approved" bg="#E7F5EE" color={OC.green} />
                        : o.status === 'pending' ? <Chip text="pending" bg="#FDF2D9" color={OC.orange} />
                        : o.status === 'suspended' ? <Chip text="suspended" bg="#FBE7E7" color={OC.red} />
                        : <Chip text="rejected" bg="#FBE7E7" color={OC.red} />}
                      {o.status === 'rejected' && o.rejection_reason ? <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{o.rejection_reason}</div> : null}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {o.status === 'pending' && <button style={btnSmall} disabled={busy} onClick={() => approveOrganizer(o)}>Approve</button>}
                        {o.status === 'pending' && <button style={{ ...btnSmall, background: '#111', color: '#fff' }} disabled={busy} onClick={() => rejectOrganizer(o)}>Reject</button>}
                        {o.status === 'approved' && <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => suspendOrganizer(o)}>Suspend</button>}
                        {o.status === 'suspended' && <button style={btnSmall} onClick={() => reinstateOrganizer(o)}>Reinstate</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!shownOrganizers.length && <tr><td style={td} colSpan={6}>{organizers.length ? 'No organizers match your search.' : 'No organizer applications yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div style={card}>
          <h3 style={h3}>MARKETPLACE EVENTS ({events.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr>{['event', 'organizer', 'date / venue', 'sold', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
              <tbody>
                {shownEvents.map((e) => (
                  <tr key={e.id}>
                    <td style={td}><b>{e.name}</b></td>
                    <td style={td}>{e.organizer_business_name}{e.organizer_status !== 'approved' ? <div style={{ fontSize: 11, color: OC.red }}>organizer not approved</div> : null}</td>
                    <td style={td}>{e.event_date ? fmtDate(e.event_date) : 'TBA'} · {e.venue}{e.city ? `, ${e.city}` : ''}</td>
                    <td style={td}>{e.tickets_sold}</td>
                    <td style={td}>
                      {e.status === 'published' ? <Chip text="published" bg="#E7F5EE" color={OC.green} />
                        : e.status === 'pending_review' ? <Chip text="pending review" bg="#FDF2D9" color={OC.orange} />
                        : e.status === 'cancelled' ? <Chip text="cancelled" bg="#FBE7E7" color={OC.red} />
                        : e.status === 'rejected' ? <Chip text="rejected" bg="#FBE7E7" color={OC.red} />
                        : <Chip text={e.status} />}
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {e.status === 'pending_review' && <button style={btnSmall} onClick={() => approveEvent(e)}>Approve</button>}
                        {e.status === 'pending_review' && <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => rejectEvent(e)}>Reject</button>}
                        {e.status === 'published' && <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => cancelEvent(e)}>Cancel</button>}
                        <a style={{ ...btnSmall, textDecoration: 'none' }} href={`/marketplace/${e.id}`} target="_blank" rel="noopener">View</a>
                      </div>
                    </td>
                  </tr>
                ))}
                {!shownEvents.length && <tr><td style={td} colSpan={6}>{events.length ? 'No events match your search.' : 'No marketplace events yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div style={card}>
          <h3 style={h3}>MARKETPLACE ORDERS (read-only ledger)</h3>
          {totals && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 12 }}>
              <div style={{ ...card, textAlign: 'center', padding: 10 }}><div style={{ fontFamily: 'Anton', fontSize: 20 }}>{totals.count}</div><div style={{ fontSize: 11, color: '#666' }}>Paid orders</div></div>
              <div style={{ ...card, textAlign: 'center', padding: 10 }}><div style={{ fontFamily: 'Anton', fontSize: 18 }}>{fmtKES(Number(totals.commission))}</div><div style={{ fontSize: 11, color: '#666' }}>Commission earned</div></div>
              <div style={{ ...card, textAlign: 'center', padding: 10 }}><div style={{ fontFamily: 'Anton', fontSize: 18 }}>{fmtKES(Number(totals.organizer_share))}</div><div style={{ fontSize: 11, color: '#666' }}>Paid out to organizers</div></div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr>{['order', 'event', 'organizer', 'total', 'commission', 'organizer share', 'status', 'date'].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
              <tbody>
                {shownOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={td}>{o.id}</td>
                    <td style={td}>{o.event_name}</td>
                    <td style={td}>{o.organizer_business_name}</td>
                    <td style={td}>{fmtKES(o.total)}</td>
                    <td style={td}>{fmtKES(o.commission_amount)}</td>
                    <td style={td}>{fmtKES(o.organizer_amount)}</td>
                    <td style={td}>{o.status}</td>
                    <td style={td}>{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
                {!shownOrders.length && <tr><td style={td} colSpan={8}>{orders.length ? 'No orders match your search.' : 'No marketplace orders yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'commission' && (
        <div style={card}>
          <h3 style={h3}>COMMISSION</h3>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            UGT&apos;s cut of every marketplace ticket, as a percentage of the ticket price. Changing this takes effect on the
            very next checkout — Paystack&apos;s split is recomputed live from this setting on every sale, never cached per organizer.
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 320 }}>
            <input style={inp} type="number" min={0} max={100} step={0.1} value={commissionInput} onChange={(e) => setCommissionInput(e.target.value)} />
            <span style={{ fontWeight: 800 }}>%</span>
            <button style={btnMagenta} disabled={busy} onClick={saveCommission}>Save</button>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Current live value: <b>{commission}%</b></div>
        </div>
      )}
    </div>
  );
}
