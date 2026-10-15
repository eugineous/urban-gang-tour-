'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchWithTimeout } from '@/lib/client/fetch-with-timeout';
type Session={id:string;actor:string;auth_source:string;created_at:string;expires_at:string;current:boolean};
export default function AdminSessions() {
  const [rows,setRows]=useState<Session[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[legacy,setLegacy]=useState(false);
  const load=useCallback(async()=>{try{const r=await fetchWithTimeout('/api/admin/sessions',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error();setRows(d.sessions);setLegacy(d.legacySession);setError('')}catch{setError('Could not load sessions. Try again.')}},[]);
  useEffect(()=>{void load()},[load]);
  async function revoke(id?:string) {
    if(busy||!confirm(id?'End this admin session?':'Sign out other devices, including older sessions?'))return;
    setBusy(true);setError('');
    try{const r=await fetchWithTimeout('/api/admin/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(id?{action:'revoke',id}:{action:'others'})});const d=await r.json();if(!r.ok)throw new Error();if(d.reauthenticate){location.assign('/admin');return;}await load();}catch{setError('Could not revoke sessions. Retry before assuming they are signed out.')}finally{setBusy(false)}
  }
  return <section style={{background:'#fff',border:'1px solid #d8d2d6',borderRadius:14,padding:24}}><h3>Admin sessions</h3><p>New sessions last one day and can be revoked here. A password change ends other password sessions.</p>{legacy&&<p>Sign in again to register this older session. Ending other devices will also sign this older session out.</p>}{error&&<p role="alert">{error} <button type="button" onClick={()=>void load()}>Retry</button></p>}<button type="button" disabled={busy} onClick={()=>void revoke()}>Sign out other devices</button><ul>{rows.map(row=><li key={row.id} style={{padding:'14px 0',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}><span>{row.actor} · {row.auth_source} · {new Date(row.created_at).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}{row.current?' · This session':''}</span><button type="button" disabled={busy} onClick={()=>void revoke(row.id)}>End session</button></li>)}</ul></section>;
}
