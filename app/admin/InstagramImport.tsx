'use client';
import {useCallback,useEffect,useState} from 'react';
import {INSTAGRAM_PROFILE,INSTAGRAM_WORKFLOW,normalizeOwnedInstagramUrl} from '@/lib/instagram-public.mjs';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
type Status={canImport:boolean;dispatchConfigured:boolean;archiveAvailable:boolean;published:number|null;archived:number|null;failed:number|null;lastUpdate:string|null;automation:{enabled:boolean;publishGeneral:boolean};workflowUrl:string;archiveUrl:string};
export default function InstagramImport(){
 const [status,setStatus]=useState<Status|null>(null),[profile,setProfile]=useState(INSTAGRAM_PROFILE),[rights,setRights]=useState(false),[publish,setPublish]=useState(false),[automatic,setAutomatic]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const reload=useCallback(async()=>{try{const response=await fetchWithTimeout('/api/admin/instagram-import',{cache:'no-store'},20000),data=await response.json();if(!response.ok||!data.ok)throw Error('status');setStatus(data);setError('')}catch{setError('Import status could not load. Your link and existing media are kept.')}},[]);
 useEffect(()=>{void reload()},[reload]);
 async function copy(){const valid=normalizeOwnedInstagramUrl(profile);if(!valid){setError('Use the urban_newsgang profile or one of its public post/reel links.');return}try{await navigator.clipboard.writeText(valid);setNotice('Link copied. Paste it into the GitHub workflow profile field.')}catch{setError('Copy is unavailable. Select and copy the link manually.')}}
 async function submit(event:React.FormEvent){event.preventDefault();if(busy)return;const valid=normalizeOwnedInstagramUrl(profile);if(!valid){setError('Only urban_newsgang can be imported.');return}setBusy(true);setError('');setNotice('');try{const response=await fetchWithTimeout('/api/admin/instagram-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:valid,rightsConfirmed:rights,publishGeneral:publish,autoSync:automatic})},20000),data=await response.json();if(response.status!==202||data.state!=='queued')throw Error(data.error||'not_queued');setNotice('Import queued in GitHub. Open run progress to see imported, skipped and failed items.')}catch(error){setError(error instanceof Error&&error.message==='github_dispatch_not_configured'?'Use Open importer in GitHub; direct dispatch is not configured.':'The import was not confirmed as queued. Check GitHub run progress before trying again.')}finally{setBusy(false)}}
 return <section className="cr-panel" data-instagram-import>
  <div className="cr-toolbar"><div><h2>Instagram → website</h2><p className="cr-muted">Public urban_newsgang posts only. Files and captions are archived in GitHub—not R2. No Instagram login.</p></div><button type="button" className="cr-secondary" onClick={()=>void reload()}>Refresh status</button></div>
  {error&&<p role="alert" className="cr-notice error">{error}</p>}{notice&&<p role="status" className="cr-notice success">{notice}</p>}
  <p className="cr-muted">Archived posts: {status?.archived??'—'} · Published posts: {status?.published??'—'} · Last failed items: {status?.failed??'—'}</p>
  {status?.lastUpdate&&<p className="cr-muted">Last archive update: {new Date(status.lastUpdate).toLocaleString()} · Automatic sync: {status.automation.enabled?'on (every 30 minutes)':'off'}</p>}
  <form onSubmit={submit}>
   <label className="cr-field">Your Instagram link<input type="url" value={profile} onChange={event=>setProfile(event.target.value)} maxLength={250} required autoComplete="off"/></label>
   {status?.canImport&&<div className="cr-toolbar"><button type="button" className="cr-secondary" onClick={()=>void copy()}>Copy approved link</button><a className="cr-primary" href={INSTAGRAM_WORKFLOW} target="_blank" rel="noopener noreferrer">Open importer in GitHub ↗</a><a href={status.archiveUrl} target="_blank" rel="noopener noreferrer">View GitHub archive ↗</a></div>}
   {status?.canImport&&status.dispatchConfigured&&<>
    <p><label><input type="checkbox" checked={rights} onChange={event=>setRights(event.target.checked)} required/> I can republish this account’s content here, including its music.</label></p>
    <p><label><input type="checkbox" checked={publish} onChange={event=>setPublish(event.target.checked)}/> Publish these general-audience posts and their original captions.</label></p>
    <p><label><input type="checkbox" checked={automatic} onChange={event=>setAutomatic(event.target.checked)}/> Check for new public posts every 30 minutes.</label></p>
    <button className="cr-primary" type="submit" disabled={busy||!rights}>{busy?'Queuing…':'Import / sync new posts'}</button>
   </>}
  </form>
  <p className="cr-muted">Recent posts can be downloaded without an Instagram login. Older/login-gated or unavailable posts are reported, never bypassed. GitHub is public; archived files are not private. Caption text is preserved, and completed post IDs are skipped on later runs.</p>
 </section>;
}
