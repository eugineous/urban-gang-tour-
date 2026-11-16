'use client';
import {useCallback,useEffect,useState} from 'react';
type Key={id:string;label:string;scopes:string[];issuer:string;expires_at:string;revoked_at:string|null;last_used_at:string|null};
const endpoint='/api/admin/connected-tools';
const control:React.CSSProperties={minHeight:44,padding:'10px 12px',border:'1px solid #ccc',borderRadius:8,maxWidth:'100%',font:'inherit'};
export default function ConnectedTools(){
 const [keys,setKeys]=useState<Key[]>([]),[label,setLabel]=useState('Local Codex'),[days,setDays]=useState('7'),[poster,setPoster]=useState(true),[draft,setDraft]=useState(true);
 const [token,setToken]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[loadedAt,setLoadedAt]=useState(0);
 const load=useCallback(async()=>{const response=await fetch(endpoint,{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load connected tools');setKeys(data.keys);setLoadedAt(Date.now())},[]);
 useEffect(()=>{let active=true;load().catch(()=>{if(active)setMessage('Connected tools are unavailable. Try again shortly.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[load]);
 async function issue(event:React.FormEvent){
  event.preventDefault();setBusy(true);setMessage('');setToken('');
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label,expiresInDays:Number(days),scopes:[...(poster?['poster:upload']:[]),...(draft?['event:draft']:[])]})});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not issue credential');setToken(data.token);setMessage('Credential issued. Copy it now; it cannot be retrieved again.');await load()}
  catch(error){setMessage(error instanceof Error?error.message:'Could not issue credential')}finally{setBusy(false)}
 }
 async function revoke(id:string){setBusy(true);setMessage('');try{const response=await fetch(endpoint,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not revoke');setToken('');await load();setMessage('Credential revoked. Future requests are blocked.')}catch(error){setMessage(error instanceof Error?error.message:'Could not revoke')}finally{setBusy(false)}}
 return <section aria-labelledby="connected-tools-title" style={{maxWidth:900,padding:'16px 0'}}>
  <h2 id="connected-tools-title">Connected tools</h2>
  <p>Give your local Codex workflow permission to upload event posters and prepare drafts for staff review. Credentials expire and can be revoked here.</p>
  <p>These credentials cannot publish events, change existing events, sell tickets, take payments or manage people.</p>
  <form onSubmit={issue} style={{display:'grid',gap:16,maxWidth:520,marginBlock:24}}>
   <label>Credential name<input style={{...control,display:'block',width:'100%',marginTop:6}} value={label} onChange={e=>setLabel(e.target.value)} required maxLength={80} autoComplete="off" /></label>
   <label>Expires after<select style={{...control,display:'block',width:'100%',marginTop:6}} value={days} onChange={e=>setDays(e.target.value)}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></label>
   <fieldset style={{border:'1px solid #ddd',borderRadius:8,padding:12}}><legend>Allowed actions</legend>
    <label style={{display:'flex',alignItems:'center',gap:10,minHeight:44}}><input type="checkbox" checked={poster} onChange={e=>setPoster(e.target.checked)}/>Upload PNG, JPEG or WebP posters (up to 5 MiB)</label>
    <label style={{display:'flex',alignItems:'center',gap:10,minHeight:44}}><input type="checkbox" checked={draft} onChange={e=>setDraft(e.target.checked)}/>Create event drafts</label>
   </fieldset>
   <button style={{...control,background:'var(--brand, #d6006d)',color:'#fff',border:0}} disabled={busy||(!poster&&!draft)} type="submit">{busy?'Working…':'Issue credential'}</button>
  </form>
  <p role="status" aria-live="polite">{message}</p>
  {token&&<div style={{padding:16,border:'2px solid #d6006d',borderRadius:10,marginBlock:20}}>
   <label htmlFor="one-time-tool-token"><strong>Shown once — keep this credential private</strong></label>
   <p>Anyone holding it can use the selected actions until expiry or revocation. Save it in an environment variable or the ignored local credential file described in the setup guide.</p>
   <textarea id="one-time-tool-token" readOnly value={token} spellCheck={false} autoComplete="off" rows={3} style={{...control,width:'100%',fontFamily:'monospace'}}/>
   <button style={control} type="button" onClick={async()=>{try{await navigator.clipboard.writeText(token);setMessage('Credential copied. Store it privately.')}catch{setMessage('Clipboard unavailable. Select the credential and copy it manually.')}}}>Copy credential</button>{' '}
   <button style={control} type="button" onClick={()=>setToken('')}>Hide credential</button>
  </div>}
  <p><a href="/api/editor-tools/openapi" target="_blank" rel="noreferrer">OpenAPI contract</a> · <a href="/guides/connected-tools" target="_blank" rel="noreferrer">Codex and ChatGPT setup</a></p>
  <p>6 successful writes per minute and 30 per day per credential. Posters belong to the credential that uploaded them. Review and publish drafts in Events.</p>
  <h3>Issued credentials</h3>
  {loading?<p>Loading credentials…</p>:keys.length===0?<p>No credentials issued.</p>:<ul style={{padding:0,listStyle:'none',display:'grid',gap:12}}>{keys.map(key=>{
   const expired=Date.parse(key.expires_at)<=loadedAt;
   return <li key={key.id} style={{border:'1px solid #ddd',padding:16,borderRadius:10,overflowWrap:'anywhere'}}>
    <strong>{key.label}</strong><p>{key.scopes.join(' · ')}</p><p>{key.revoked_at?'Revoked':expired?'Expired':'Active'} · Expires {new Date(key.expires_at).toLocaleString()}</p>
    <p>Issued by {key.issuer} · Last used {key.last_used_at?new Date(key.last_used_at).toLocaleString():'never'}</p>
    {!key.revoked_at&&!expired&&<button style={control} type="button" disabled={busy} onClick={()=>void revoke(key.id)}>Revoke {key.label}</button>}
   </li>
  })}</ul>}
 </section>
}
