import {editorialAsset,editorialSlug,type EditorialAsset} from './editorial-import';

export type StoryArtworkTarget={slug:string;expected_image:string;expected_headline:string;expected_date:string;expected_version:string;assets:EditorialAsset};
export type StoryArtworkManifest={version:1;mode:'owner_approved_story_artwork';phase:'preview'|'apply';scope?:'public'|'scheduled';request_id:string;requested_at:string;expires_at:string;source_request:string;targets:StoryArtworkTarget[]};
export type StoryArtworkInspection={version:1;mode:'inspect_scheduled_story_artwork';request_id:string;requested_at:string;expires_at:string;source_request:string;targets:Pick<StoryArtworkTarget,'slug'|'expected_headline'|'expected_date'>[]};
export type StoryArtworkQueue={version:1;mode:'scheduled_story_artwork_queue';request_id:string;requests:(StoryArtworkManifest|StoryArtworkInspection)[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(key=>allowed.includes(key));
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!v.includes('\u0000');
const instant=(v:unknown):v is string=>text(v,40)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const day=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function validity(raw:Record<string,unknown>){
 if(!text(raw.request_id,36)||!/^([a-f0-9]{8}-)(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(raw.request_id)||!instant(raw.requested_at)||!instant(raw.expires_at)||!text(raw.source_request,3000)||!Array.isArray(raw.targets)||raw.targets.length<1||raw.targets.length>10)throw Error('invalid_story_artwork_manifest');
 const start=Date.parse(raw.requested_at),end=Date.parse(raw.expires_at);
 if(start>Date.now()+60000||end<=start||end-start>86400000)throw Error('invalid_story_artwork_validity');
}

/** Read-only, exact identities. It cannot supply artwork, manuscript or approval. */
export function storyArtworkInspection(raw:unknown):StoryArtworkInspection{
 if(!object(raw)||!keys(raw,['version','mode','request_id','requested_at','expires_at','source_request','targets'])||raw.version!==1||raw.mode!=='inspect_scheduled_story_artwork')throw Error('invalid_story_artwork_inspection');
 validity(raw);const seen=new Set<string>();
 for(const target of raw.targets as unknown[]){
  if(!object(target)||!keys(target,['slug','expected_headline','expected_date'])||!editorialSlug(target.slug)||seen.has(target.slug)||!text(target.expected_headline,500)||!day(target.expected_date))throw Error('invalid_story_artwork_target');
  seen.add(target.slug);
 }
 return raw as StoryArtworkInspection;
}

/** A bounded scheduled-artwork queue, never a general private action executor. */
export function storyArtworkQueue(raw:unknown):StoryArtworkQueue{
 if(!object(raw)||!keys(raw,['version','mode','request_id','requests'])||raw.version!==1||raw.mode!=='scheduled_story_artwork_queue'||typeof raw.request_id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(raw.request_id)||!Array.isArray(raw.requests)||raw.requests.length<1||raw.requests.length>7)throw Error('invalid_story_artwork_queue');
 const requests=raw.requests.map(value=>object(value)&&value.mode==='inspect_scheduled_story_artwork'?storyArtworkInspection(value):storyArtworkManifest(value));
 const ids=new Set<string>(),slugs=new Set<string>(),first=requests[0],phase=first.mode==='inspect_scheduled_story_artwork'?'inspection':first.phase;
 for(const request of requests){
  if(ids.has(request.request_id)||request.request_id===raw.request_id||(request.mode==='owner_approved_story_artwork'&&(request.scope!=='scheduled'||request.phase!==phase))||(request.mode==='inspect_scheduled_story_artwork'&&phase!=='inspection'))throw Error('invalid_story_artwork_queue_batch');
  ids.add(request.request_id);for(const target of request.targets){if(slugs.has(target.slug))throw Error('duplicate_story_artwork_queue_target');slugs.add(target.slug);}
 }
 return {...raw,requests} as StoryArtworkQueue;
}

/** Public presentation only; the stored asset/provenance remains untouched. */
export function storyArtworkPresentation(alt:string|undefined,caption:string|undefined,illustration:boolean){
 return {alt:illustration?alt?.replace(/^AI[\s-]+generated\s+/i,''):alt,caption:illustration?'Editorial illustration':caption};
}

/** Strict private operator data: cannot approve content, execute code or fetch a URL. */
export function storyArtworkManifest(raw:unknown):StoryArtworkManifest{
 if(!object(raw)||!keys(raw,['version','mode','phase','scope','request_id','requested_at','expires_at','source_request','targets'])||raw.version!==1||raw.mode!=='owner_approved_story_artwork'||!['preview','apply'].includes(String(raw.phase))||('scope' in raw&&!['public','scheduled'].includes(String(raw.scope))))throw Error('invalid_story_artwork_manifest');
 validity(raw);
 const seen=new Set<string>();
 const targets=(raw.targets as unknown[]).map((target):StoryArtworkTarget=>{
  if(!object(target)||!keys(target,['slug','expected_image','expected_headline','expected_date','expected_version','assets'])||!editorialSlug(target.slug)||seen.has(target.slug)||!text(target.expected_image,3000)||!text(target.expected_headline,500)||!text(target.expected_version,64)||!/^[a-f0-9]{64}$/.test(target.expected_version)||!day(target.expected_date))throw Error('invalid_story_artwork_target');
  const assets=editorialAsset(target.assets);
  if(!assets.illustration||!/AI-generated editorial illustration/i.test(assets.caption)||!/AI[\s-]+generated|synthetic/i.test(assets.provenance))throw Error('story_artwork_illustration_required');
  seen.add(target.slug);
  return {...target,assets} as StoryArtworkTarget;
 });
 return {...raw,targets} as StoryArtworkManifest;
}
