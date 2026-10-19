'use client';
import {useState} from 'react';
import ImageUploadField from './ImageUploadField';
import type {EditorialBundle,EditorialItem,EditorialAsset} from '@/lib/editorial-import';

type Row={slug:string;headline:string;editorial_kind:string;editorial_status:string;editorial_revision:number;scheduled_at:string;published_at:string|null;published:boolean;overdue:boolean};
type Detail=Row&{editorial_source:EditorialItem;asset_manifest:EditorialAsset;editorial_review:Record<string,unknown>};
const emptyAssets:EditorialAsset={hero:'',og:'',alt:'',caption:'',rights:'',provenance:'',illustration:false};
const time=(value:string)=>new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}).format(new Date(value));
const wall=(value:string)=>new Date(new Date(value).getTime()+3*3600000).toISOString().slice(0,16);
const errors:Record<string,string>={editorial_conflict:'This item changed. Reload it before trying again.',forbidden:'Only the owner can import, edit or approve this library.',incomplete_article:'This is still a brief or short draft. Write and verify the full article first.',image_missing:'An image is missing. Upload both WebP images before approval.',image_dimensions_required:'Use a 1600 × 900 WebP cover and a separate 1200 × 630 WebP share image.',private_editorial_webp_required:'Upload both images here as WebP files. Public URLs are not accepted for unpublished artwork.',duplicate_article:'This matches an existing article. Review and revise it instead of duplicating it.',review_checks_required:'Complete every verification check and add source notes before approval.',use_editorial_calendar:'Use the editorial calendar to keep the schedule and checks intact.'};

/** A workflow inside Stories, backed by the existing posts table—not another CMS. */
export default function EditorialCalendar({canPublish}:{canPublish:boolean}){
 const [open,setOpen]=useState(false),[items,setItems]=useState<Row[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[monitor,setMonitor]=useState('');
 const [bundle,setBundle]=useState<EditorialBundle|null>(null),[preview,setPreview]=useState<{slug:string;state:string;kind:string}[]|null>(null);
 const [selected,setSelected]=useState<Detail|null>(null),[draft,setDraft]=useState<EditorialItem|null>(null),[assets,setAssets]=useState<EditorialAsset>(emptyAssets),[uploading,setUploading]=useState(false),[sourceUrl,setSourceUrl]=useState(''),[sourceNote,setSourceNote]=useState(''),[disclosure,setDisclosure]=useState(''),[checks,setChecks]=useState<Record<string,boolean>>({});
 async function api(body?:unknown,query=''){
  const response=await fetch('/api/admin/editorial'+query,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(errors[data.error]||String(data.error||'Editorial service unavailable. Please retry.').replaceAll('_',' '));return data;
 }
 async function load(){const data=await api();setItems(data.items);setMonitor(data.monitor?'Last scheduler check: '+time(data.monitor.checked_at):'The scheduler has not recorded a check yet.');}
 async function run(work:()=>Promise<void>){setBusy(true);setMessage('');setFailed(false);try{await work()}catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Could not complete this. Your draft is kept.')}finally{setBusy(false)}}
 async function pick(row:Row){const data=await api(undefined,'?slug='+encodeURIComponent(row.slug));setSelected(data.item);setDraft(data.item.editorial_source);setAssets({...emptyAssets,...data.item.asset_manifest});setChecks({});setSourceUrl('');setSourceNote('');setDisclosure(String(data.item.editorial_review.disclosure||''));}
 function update<K extends keyof EditorialItem>(key:K,value:EditorialItem[K]){setDraft(current=>current?{...current,[key]:value}:current)}
 const nextBundle=():EditorialBundle=>({version:1,source_sha256:'0'.repeat(64),items:draft?[draft]:[]});
 return <section className="cr-panel cr-editorial" aria-label="Editorial calendar" style={{marginBottom:20,minWidth:0}}>
  <h2>Editorial calendar</h2><p>Import once. Prepare each story. Release only after its checks pass.</p>
  <button className="cr-secondary" disabled={busy} onClick={()=>void run(async()=>{if(!open)await load();setOpen(!open)})}>{open?'Close calendar':'Open calendar'}</button>
  {open&&<>
   <p className="cr-muted">All times are East Africa Time (Africa/Nairobi). Reporting briefs stay private. No social posts are sent.</p>
   <p>{monitor} Automatic research and writing are not configured.</p>
   <button className="cr-secondary" disabled={busy} onClick={()=>void run(load)}>Refresh</button>
   {canPublish&&<details className="cr-disclosure"><summary>Import an editorial library</summary><p>Select the private import JSON prepared from the ZIP. Preview first; importing never publishes or overwrites existing stories.</p>
    <label>Private import file<input type="file" accept="application/json,.json" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void run(async()=>{if(file.size>2*1024*1024)throw Error('Choose an import file smaller than 2 MB.');const value=JSON.parse(await file.text());setBundle(value);setPreview(null);setMessage('File loaded locally. Preview before importing.');})}}/></label>
    <div className="cr-actions"><button className="cr-secondary" disabled={busy||!bundle} onClick={()=>void run(async()=>{const data=await api({action:'preview',bundle});setPreview(data.items);setMessage('Preview ready. Nothing has been imported or published.');})}>Preview import</button><button className="cr-primary" disabled={busy||!bundle||!preview||preview.some(i=>i.state==='conflict')} onClick={()=>void run(async()=>{const data=await api({action:'import',bundle});setMessage(`${data.inserted} added privately, ${data.unchanged} already present, ${data.conflicts.length} conflicts. Nothing published.`);setPreview(null);await load()})}>Import privately</button></div>
    {preview&&<ul>{preview.map(item=><li key={item.slug} style={{overflowWrap:'anywhere'}}>{item.kind==='assignment'?'Reporting brief':'Article draft'} · {item.state} · {item.slug}</li>)}</ul>}
   </details>}
   <p>{items.length} calendar items · {items.filter(i=>i.editorial_kind==='article').length} article drafts · {items.filter(i=>i.editorial_kind==='assignment').length} reporting assignments</p>
   {!items.length&&<p>No library has been imported yet. A staged private library is imported at the next existing scheduler run.</p>}
   <div className="cr-record-grid">{items.map(item=><article className="cr-story-card" key={item.slug}><div className="cr-card-body"><p className="cr-muted">{time(item.scheduled_at)} EAT</p><h3>{item.headline}</h3><p>{item.editorial_kind==='assignment'?'Reporting brief':item.published?'Approved article':'Private draft'} · {item.editorial_status.replaceAll('_',' ')}{item.overdue?' · Past its slot; held':''}</p><button className="cr-secondary" disabled={busy} onClick={()=>void run(()=>pick(item))}>Open item</button></div></article>)}</div>
   {selected&&draft&&<section className="cr-card" aria-label="Prepare editorial item" style={{marginTop:20,minWidth:0}}><h3>{selected.headline}</h3><p>Revision {selected.editorial_revision}. Save before reviewing. Approval uses the saved version, not unsaved fields.</p>
    <label>Title<input disabled={!canPublish||busy||selected.published||!!selected.published_at} value={draft.title} onChange={e=>update('title',e.target.value)}/></label>
    <label>Summary<textarea disabled={!canPublish||busy||selected.published||!!selected.published_at} value={draft.description} onChange={e=>update('description',e.target.value)}/></label>
    <label>Planned release (EAT)<input type="datetime-local" disabled={!canPublish||busy||selected.published||!!selected.published_at} value={wall(draft.scheduled_at)} onChange={e=>{if(e.target.value){update('scheduled_at',e.target.value+':00+03:00');update('date',e.target.value.slice(0,10))}}}/></label>
    <label>Content type<select value={draft.kind} disabled={!canPublish||busy||selected.published||!!selected.published_at} onChange={e=>update('kind',e.target.value as EditorialItem['kind'])}><option value="assignment">Reporting brief — never public</option><option value="article">Full article draft — needs checks</option></select></label>
    <label>Article or reporting notes<textarea rows={16} value={draft.markdown} disabled={!canPublish||busy||selected.published||!!selected.published_at} onChange={e=>update('markdown',e.target.value)} style={{width:'100%',maxWidth:'100%',boxSizing:'border-box'}}/></label>
    {canPublish&&<div className="cr-actions"><button className="cr-primary" disabled={busy||selected.published||!!selected.published_at} onClick={()=>void run(async()=>{await api({action:'update',slug:selected.slug,revision:selected.editorial_revision,bundle:nextBundle()});await pick(selected);await load();setMessage('Saved privately. Verification must be completed for this version.');})}>Save private changes</button><button className="cr-secondary" disabled={busy} onClick={()=>void run(async()=>{await api({action:'hold',slug:selected.slug,revision:selected.editorial_revision});await pick(selected);await load();setMessage('Held. This item is not public.');})}>Hold / take offline</button></div>}
    {canPublish&&!selected.published&&selected.editorial_source.kind==='article'&&<details className="cr-disclosure"><summary>Verify and approve the saved article</summary><p>These are recorded editorial checks, not an AI fact-check. Verify every claim against sources before checking the boxes. Late approval uses the actual release time; it does not backdate publication.</p>
     <ImageUploadField purpose="stories" label="Cover — 1600 × 900 WebP" value={assets.hero} onChange={hero=>setAssets(v=>({...v,hero}))} onBusyChange={setUploading}/>
     <ImageUploadField purpose="stories" label="Share image — 1200 × 630 WebP" value={assets.og} onChange={og=>setAssets(v=>({...v,og}))} onBusyChange={setUploading}/>
     {(['alt','caption','rights','provenance'] as const).map(key=><label key={key}>{({alt:'Describe the image for readers who cannot see it',caption:'Public image caption',rights:'Permission or licence evidence',provenance:'Who created it / source record'})[key]}<textarea value={assets[key]} onChange={e=>setAssets(v=>({...v,[key]:e.target.value}))}/></label>)}
     <label><input type="checkbox" checked={assets.illustration} onChange={e=>setAssets(v=>({...v,illustration:e.target.checked}))}/>This is an editorial illustration (caption must say so)</label>
     <label>Primary source URL<input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></label><label>Evidence notes — claims checked and any additional sources<textarea rows={5} value={sourceNote} onChange={e=>setSourceNote(e.target.value)}/></label><label>Public transparency / sponsorship disclosure<textarea value={disclosure} onChange={e=>setDisclosure(e.target.value)}/></label>
     {Object.entries({facts_checked:'Facts and current links verified',rights_checked:'Both images and their use are permitted',originality_checked:'Checked the archive for overlapping stories',safeguarding_checked:'Privacy, consent and safeguarding checks complete'}).map(([key,label])=><label key={key}><input type="checkbox" checked={!!checks[key]} onChange={e=>setChecks(v=>({...v,[key]:e.target.checked}))}/>{label}</label>)}
     <button className="cr-primary" disabled={busy||uploading||Object.values(checks).filter(Boolean).length!==4||!sourceUrl||!sourceNote||!disclosure||JSON.stringify(draft)!==JSON.stringify(selected.editorial_source)} onClick={()=>void run(async()=>{await api({action:'approve',slug:selected.slug,revision:selected.editorial_revision,assets,review:{...checks,disclosure,sources:[{url:sourceUrl,note:sourceNote,checked_at:new Date().toISOString()}]}});await pick(selected);await load();setMessage('Approved. The saved article can appear only when its release time arrives.');})}>Approve scheduled release</button>
    </details>}
    <button className="cr-secondary" disabled={busy} onClick={()=>{setSelected(null);setDraft(null)}}>Close item</button>
   </section>}
  </>}
  {busy&&<p role="status">Working… Your entries are kept.</p>}{message&&<p role={failed?'alert':'status'}>{message}</p>}
 </section>;
}
