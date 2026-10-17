'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {storyDraftContent,type StoryDraftContent} from '@/lib/story-draft';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {btn,card} from './ops/ui';

export type StoryEditor = Record<string,unknown> & {_draftId?:string;_draftRevision?:number};
type DraftRow={id:string;headline:string;revision:number;updated_at:string};
type TrashRow={slug:string;headline:string;removed_at:string};
type Revision={revision:number;saved_at:string};
type DraftState={revision:number;fingerprint:string;running:boolean;blocked:boolean};
async function request(path:string,body?:unknown){
  const response=await fetchWithTimeout('/api/admin/story-workspace'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'workspace_unavailable');
  return data;
}

/** Sits beside the existing editor, not a replacement design. Private snapshots never write to posts. */
export default function StoryRecovery({editor,onOpen,onSaved,onRestored,refreshKey=0}:{editor:StoryEditor|null;onOpen:(story:StoryEditor)=>void;onSaved:(id:string,fingerprint:string)=>void;onRestored:()=>void;refreshKey?:number}){
  const [drafts,setDrafts]=useState<DraftRow[]>([]),[trash,setTrash]=useState<TrashRow[]>([]);
  const [error,setError]=useState(''),[status,setStatus]=useState(''),[working,setWorking]=useState(false);
  const [loadError,setLoadError]=useState('');
  const [tick,setTick]=useState(0),[revisions,setRevisions]=useState<Revision[]>([]);
  const states=useRef(new Map<string,DraftState>());
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
  const reload=useCallback(async()=>{
    try{const data=await request('');if(alive.current){setDrafts(data.drafts);setTrash(data.trash);setLoadError('')}}catch{if(alive.current)setLoadError('Could not load saved copies. Your current text is still here. Retry when connected.')}
  },[]);
  useEffect(()=>{void reload()},[reload,refreshKey]);
  const id=editor?._draftId;
  let content:StoryDraftContent|null=null,validationError='';
  try{if(editor)content=storyDraftContent(editor)}catch{validationError='Check the story date, image address and field lengths. This copy has not saved yet.'}
  const fingerprint=content?JSON.stringify(content):'';
  useEffect(()=>{
    if(!id||!fingerprint)return;
    let current=states.current.get(id);
    if(!current){current={revision:editor?._draftRevision||0,fingerprint:editor?._draftRevision?fingerprint:'',running:false,blocked:false};states.current.set(id,current)}
    if(current.fingerprint===fingerprint){onSaved(id,fingerprint);return}
    if(current.running||current.blocked)return;
    setStatus('Changes waiting to save…');
    const timer=setTimeout(async()=>{
      if(!current||current.running||current.blocked)return;
      current.running=true;setStatus('Saving private copy…');setError('');
      try{
        const result=await request('',{action:'saveDraft',id,revision:current.revision,content:JSON.parse(fingerprint)});
        if(result.draft?.id!==id||result.draft.revision!==current.revision+1)throw Error('not_confirmed');
        current.revision=result.draft.revision;current.fingerprint=fingerprint;
        if(alive.current){onSaved(id,fingerprint);setStatus('Private copy saved. The public story has not changed.');void reload()}
      }catch(e){
        current.blocked=true;
        if(alive.current){setStatus('Private copy not saved yet.');setError(e instanceof Error&&e.message==='draft_conflict'
          ?'Another tab changed this saved copy. Your text is still here. Save as a new copy to keep both.'
          :'This copy could not be confirmed saved. Keep this page open and retry; your text is still here.');}
      }finally{current.running=false;if(alive.current)setTick(value=>value+1)}
    },1500);
    return()=>clearTimeout(timer);
  },[id,fingerprint,tick,editor?._draftRevision,reload,onSaved]);

  const open=async(draftId:string,revision?:number)=>{
    if(editor&&!confirm('Open this saved copy? Your current editor will close. If its save failed, cancel and save a new copy first.'))return;
    setWorking(true);setError('');
    try{
      const result=await request('?id='+encodeURIComponent(draftId)+(revision?'&revision='+revision:''));
      const draft=result.draft;
      // A recovered revision becomes a NEW private copy; it never rewrites history.
      const nextId=revision?crypto.randomUUID():draft.id;
      states.current.set(nextId,{revision:revision?0:draft.revision,fingerprint:revision?'':JSON.stringify(storyDraftContent(draft.content)),running:false,blocked:false});
      onOpen({...draft.content,_draftId:nextId,_draftRevision:revision?0:draft.revision});
      setRevisions(revision?[]:result.revisions||[]);setStatus(revision?'Older version opened as a new private copy.':'Saved copy opened. Review it before publishing.');
    }catch{setError('Could not open this copy. Nothing in the editor has been replaced.')}
    finally{setWorking(false)}
  };
  const restore=async(slug:string)=>{
    if(!confirm('Restore this story as an unpublished draft? It will not go live until reviewed and published.'))return;
    setWorking(true);setError('');
    try{await request('',{action:'restoreStory',slug});setStatus('Story restored as a draft. Find it in the story list below.');onRestored();await reload()}
    catch{setError('Could not restore. If this address is already in use, the existing story is protected. Try refreshing.')}
    finally{setWorking(false)}
  };
  return <aside style={{...card,marginBottom:16}} aria-label="Story recovery">
    {editor&&<><p role="status" aria-live="polite">{validationError||status||'Private copies save automatically while you write.'}</p>
      <p style={{fontSize:13}}>A private copy does not publish, unpublish or change the live story. Keep this page open until saving finishes.</p></>}
    {error&&<p role="alert">{error}</p>}
    {loadError&&<p role="alert">{loadError}</p>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button style={btn} disabled={working} onClick={()=>{if(id){const state=states.current.get(id);if(state)state.blocked=false;setTick(v=>v+1)}void reload()}}>Retry / refresh copies</button>
      {editor&&<button style={btn} disabled={working} onClick={()=>{onOpen({...editor,_draftId:crypto.randomUUID(),_draftRevision:0});setRevisions([]);setError('');setStatus('Saving a separate copy…')}}>Save as a new copy</button>}
    </div>
    <details style={{marginTop:12}}><summary>My saved story copies ({drafts.length})</summary>
      <ul>{drafts.map(draft=><li key={draft.id}><button style={btn} disabled={working} onClick={()=>void open(draft.id)}>{draft.headline||'Untitled story'} · version {draft.revision}</button> <time dateTime={draft.updated_at}>{new Date(draft.updated_at).toLocaleString()}</time></li>)}</ul>
      {!drafts.length&&<p>No saved copies loaded yet.</p>}
    </details>
    {!!revisions.length&&<details><summary>Earlier versions of this copy</summary><ul>{revisions.map(revision=><li key={revision.revision}><button style={btn} disabled={working} onClick={()=>id&&void open(id,revision.revision)}>Open version {revision.revision} as a new copy</button></li>)}</ul></details>}
    <details style={{marginTop:12}}><summary>Removed stories ({trash.length})</summary>
      <ul>{trash.map(story=><li key={story.slug}>{story.headline||story.slug} <button style={btn} disabled={working} onClick={()=>void restore(story.slug)}>Restore as draft</button></li>)}</ul>
      {!trash.length&&<p>No removed stories loaded.</p>}
    </details>
  </aside>;
}
