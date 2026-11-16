'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {youtubeVideoId} from '@/lib/managed-video';
import {useUnsavedWarning} from '@/lib/client/use-unsaved-warning';
type Budget={usedBytes:number;limitBytes:number;dailyWrites:number;dailyLimit:number};
export default function MediaAdditions({onComplete}:{onComplete:()=>void}){
 const [budget,setBudget]=useState<Budget|null>(null),[checked,setChecked]=useState(false),[url,setUrl]=useState(''),[caption,setCaption]=useState(''),[category,setCategory]=useState('Hosting'),[rights,setRights]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),pending=useRef(false);
 useUnsavedWarning(Boolean(url.trim()||caption.trim()));
 useEffect(()=>{const controller=new AbortController();fetchWithTimeout('/api/admin/media-budget',{signal:controller.signal,cache:'no-store'},30000).then(async r=>{const d=await r.json();if(r.ok&&d.ok&&Number.isFinite(d.usedBytes)&&Number.isFinite(d.limitBytes)&&!controller.signal.aborted)setBudget(d)}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setChecked(true)});return()=>controller.abort()},[]);
 async function submit(event:FormEvent){event.preventDefault();if(pending.current)return;setError('');setSaved(false);if(!youtubeVideoId(url)){setError('Enter a YouTube video, Shorts or youtu.be link.');return}pending.current=true;setBusy(true);
  try{const r=await fetchWithTimeout('/api/admin/gallery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'video.link',data:{url,caption,category,rightsConfirmed:rights}})});const d=await r.json();if(!r.ok||!d.ok||!Number.isSafeInteger(d.row?.id))throw Error();setUrl('');setCaption('');setRights(false);setSaved(true);onComplete()}catch{setError('The video link could not be saved. Your entries are kept.')}finally{setBusy(false);pending.current=false}
 }
 return <section className="cr-panel" data-media-additions>
  <div className="cr-toolbar"><h2>Storage and video links</h2>{budget?<span>{Math.ceil(budget.usedBytes/1024/1024)} / {Math.floor(budget.limitBytes/1024/1024)} MB reserved</span>:<span className="cr-muted">{checked?'Storage check unavailable. Uploads still require a verified budget.':'Checking storage…'}</span>}</div>
  <p className="cr-muted">Uploads stop at the configured limit. No automatic storage upgrade. Older records include a safety allowance.</p>
  <details><summary>Add a YouTube video</summary><p className="cr-muted">Use a link for longer videos. The website stores the link and caption.</p>
   <form onSubmit={submit} aria-busy={busy}><label className="cr-field">Video link<input type="url" value={url} onChange={e=>setUrl(e.target.value)} required maxLength={500} disabled={busy}/></label><label className="cr-field">Caption<input value={caption} onChange={e=>setCaption(e.target.value)} required maxLength={300} disabled={busy}/></label><label className="cr-field">Category<input value={category} onChange={e=>setCategory(e.target.value)} required maxLength={120} disabled={busy}/></label><p><label><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)} required disabled={busy}/> We can publish this video, including its audio.</label></p><button className="cr-primary" disabled={busy||!rights} type="submit">{busy?'Saving…':'Save privately'}</button></form>
  </details>{error&&<p role="alert" className="cr-notice error">{error}</p>}{saved&&<p role="status" className="cr-notice success">Video saved privately. Review it in the library before publishing.</p>}
 </section>;
}
