'use client';

import { useEffect, useMemo, useState } from 'react';
import GmailConnectButton from './GmailConnectButton';

const C = { pink: '#E6218C', yellow: '#FFD400', cyan: '#21C7E6' };
const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111' };
const field: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '2px solid #111', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const button: React.CSSProperties = { background: C.yellow, color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer' };

function address(value: string): string {
  return value.match(/<([^>]+)>/)?.[1] || value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

export default function GmailInbox({ googleClientId, say }: { googleClientId: string; say: (message: string) => void }) {
  const [connection, setConnection] = useState<{ connected: boolean; email?: string }>({ connected: false });
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const selected = useMemo(() => messages.find((message) => message.id === selectedId) || messages[0] || null, [messages, selectedId]);

  const load = async (query = '') => {
    setLoading(true);
    const statusResponse = await fetch('/api/admin/gmail');
    const status = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok || !status.connected) {
      setConnection({ connected: false }); setMessages([]); setLoading(false); return;
    }
    setConnection({ connected: true, email: status.email });
    const response = await fetch(`/api/admin/gmail/messages${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { say(`Could not load Gmail: ${data.error || response.status}`); return; }
    setMessages(data.messages || []);
    if (data.messages?.[0]) setSelectedId(data.messages[0].id);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setReply(''); }, [selected?.id]);

  const send = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const recipient = address(selected.from);
    const response = await fetch('/api/admin/gmail/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: selected.id,
        threadId: selected.threadId,
        to: recipient,
        subject: /^re:/i.test(selected.subject) ? selected.subject : `Re: ${selected.subject}`,
        body: reply,
        inReplyTo: selected.messageId,
        references: selected.references,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) { say(`Reply failed: ${data.error || response.status}`); return; }
    setReply('');
    say('Email reply sent');
    setMessages((current) => current.map((message) => message.id === selected.id ? { ...message, unread: false } : message));
  };

  if (!connection.connected && !loading) {
    return <div style={{ ...card, padding: 22 }}>
      <div style={{ fontFamily: 'Anton', fontSize: 26 }}>CONNECT YOUR GMAIL</div>
      <p style={{ maxWidth: 620, fontSize: 14, lineHeight: 1.55 }}>Read and reply to Urban Gang enquiries without leaving the Control Room. Access is encrypted on the server and can be disconnected at any time.</p>
      <GmailConnectButton clientId={googleClientId} onConnected={(email) => { setConnection({ connected: true, email }); load(); }} />
    </div>;
  }

  return <div>
    <div style={{ ...card, padding: 14, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontFamily: 'Anton', fontSize: 22 }}>GMAIL INBOX</div><div style={{ fontSize: 12, color: '#666' }}>{connection.email || 'Loading connection…'}</div></div>
      <form onSubmit={(event) => { event.preventDefault(); load(search); }} style={{ display: 'flex', gap: 7, flex: '1 1 360px' }}>
        <input aria-label="Search Gmail" style={field} placeholder="Search Gmail (name, subject, from:)" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button style={button} type="submit">Search</button>
      </form>
      <button style={{ ...button, background: '#fff' }} type="button" onClick={() => load(search)}>Refresh</button>
    </div>
    <div className="admin-split">
      <section style={{ ...card, overflow: 'hidden', maxHeight: 760, overflowY: 'auto' }}>
        {loading && <div style={{ padding: 18 }}>Loading inbox…</div>}
        {!loading && messages.map((message) => <button key={message.id} type="button" onClick={() => setSelectedId(message.id)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid #ddd', padding: 14, background: selected?.id === message.id ? '#FFF4FA' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', gap: 7 }}><strong style={{ flex: 1, fontSize: 13 }}>{message.from}</strong>{message.unread && <span style={{ background: C.yellow, borderRadius: 999, padding: '2px 7px', fontSize: 10, fontWeight: 900 }}>NEW</span>}</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{message.subject}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{message.snippet}</div>
        </button>)}
        {!loading && !messages.length && <div style={{ padding: 18, color: '#666' }}>No messages found.</div>}
      </section>
      <section style={{ ...card, padding: 18, minWidth: 0 }}>
        {!selected ? <div>Select a message.</div> : <>
          <div style={{ color: C.pink, fontWeight: 800, fontSize: 12 }}>{selected.from}</div>
          <h2 style={{ fontFamily: 'Anton', fontSize: 26, margin: '4px 0 2px' }}>{selected.subject}</h2>
          <div style={{ color: '#777', fontSize: 12 }}>{selected.date}</div>
          <div style={{ margin: '16px 0', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14, border: '2px solid #111', background: '#F8F8F8', borderRadius: 12, padding: 14, maxHeight: 350, overflowY: 'auto' }}>{selected.body}</div>
          <div style={{ fontFamily: 'Anton', fontSize: 18, marginBottom: 8 }}>REPLY</div>
          <textarea aria-label="Email reply" style={{ ...field, minHeight: 180, resize: 'vertical' }} placeholder={`Reply to ${address(selected.from)}`} value={reply} onChange={(event) => setReply(event.target.value)} />
          <button type="button" style={{ ...button, background: '#111', color: C.yellow, marginTop: 9, opacity: sending || !reply.trim() ? .6 : 1 }} disabled={sending || !reply.trim()} onClick={send}>{sending ? 'Sending…' : 'Send reply'}</button>
        </>}
      </section>
    </div>
  </div>;
}

