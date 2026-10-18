'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import GmailConnectButton from './GmailConnectButton';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {clearReplyIntent,replyIntent} from '@/lib/client/reply-intent';
import {clearSentReply} from '@/lib/contact-actions';

const C = { pink: '#E6218C', yellow: '#FFD400', cyan: '#21C7E6' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #ddd', borderRadius: 14, boxShadow: 'none' };
const field: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const button: React.CSSProperties = { background: C.yellow, color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '1px solid #ddd', borderRadius: 10, boxShadow: 'none', cursor: 'pointer' };

function address(value: string): string {
  return value.match(/<([^>]+)>/)?.[1] || value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

export default function GmailInbox({ googleClientId, say }: { googleClientId: string; say: (message: string) => void }) {
  const [connection, setConnection] = useState<{ connected: boolean; email?: string }>({ connected: false });
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [loadError,setLoadError]=useState('');
  const sendingRef=useRef(false),loadVersion=useRef(0);
  const [sending, setSending] = useState(false);
  const selected = useMemo(() => messages.find((message) => message.id === selectedId) || messages[0] || null, [messages, selectedId]);
  const draftKey=selected?(connection.email||'')+':'+selected.id:'';
  const reply=drafts[draftKey]||'';
  const setReply=(text:string)=>setDrafts(current=>({...current,[draftKey]:text}));

  const load = async (query = '') => {
    const version=++loadVersion.current;
    setLoading(true);
    setLoadError('');
    try{
    const statusResponse = await fetchWithTimeout('/api/admin/gmail');
    const status = await statusResponse.json().catch(() => ({}));
    if(version!==loadVersion.current)return;
    if(!statusResponse.ok)throw new Error('connection_check_failed');
    if (!status.connected) {
      setConnection({ connected: false }); setMessages([]); return;
    }
    setConnection({ connected: true, email: status.email });
    const response = await fetchWithTimeout(`/api/admin/gmail/messages${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    const data = await response.json().catch(() => ({}));
    if(version!==loadVersion.current)return;
    if (!response.ok) throw new Error('messages_unavailable');
    setMessages(data.messages || []);
    setSelectedId(current=>data.messages?.some((m:{id:string})=>m.id===current)?current:data.messages?.[0]?.id||'');
    }catch{
      if(version===loadVersion.current){setLoadError('Could not load Gmail. Your reply drafts are still here. Check your connection and retry.');}
    }finally{if(version===loadVersion.current)setLoading(false)}
  };

  useEffect(() => { load(); }, []);
  useEffect(()=>{if(!Object.values(drafts).some(value=>value.trim()))return;const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect)},[drafts]);

  const send = async () => {
    if (!selected || !reply.trim()||sendingRef.current) return;
    const message=selected,sentText=reply,sentKey=draftKey;
    const recipient=address(message.from);
    if(!recipient){say('This message has no valid reply address. Your draft is unchanged.');return}
    sendingRef.current=true;
    setSending(true);
    try{
    const response = await fetchWithTimeout('/api/admin/gmail/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId:replyIntent('gmail:'+sentKey),
        messageId: message.id,
        threadId: message.threadId,
        to: recipient,
        subject: /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`,
        body: sentText,
        inReplyTo: message.messageId,
        references: message.references,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok||data.ok!==true) { say(data.error==='gmail_send_outcome_unknown'?'Gmail acceptance is unconfirmed. Check Gmail Sent before retrying. Your draft and send reference are kept.':`Reply not confirmed: ${data.error || response.status}. Your draft is unchanged.`); return; }
    clearReplyIntent('gmail:'+sentKey);
    setDrafts(current=>clearSentReply(current,sentKey,sentText));
    say('Gmail accepted your reply. Delivery is not yet confirmed.');
    setMessages((current) => current.map((m) => m.id === message.id ? { ...m, unread: false } : m));
    }catch{say('Could not confirm delivery. Your draft is kept. Check Gmail Sent before retrying to avoid a duplicate.')}
    finally{sendingRef.current=false;setSending(false)}
  };

  if (!connection.connected && !loading) {
    return <div style={{ ...card, padding: 22 }}>
      {loadError&&<p role="alert">{loadError} <button type="button" style={button} onClick={()=>void load(search)}>Retry</button></p>}
      <div style={{ fontFamily: 'inherit', fontSize: 26 }}>CONNECT URBAN GANG GMAIL</div>
      <p style={{ maxWidth: 620, fontSize: 14, lineHeight: 1.55 }}>Read and reply to Urban Gang conversations without leaving the Control Room. This is the owner-only full inbox. Booking staff use the booking reply workspace, and comms staff use the broadcast workspace.</p>
      <GmailConnectButton clientId={googleClientId} onConnected={(email) => { setConnection({ connected: true, email }); load(); }} />
    </div>;
  }

  return <div>
    <div style={{ ...card, padding: 14, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontFamily: 'inherit', fontSize: 22 }}>GMAIL INBOX</div><div style={{ fontSize: 12, color: '#666' }}>{connection.email || 'Loading connection…'}</div></div>
      <form onSubmit={(event) => { event.preventDefault(); load(search); }} style={{ display: 'flex', gap: 7, flex: '1 1 360px' }}>
        <input aria-label="Search Gmail" style={field} placeholder="Search Gmail (name, subject, from:)" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button style={button} type="submit">Search</button>
      </form>
      <button style={{ ...button, background: '#fff' }} type="button" onClick={() => load(search)}>Refresh</button>
    </div>
    {loadError&&<p role="alert">{loadError}</p>}
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
          <h2 style={{ fontFamily: 'inherit', fontSize: 26, margin: '4px 0 2px' }}>{selected.subject}</h2>
          <div style={{ color: '#777', fontSize: 12 }}>{selected.date}</div>
          <div style={{ margin: '16px 0', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14, border: '1px solid #ddd', background: '#F8F8F8', borderRadius: 12, padding: 14, maxHeight: 350, overflowY: 'auto' }}>{selected.body}</div>
          <div style={{ fontFamily: 'inherit', fontSize: 18, marginBottom: 8 }}>REPLY</div>
          <textarea aria-label="Email reply" style={{ ...field, minHeight: 180, resize: 'vertical' }} placeholder={`Reply to ${address(selected.from)}`} value={reply} onChange={(event) => setReply(event.target.value)} />
          <p style={{fontSize:12}}>Drafts stay while you switch messages or admin sections. Copy or send before closing this browser tab.</p>
          <button type="button" style={{ ...button, background: '#111', color: C.yellow, marginTop: 9, opacity: sending || !reply.trim() ? .6 : 1 }} disabled={sending || !reply.trim()} onClick={send}>{sending ? 'Sending…' : 'Send reply'}</button>
        </>}
      </section>
    </div>
  </div>;
}

