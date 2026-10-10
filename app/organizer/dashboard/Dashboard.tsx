'use client';

import { useEffect, useState } from 'react';
import { shell, wrap, card, btn, btnMagenta, btnDark, h1, h3, Chip, STATUS_CHIP, api, fmtKES, organizerAccessMessage } from '../ui';

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
  const [accessError, setAccessError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api('/api/organizer/me').then(({ data }) => {
      setOrganizer(data.organizer || null);
      if (!data.organizer) setAccessError(organizerAccessMessage(data.error));
    });
  }, []);

  useEffect(() => {
    if (!organizer) return;
    api('/api/organizer/events').then(({ status, data }) => {
      if (status !== 200) {
        setEventsError(data.error === 'account_not_active' ? organizerAccessMessage(data.error) : 'Your events could not be loaded. Please try again.');
        return;
      }
      setEvents(data.rows || []);
    });
  }, [organizer]);

  const logout = async () => {
    if (loggingOut) return;
    setLogoutError('');
    setLoggingOut(true);
    try {
      const { status, data } = await api('/api/organizer/logout', { method: 'POST' });
      if (status === 200 && data.ok) window.location.href = '/organizer/login';
      else setLogoutError('Could not sign out. Please try again.');
    } finally { setLoggingOut(false); }
  };

  if (organizer === undefined) return <div style={shell}><div style={wrap}><div style={{ ...card, background: '#fff' }}>Loading…</div></div></div>;
  if (!organizer) return <div style={shell}><div style={wrap}><div style={card}>{accessError || 'Your session has ended. Please log in again.'}<div style={{ marginTop: 14 }}><a href="/organizer/login" style={{ ...btnMagenta, textDecoration: 'none', display: 'inline-block' }}>Organizer login</a></div></div></div></div>;

  const totalSold = events.reduce((n, e) => n + Number(e.tickets_sold || 0), 0);
  const totalRevenue = events.reduce((n, e) => n + Number(e.organizer_revenue || 0), 0);

  return (
    <div style={shell}>
      <div style={wrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <h1 style={{ ...h1, marginBottom: 0 }}>{organizer.businessName}</h1>
          <div style={{ flex: 1 }} />
          <a href="/organizer/dashboard/designs" style={{ ...btn, textDecoration: 'none' }}>Ticket designs</a>
          <a style={{ ...btn, textDecoration: 'none' }} href="/organizer/events/new">+ New event</a>
          <button style={btnDark} onClick={logout} disabled={loggingOut}>{loggingOut ? 'Signing out…' : 'Log out'}</button>
        </div>
        {logoutError && <p role="alert">{logoutError}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontFamily: 'inherit', fontSize: 28 }}>{totalSold}</div>
            <div style={{ fontSize: 14, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Tickets sold</div>
          </div>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontFamily: 'inherit', fontSize: 24 }}>{fmtKES(totalRevenue)}</div>
            <div style={{ fontSize: 14, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Your share (after commission)</div>
          </div>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontFamily: 'inherit', fontSize: 24 }}>{events.length}</div>
            <div style={{ fontSize: 14, textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Events submitted</div>
          </div>
        </div>

        <div style={card}>
          <h3 style={h3}>YOUR EVENTS</h3>
          {eventsError && <div role="alert" style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{eventsError}</div>}
          {!events.length && <div style={{ fontSize: 13, color: '#666' }}>No events yet — submit your first one.</div>}
          <div style={{ display: 'grid', gap: 12 }}>
            {events.map((e) => {
              const st = STATUS_CHIP[e.status] || STATUS_CHIP.draft;
              return (
                <div key={e.id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15 }}>{e.name}</b>
                    <Chip text={e.status.replace('_', ' ')} bg={st.bg} color={st.color} />
                    <div style={{ flex: 1 }} />
                    <a style={{ ...btn, padding: '10px 16px', fontSize: 14, textDecoration: 'none' }} href={`/organizer/events/${e.id}/edit`}>Edit</a>
                  </div>
                  <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                    {e.event_date ? e.event_date : 'Date TBA'} · {e.venue}{e.city ? `, ${e.city}` : ''}
                  </div>
                  {e.status === 'rejected' && e.rejection_reason ? (
                    <div style={{ fontSize: 14, color: '#C0392B', marginTop: 6 }}>Rejected: {e.rejection_reason}</div>
                  ) : null}
                  <div style={{ fontSize: 14, color: '#888', marginTop: 6 }}>
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
