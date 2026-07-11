'use client';

import { useEffect, useState } from 'react';
import { shell, wrap, card, btn, btnMagenta, btnDark, h1, h3, Chip, STATUS_CHIP, api, fmtKES } from '../ui';

interface Tier { name: string; price: number }
interface EventRow {
  id: string; name: string; event_date: string | null; venue: string; city: string;
  status: string; rejection_reason: string; tiers: Tier[] | string;
  tickets_sold: number; gross_revenue: number; organizer_revenue: number;
}
interface Organizer { id: string; email: string; businessName: string }

function parseTiers(v: Tier[] | string): Tier[] {
  try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a : []; } catch { return []; }
}

export default function Dashboard() {
  const [organizer, setOrganizer] = useState<Organizer | null | undefined>(undefined);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    api('/api/organizer/me').then(({ data }) => {
      setOrganizer(data.organizer || null);
      if (!data.organizer) window.location.href = '/organizer/login';
    });
  }, []);

  useEffect(() => {
    if (!organizer) return;
    api('/api/organizer/events').then(({ data }) => setEvents(data.rows || []));
  }, [organizer]);

  const logout = async () => { await api('/api/organizer/logout', { method: 'POST' }); window.location.href = '/organizer/login'; };

  if (organizer === undefined) return <div style={shell}><div style={wrap}><div style={{ ...card, background: '#fff' }}>Loading…</div></div></div>;
  if (!organizer) return null;

  const totalSold = events.reduce((n, e) => n + Number(e.tickets_sold || 0), 0);
  const totalRevenue = events.reduce((n, e) => n + Number(e.organizer_revenue || 0), 0);

  return (
    <div style={shell}>
      <div style={wrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <h1 style={{ ...h1, marginBottom: 0 }}>{organizer.businessName}</h1>
          <div style={{ flex: 1 }} />
          <a style={{ ...btn, textDecoration: 'none' }} href="/organizer/events/new">+ New event</a>
          <button style={btnDark} onClick={logout}>Log out</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Anton', fontSize: 28 }}>{totalSold}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Tickets sold</div>
          </div>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Anton', fontSize: 24 }}>{fmtKES(totalRevenue)}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Your share (after commission)</div>
          </div>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Anton', fontSize: 24 }}>{events.length}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Events submitted</div>
          </div>
        </div>

        <div style={card}>
          <h3 style={h3}>YOUR EVENTS</h3>
          {!events.length && <div style={{ fontSize: 13, color: '#666' }}>No events yet — submit your first one.</div>}
          <div style={{ display: 'grid', gap: 12 }}>
            {events.map((e) => {
              const st = STATUS_CHIP[e.status] || STATUS_CHIP.draft;
              return (
                <div key={e.id} style={{ border: '2px solid #111', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15 }}>{e.name}</b>
                    <Chip text={e.status.replace('_', ' ')} bg={st.bg} color={st.color} />
                    <div style={{ flex: 1 }} />
                    <a style={{ ...btn, padding: '5px 10px', fontSize: 12, textDecoration: 'none' }} href={`/organizer/events/${e.id}/edit`}>Edit</a>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#666', marginTop: 4 }}>
                    {e.event_date ? e.event_date : 'Date TBA'} · {e.venue}{e.city ? `, ${e.city}` : ''}
                  </div>
                  {e.status === 'rejected' && e.rejection_reason ? (
                    <div style={{ fontSize: 12.5, color: '#C0392B', marginTop: 6 }}>Rejected: {e.rejection_reason}</div>
                  ) : null}
                  <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                    {parseTiers(e.tiers).map((t) => `${t.name} ${fmtKES(t.price)}`).join(' · ')}
                  </div>
                  {e.status === 'published' ? (
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12.5 }}>
                      <span><b>{e.tickets_sold}</b> sold</span>
                      <span>Gross <b>{fmtKES(e.gross_revenue)}</b></span>
                      <span>Your share <b>{fmtKES(e.organizer_revenue)}</b></span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...card, marginTop: 16, fontSize: 13 }}>
          Payouts are automatic: Paystack splits every card payment the instant a buyer pays — your share lands with your
          settlement bank on Paystack&apos;s normal settlement schedule, UGT never holds or manually sends your money.
        </div>
      </div>
    </div>
  );
}
