'use client';

import { useEffect, useState } from 'react';

type Props = { stats: any; scope?: 'super_admin' | 'crew_admin'; perms: string[]; onOpen: (tab: string) => void };

type QueueItem = { key: string; label: string; target: string; count: number };
type QueueSource = { key: string; label: string; state: 'ready' | 'unavailable' };
type Queue = { period: string; generatedAt: string; items: QueueItem[]; sources: QueueSource[] };

const n = (value: unknown) => Number(value || 0).toLocaleString();

export default function ControlRoomHome({ stats, scope, perms, onOpen }: Props) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [queueError, setQueueError] = useState('');
  const allowed = (perm: string) => scope === 'super_admin' || perms.includes(perm);
  const has = (key: string) => Object.prototype.hasOwnProperty.call(stats || {}, key);
  const newBookings = Number(stats?.new_bookings || 0);
  const orders = Number(stats?.orders || 0);
  const revenue = Number(stats?.revenue || 0);
  const quickActions = [
    allowed('bookings') && has('new_bookings') ? { value: n(newBookings), label: `new booking${newBookings === 1 ? '' : 's'} to work`, tab: 'Bookings' } : null,
    allowed('bookings') ? { value: '✉', label: 'open the Urban Gang inbox', tab: 'Inbox' } : null,
    allowed('orders') && has('orders') ? { value: n(orders), label: 'orders and payments', tab: 'Orders' } : null,
    allowed('content') ? { value: '✎', label: 'stories to prepare or review', tab: 'Content' } : null,
    allowed('gallery') ? { value: '▧', label: 'gallery photos to manage', tab: 'Gallery' } : null,
  ].filter(Boolean) as { value: string; label: string; tab: string }[];
  const overview = [
    has('new_bookings') ? ['New bookings', n(newBookings)] : null,
    has('revenue') ? ['Paid revenue', `KES ${n(revenue)}`] : null,
    has('posts') ? ['Published stories', n(stats?.posts)] : null,
    has('hits_7d') ? ['Visitors this week', n(stats?.hits_7d)] : null,
  ].filter(Boolean) as [string, string][];
  useEffect(() => {
    let live = true;
    setQueue(null);
    setQueueError('');
    fetch('/api/admin/data?view=worklist')
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!live) return;
        if (!response.ok || data.error) setQueueError(data.error || 'Queue report unavailable');
        else setQueue(data as Queue);
      })
      .catch(() => live && setQueueError('Queue report unavailable'));
    return () => { live = false; };
  }, [scope, perms.join('|')]);
  const attention = (queue?.items || []).filter((item) => item.count > 0);
  const readySources = (queue?.sources || []).filter((source) => source.state === 'ready');
  const unavailableSources = (queue?.sources || []).filter((source) => source.state === 'unavailable');
  return <div className="cr-today-grid">
    <section className="cr-today-card">
      <h2>Today&apos;s desk</h2>
      <p>Start with conversations and commitments. Everything else is one step away, not in your face.</p>
      {quickActions.length ? <div className="cr-quick-actions">
        {quickActions.map((action) => <button key={action.tab} className="cr-quick-action" onClick={() => onOpen(action.tab)}><b>{action.value}</b><span>{action.label}</span></button>)}
      </div> : <p style={{ marginTop: 17 }}>Your assigned tools are available from the left-hand menu.</p>}
      <div className="cr-worklist">
        {allowed('bookings') && <div className="cr-work-item"><i className="cr-work-dot" /><span>Reply to new enquiries before they go cold.</span><button onClick={() => onOpen('Bookings')}>Open desk</button></div>}
        {allowed('bookings') && <div className="cr-work-item"><i className="cr-work-dot" /><span>Check any customer messages that need an answer.</span><button onClick={() => onOpen('Inbox')}>Open inbox</button></div>}
        {allowed('ops_pipeline') && <div className="cr-work-item"><i className="cr-work-dot" /><span>Use Pipeline only after an enquiry becomes a real lead.</span><button onClick={() => onOpen('Pipeline')}>Open pipeline</button></div>}
        {allowed('content') && <div className="cr-work-item"><i className="cr-work-dot" /><span>Prepare the next story, then send it for editorial review.</span><button onClick={() => onOpen('Content')}>Open stories</button></div>}
        {allowed('gallery') && <div className="cr-work-item"><i className="cr-work-dot" /><span>Upload and caption the strongest approved gallery images.</span><button onClick={() => onOpen('Gallery')}>Open gallery</button></div>}
      </div>
    </section>
    <section className="cr-today-card">
      <h2>At a glance</h2>
      {overview.length ? <div className="cr-stat-list">
        {overview.map(([label, value]) => <div key={label} className="cr-stat-row"><span>{label}</span><strong>{value}</strong></div>)}
      </div> : <p style={{ marginTop: 12 }}>Metrics appear here only for work assigned to your role.</p>}
    </section>
    <section className="cr-today-card">
      <h2>Current queue</h2>
      <p>{queue ? `${queue.period}, checked ${new Date(queue.generatedAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}. Counts show records, not forecasts or performance targets.` : 'Checking the status sources assigned to your role.'}</p>
      {queueError && <p style={{ marginTop: 12, color: '#A11212' }}>{queueError}. Open your assigned desk directly and try again later.</p>}
      {!queue && !queueError && <p style={{ marginTop: 12 }}>Loading live queue status…</p>}
      {queue && !queue.sources.length && <p style={{ marginTop: 12 }}>No queue sources are assigned to this account yet. Use the desk menu to choose the next task.</p>}
      {queue && !!queue.sources.length && <div className="cr-worklist">
        {attention.map((item) => <div className="cr-work-item" key={item.key}><i className="cr-work-dot" /><span><b>{n(item.count)}</b> {item.label.toLowerCase()}</span><button onClick={() => onOpen(item.target)}>Open desk</button></div>)}
        {!attention.length && <p style={{ marginTop: 12 }}>No records in your assigned queue need action right now.</p>}
        <p style={{ marginTop: 12, fontSize: 12, color: '#666' }}>Sources: {readySources.length ? `${readySources.map((source) => source.label).join(', ')} ready` : 'none ready'}{unavailableSources.length ? `. Unavailable: ${unavailableSources.map((source) => source.label).join(', ')}` : ''}.</p>
      </div>}
    </section>
  </div>;
}
