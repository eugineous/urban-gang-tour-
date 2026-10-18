'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {categoryId,categoryName,type EventCategory,type EventCategoryInput} from '@/lib/event-categories';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {inp,btnSmall} from './ui';
import styles from './Events.module.css';
const validRow=(row:EventCategory)=>!!row&&categoryId(row.id)&&!!categoryName(row.name)&&typeof row.active==='boolean'&&Number.isSafeInteger(row.version)&&row.version>0;
type Form={id?:string;name:string;original:string;active:boolean;version:number};
export default function EventCategoryField({value,onChange,disabled,onBusy,onDirty,onLoaded}:{value:string;onChange:(value:string)=>void;disabled:boolean;onBusy:(value:boolean)=>void;onDirty:(value:boolean)=>void;onLoaded:(value:boolean)=>void}){
 const [rows,setRows]=useState<EventCategory[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(false),[form,setForm]=useState<Form|null>(null);
 const saving=useRef(false),mounted=useRef(true),loadRevision=useRef(0);
 useEffect(()=>{onBusy(pending);return()=>onBusy(false)},[pending,onBusy]);
 useEffect(()=>{onDirty(!!form&&form.name!==form.original);return()=>onDirty(false)},[form,onDirty]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  const revision=++loadRevision.current;
  try{const response=await fetchWithTimeout('/api/admin/event-categories',{cache:'no-store',signal});const data=await response.json();if(!response.ok||!data.ok||!Array.isArray(data.rows)||!data.rows.every(validRow))throw Error();if(mounted.current&&!signal?.aborted&&revision===loadRevision.current){setRows(data.rows);setLoaded(true);onLoaded(true);setError('')}}
  catch{if(mounted.current&&!signal?.aborted&&revision===loadRevision.current)setError('Categories could not be loaded. Your event entries are kept. You can save without adding a category.')}
 },[onLoaded]);
 useEffect(()=>{mounted.current=true;const controller=new AbortController();void load(controller.signal);return()=>{mounted.current=false;controller.abort()}},[load]); // Category list is private and loaded once per opened editor.
 async function save(input:EventCategoryInput){
  if(saving.current||disabled)return;
  saving.current=true;loadRevision.current++;onBusy(true);setPending(true);setError('');setNotice('');
  try{
   const response=await fetchWithTimeout('/api/admin/event-categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)},20_000);
   const data=await response.json().catch(()=>({}));
   if(!mounted.current)return;
   if(!response.ok||data.error){setError(data.error==='category_exists'?'That name already exists. Refresh categories to use or restore it.':data.error==='category_conflict'?'This category changed elsewhere. Your text is kept. Cancel this category edit and refresh to review the latest version.':response.status===401?'Your session expired. Sign in again in another tab; your event entries are kept.':'The category could not be saved. Your entries are kept.');return}
   const row=data.row as EventCategory;
   if(!data.ok||!validRow(row)||row.name!==input.name||(input.action==='create'&&(!row.active||row.version!==1))||(input.action==='update'&&(row.id!==input.id||row.active!==input.active||row.version!==input.version+1))){setError('The server did not confirm this category change. Check the category list before retrying.');return}
   setRows(current=>[row,...current.filter(item=>item.id!==row.id)].sort((a,b)=>a.name.localeCompare(b.name)));setLoaded(true);onLoaded(true);setForm(null);
   if(input.action==='create'){onChange(row.id);setNotice('Category created and selected. Save the event to keep this selection.')}
   else setNotice(row.active?'Category saved. Assigned events keep their category.':'Category paused for new assignments. Existing events keep it.');
  }catch{if(mounted.current)setError('The category change could not be confirmed. Your entries are kept. Refresh categories before retrying.')}
  finally{saving.current=false;if(mounted.current){setPending(false);onBusy(false)}}
 }
 return <section className={styles.categoryField} aria-label="Event category">
  <label htmlFor="event-category">Category <small>(optional)</small></label>
  <select id="event-category" style={inp} value={value} disabled={disabled||pending||!loaded} onChange={event=>onChange(event.target.value)}><option value="">No category yet</option>{value&&!rows.some(row=>row.id===value)&&<option value={value}>Current category — refresh to load its name</option>}{rows.filter(row=>row.active||row.id===value).map(row=><option key={row.id} value={row.id}>{row.name}{!row.active?' (paused)':''}</option>)}</select>
  <div className={styles.actions}><button type="button" style={btnSmall} disabled={disabled||pending||!!form} onClick={()=>{setForm({name:'',original:'',active:true,version:0});setError('');setNotice('')}}>New category</button><button type="button" style={btnSmall} disabled={disabled||pending} onClick={()=>void load()}>Refresh categories</button></div>
  {!loaded&&!error&&<p role="status">Loading categories…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {form&&<div className={styles.categoryForm}><label htmlFor="category-name">{form.id?'Rename category':'New category name'}</label><input id="category-name" style={inp} value={form.name} maxLength={80} disabled={disabled||pending} onChange={event=>setForm({...form,name:event.target.value})}/><div className={styles.actions}><button type="button" style={btnSmall} disabled={disabled||pending||!categoryName(form.name)} onClick={()=>{const name=categoryName(form.name);if(name)void save(form.id?{action:'update',id:form.id,name,active:form.active,version:form.version}:{action:'create',name})}}>{pending?'Saving category…':'Save category'}</button><button type="button" style={btnSmall} disabled={disabled||pending} onClick={()=>setForm(null)}>Cancel category edit</button></div></div>}
  <details><summary>Manage categories</summary><p>Rename, pause or restore. Pausing does not hide or delete events.</p><ul className={styles.categoryList}>{rows.map(row=><li key={row.id}><strong>{row.name}</strong>{!row.active&&<span>Paused</span>}<div className={styles.actions}><button type="button" style={btnSmall} aria-label={'Rename '+row.name} disabled={disabled||pending||!!form} onClick={()=>{setForm({id:row.id,name:row.name,original:row.name,active:row.active,version:row.version});setError('');setNotice('')}}>Rename</button><button type="button" style={btnSmall} aria-label={(row.active?'Pause ':'Restore ')+row.name} disabled={disabled||pending||!!form} onClick={()=>void save({action:'update',id:row.id,name:row.name,active:!row.active,version:row.version})}>{row.active?'Pause':'Restore'}</button></div></li>)}</ul>{loaded&&!rows.length&&<p>No categories yet. Create your first one above.</p>}</details>
 </section>;
}
