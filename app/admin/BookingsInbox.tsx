'use client';

import { useEffect, useMemo, useState } from 'react';
import GmailConnectButton from './GmailConnectButton';

const C = { pink: '#E6218C', yellow: '#FFD400', cyan: '#21C7E6', ink: '#111', green: '#1F8A5B' };
const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111' };
const field: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '2px solid #111', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const button: React.CSSProperties = { background: C.yellow, color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer' };

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

function whatsapp(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('254') ? digits : digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
}

export default function BookingsInbox({
  rows,
  googleClientId,
  onChanged,
  say,
}: {
  rows: any[];
  googleClientId: string;
  onChanged: () => void;
  say: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('open');
  const [replies, setReplies] = useState<any[]>([]);
  const [gmail, setGmail] = useState<{ connected: boolean; email?: string }>({ connected: false });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const shown = useMemo(() => rows.filter((row) => {
    const matchesQuery = !query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all'
      || (status === 'open' ? !['confirmed', 'closed'].includes(row.status) : row.status === status);
    return matchesQuery && matchesStatus;
  }), [rows, query, status]);
  const selected = rows.find((row) => row.id === selectedId) || shown[0] || null;

  useEffect(() => {
    if (!selectedId && shown[0]) setSelectedId(shown[0].id);
  }, [selectedId, shown]);

  useEffect(() => {
    fetch('/api/admin/gmail').then((r) => r.json()).then((data) => {
      if (!data.error) setGmail({ connected: !!data.connected, email: data.email });
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setSubject(`Re: ${selected.type || 'Your booking'} — Urban Gang Tour`);
    setBody(`Hi ${String(selected.name || '').split(' ')[0] || 'there'},\n\nThanks for reaching out about ${selected.type || 'working with Urban Gang Tour'}. We have received your request and would love to learn more about the date, venue, audience size and the experience you have in mind.\n\nShare those details when you can and we will take it from there.\n\nBest,\nUrban Gang Tour`);
    fetch(`/api/admin/bookings/reply?id=${encodeURIComponent(selected.id)}`)
      .then((r) => r.json()).then((data) => setReplies(data.replies || []));
  }, [selected?.id]);

  const changeStatus = async (next: string) => {
    if (!selected) return;
    const response = await fetch('/api/admin/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'bookingStatus', data: { id: selected.id, status: next } }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) say(`Could not update booking: ${data.error || response.status}`);
    else { say('Booking updated'); onChanged(); }
  };

  const sendReply = async () => {
    if (!selected || !body.trim()) return;
    setSending(true);
    const response = await fetch('/api/admin/bookings/reply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, subject, body }),
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) {
      say(data.error === 'gmail_not_connected' ? 'Connect Gmail before sending a reply.' : `Reply failed: ${data.error || response.status}`);
      return;
    }
    say('Reply sent from Gmail');
    setReplies((current) => [...current, { id: data.id, sender: gmail.email || 'Gmail', recipient: selected.email, subject, body, created_at: new Date().toISOString() }]);
    setBody('');
    onChanged();
  };

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontFamily: 'Anton', fontSize: 22 }}>BOOKING DESK</div>
          <div style={{ fontSize: 12, color: '#666' }}>Review requests, reply from Gmail, and keep every decision in one place.</div>
        </div>
        {gmail.connected
          ? <div style={{ border: '2px solid #111', borderRadius: 999, padding: '7px 11px', background: '#DDF6E8', fontSize: 12, fontWeight: 800 }}>Gmail connected · {gmail.email}</div>
          : <GmailConnectButton clientId={googleClientId} onConnected={(email) => setGmail({ connected: true, email })} />}
        <a href="/api/admin/export?kind=bookings" style={{ ...button, textDecoration: 'none', background: '#fff' }}>Export CSV</a>
      </div>

      <div className="admin-split">
        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '3px solid #111', display: 'grid', gap: 8 }}>
            <input aria-label="Search bookings" style={field} placeholder="Search bookings" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['open', 'new', 'review', 'replied', 'confirmed', 'closed', 'all'].map((value) => (
                <button key={value} type="button" onClick={() => setStatus(value)} style={{ ...button, padding: '6px 9px', boxShadow: 'none', background: status === value ? C.pink : '#fff', color: status === value ? '#fff' : '#111' }}>{value}</button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 720, overflowY: 'auto' }}>
            {shown.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 14, border: 0, borderBottom: '1px solid #ddd', background: selected?.id === row.id ? '#FFF4FA' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <strong style={{ flex: 1, fontSize: 14 }}>{row.name}</strong>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: row.status === 'new' ? C.yellow : '#eee', borderRadius: 999, padding: '3px 7px' }}>{row.status}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.pink, marginTop: 3 }}>{row.type}{row.org ? ` · ${row.org}` : ''}</div>
                <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{formatDate(row.created_at)}</div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.message}</div>
              </button>
            ))}
            {!shown.length && <div style={{ padding: 20, fontSize: 13, color: '#666' }}>No bookings match this view.</div>}
          </div>
        </section>

        <section style={{ ...card, padding: 18, minWidth: 0 }}>
          {!selected ? <div style={{ color: '#666' }}>Select a booking to open it.</div> : <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ color: C.pink, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{selected.type}</div>
                <h2 style={{ fontFamily: 'Anton', fontSize: 28, margin: '3px 0' }}>{selected.name}</h2>
                <div style={{ fontSize: 13, color: '#666' }}>{selected.org || 'No organisation supplied'} · {formatDate(selected.created_at)}</div>
              </div>
              <select aria-label="Booking status" style={{ ...field, width: 150 }} value={selected.status} onChange={(event) => changeStatus(event.target.value)}>
                {['new', 'review', 'replied', 'confirmed', 'closed'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
              <a href={`mailto:${selected.email}`} style={{ ...button, textDecoration: 'none' }}>Email {selected.email}</a>
              {selected.phone && <a href={`https://wa.me/${whatsapp(selected.phone)}`} target="_blank" rel="noopener" style={{ ...button, textDecoration: 'none', background: '#DDF6E8' }}>WhatsApp {selected.phone}</a>}
            </div>

            <div style={{ border: '2px solid #111', borderRadius: 12, padding: 14, background: '#F8F8F8', whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: 14 }}>{selected.message || 'No message supplied.'}</div>

            {replies.length > 0 && <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: 'Anton', fontSize: 16, marginBottom: 8 }}>REPLY HISTORY</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {replies.map((reply) => <div key={reply.id} style={{ borderLeft: `4px solid ${C.cyan}`, padding: '8px 12px', background: '#F3FBFD', fontSize: 12 }}>
                  <div style={{ fontWeight: 800 }}>{reply.subject}</div>
                  <div style={{ color: '#777', margin: '2px 0 6px' }}>{reply.sender} → {reply.recipient} · {formatDate(reply.created_at)}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{reply.body}</div>
                </div>)}
              </div>
            </div>}

            <div style={{ marginTop: 20, borderTop: '3px solid #111', paddingTop: 16 }}>
              <div style={{ fontFamily: 'Anton', fontSize: 18, marginBottom: 8 }}>REPLY FROM GMAIL</div>
              {!gmail.connected && <div style={{ background: '#FFF6CC', border: '2px solid #111', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 12 }}>Connect Gmail above to send without leaving the Control Room.</div>}
              <div style={{ display: 'grid', gap: 8 }}>
                <input style={field} value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Reply subject" />
                <textarea style={{ ...field, minHeight: 180, resize: 'vertical' }} value={body} onChange={(event) => setBody(event.target.value)} aria-label="Reply message" />
                <button type="button" style={{ ...button, background: C.ink, color: C.yellow, justifySelf: 'start', opacity: !gmail.connected || sending ? .6 : 1 }} disabled={!gmail.connected || sending || !body.trim()} onClick={sendReply}>{sending ? 'Sending…' : 'Send reply'}</button>
              </div>
            </div>
          </>}
        </section>
      </div>
    </div>
  );
}

