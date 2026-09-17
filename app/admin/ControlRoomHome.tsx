'use client';

type Props = { stats: any; onOpen: (tab: string) => void };

const n = (value: unknown) => Number(value || 0).toLocaleString();

export default function ControlRoomHome({ stats, onOpen }: Props) {
  const newBookings = Number(stats?.new_bookings || 0);
  const orders = Number(stats?.orders || 0);
  const revenue = Number(stats?.revenue || 0);
  return <div className="cr-today-grid">
    <section className="cr-today-card">
      <h2>Today&apos;s desk</h2>
      <p>Start with conversations and commitments. Everything else is one step away, not in your face.</p>
      <div className="cr-quick-actions">
        <button className="cr-quick-action" onClick={() => onOpen('Bookings')}><b>{n(newBookings)}</b><span>new booking{newBookings === 1 ? '' : 's'} to work</span></button>
        <button className="cr-quick-action" onClick={() => onOpen('Inbox')}><b>✉</b><span>open the Urban Gang inbox</span></button>
        <button className="cr-quick-action" onClick={() => onOpen('Orders')}><b>{n(orders)}</b><span>orders and payments</span></button>
      </div>
      <div className="cr-worklist">
        <div className="cr-work-item"><i className="cr-work-dot" /><span>Reply to new enquiries before they go cold.</span><button onClick={() => onOpen('Bookings')}>Open desk</button></div>
        <div className="cr-work-item"><i className="cr-work-dot" /><span>Check any customer messages that need an answer.</span><button onClick={() => onOpen('Inbox')}>Open inbox</button></div>
        <div className="cr-work-item"><i className="cr-work-dot" /><span>Use Pipeline only after an enquiry becomes a real lead.</span><button onClick={() => onOpen('Pipeline')}>Open pipeline</button></div>
      </div>
    </section>
    <section className="cr-today-card">
      <h2>At a glance</h2>
      <div className="cr-stat-list">
        <div className="cr-stat-row"><span>New bookings</span><strong>{n(newBookings)}</strong></div>
        <div className="cr-stat-row"><span>Paid revenue</span><strong>KES {n(revenue)}</strong></div>
        <div className="cr-stat-row"><span>Published stories</span><strong>{n(stats?.posts)}</strong></div>
        <div className="cr-stat-row"><span>Visitors this week</span><strong>{n(stats?.hits_7d)}</strong></div>
      </div>
    </section>
  </div>;
}
