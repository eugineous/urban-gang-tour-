import {fetchWithTimeout} from './fetch-with-timeout';
import {legacyReplyIntent} from './reply-intent';
export type DraftText={subject:string;body:string};
export type DraftEntry=DraftText&{version:string|null;persisted?:(DraftText&{version:string;sendKey:string});loaded:boolean;revision:number;savedRevision:number;status:'loading'|'unsaved'|'saving'|'saved'|'error'|'conflict';pending?:Promise<boolean>};
/** Per-mounted-workspace memory. Private text is stored server-side, never in
 * localStorage. Acknowledgements update only the matching captured revision.
 */
export class ReplyDraftStore{
 readonly entries=new Map<string,DraftEntry>();
 constructor(private channel:'booking'|'gmail',private notify:()=>void){}
 entry(context:string,defaults:DraftText){if(!this.entries.has(context))this.entries.set(context,{...defaults,version:null,loaded:false,revision:0,savedRevision:0,status:'loading'});return this.entries.get(context)!}
 async load(context:string,defaults:DraftText){
  const entry=this.entry(context,defaults);if(entry.loaded)return;
  try{const response=await fetchWithTimeout('/api/admin/reply-drafts?'+new URLSearchParams({channel:this.channel,context}),{cache:'no-store'});const data=await response.json();
   if(!response.ok||!data.ok)throw Error();if(entry.loaded)return;const draft=data.draft;
   entry.version=draft?.version??null;
   if(draft&&!draft.deleted)entry.persisted={subject:draft.subject,body:draft.body,version:draft.version,sendKey:draft.sendKey};
   if(entry.revision===0&&draft){entry.subject=draft.deleted?'':draft.subject;entry.body=draft.deleted?'':draft.body}
   entry.loaded=true;entry.status=entry.revision>entry.savedRevision?'unsaved':'saved';
  }catch{entry.status='error'}this.notify();
 }
 edit(context:string,defaults:DraftText,change:Partial<DraftText>){const entry=this.entry(context,defaults);Object.assign(entry,change);entry.revision++;if(entry.status!=='conflict')entry.status='unsaved';this.notify()}
 async save(context:string,force=false):Promise<boolean>{
  const entry=this.entries.get(context);if(!entry?.loaded)return false;
  if(entry.status==='conflict')return false;
  if(force&&entry.revision===entry.savedRevision&&entry.version===null)entry.revision++;
  if(entry.pending){const saved=await entry.pending;return saved?this.save(context):false}
  if(entry.revision===entry.savedRevision)return true;
  const revision=entry.revision,text={subject:entry.subject,body:entry.body},expectedVersion=entry.version;entry.status='saving';this.notify();
  const operation=(async()=>{try{
   const legacySendKey=expectedVersion===null?legacyReplyIntent(this.channel+':'+context):null;
   const response=await fetchWithTimeout('/api/admin/reply-drafts',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:this.channel,context,expectedVersion,...text,...(legacySendKey?{legacySendKey}:{})})});
   const data=await response.json();if(response.status===409){entry.status='conflict';return false}if(!response.ok||!data.ok||!data.draft?.version)throw Error();
   entry.version=data.draft.version;entry.persisted={...text,version:data.draft.version,sendKey:data.draft.sendKey};entry.savedRevision=revision;entry.status=entry.revision===revision?'saved':'unsaved';return true;
  }catch{entry.status='error';return false}finally{entry.pending=undefined;this.notify()}})();entry.pending=operation;
  return operation;
 }
 async clear(context:string,expected?:DraftText):Promise<boolean>{
  const entry=this.entries.get(context);if(!entry?.loaded)return false;
  expected=expected??{subject:entry.subject,body:entry.body};
  if(expected&&(entry.subject!==expected.subject||entry.body!==expected.body))return true;
  if(entry.pending){await entry.pending;return this.clear(context,expected)}
  const revision=entry.revision;entry.status='saving';this.notify();
  const operation=(async()=>{try{
   const response=await fetchWithTimeout('/api/admin/reply-drafts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:this.channel,context,expectedVersion:entry.version})});const data=await response.json();
   if(response.status===409){entry.status='conflict';return false}if(!response.ok||!data.ok||!data.draft?.version)throw Error();entry.version=data.draft.version;entry.persisted=undefined;
   if(entry.revision===revision){entry.subject='';entry.body='';entry.revision++;entry.savedRevision=entry.revision;entry.status='saved'}else entry.status='unsaved';return true;
  }catch{entry.status='error';return false}finally{entry.pending=undefined;this.notify()}})();entry.pending=operation;return operation;
 }
 get dirty(){return [...this.entries.values()].some(entry=>entry.revision!==entry.savedRevision||entry.status==='saving')}
 sendReference(context:string,text:DraftText){const saved=this.entries.get(context)?.persisted;return saved&&saved.subject===text.subject&&saved.body===text.body?saved.sendKey:null}
}
