import {getCloudflareContext} from '@opennextjs/cloudflare';
import {editorialBundle} from '../editorial-import';
import {importEditorial} from './editorial';
import {applyOwnerEditorialApproval} from './owner-editorial-release';
import {applyEditorialCompletion} from './editorial-completion';
import {applyStoryArtwork} from './story-artwork';
import {applyLegacyMerchRetirement} from './legacy-merch-retirement';
import {bumpProductPublicTruth} from './public-cache';
type LibraryStore={get(key:string):Promise<string|null>;put(key:string,value:string):Promise<void>};
function libraryStore():LibraryStore|undefined{
  try{return (getCloudflareContext().env as unknown as {UGT_MEDIA?:LibraryStore}).UGT_MEDIA}catch{return undefined}
}

/** Operator-staged private KV input, never a public upload URL or webhook.
 * Existing authenticated cron can import drafts only. It cannot approve them.
 */
export async function importStagedEditorialLibrary(){
  const store=libraryStore();
  if(!store)return {staged:false};
  const raw=await store.get('editorial-library/pending-v1');
  if(!raw)return {staged:false};
  if(Buffer.byteLength(raw)>2*1024*1024)throw Error('library_too_large');
  const result=await importEditorial(editorialBundle(JSON.parse(raw)),'private-library-import',false);
  // Fixed immutable staging key is populated only by an operator. Do not delete
  // it here: retries are idempotent and retaining source supports recovery.
  return {staged:true,...result};
}
/** Private operational heartbeat. No draft bodies, URLs, contacts or secrets. */
export async function recordEditorialHeartbeat(result:Record<string,unknown>){
  const store=libraryStore();if(store)await store.put('editorial-library/status-v1',JSON.stringify({checked_at:new Date().toISOString(),...result}));
}
/** Separate explicit owner decision, not inferred from a draft import or timer. */
export async function applyStagedOwnerEditorialApproval(){
  const store=libraryStore();if(!store)return {staged:false};
  const raw=await store.get('editorial-library/owner-approval-v1');if(!raw)return {staged:false};
  if(Buffer.byteLength(raw)>50000)throw Error('approval_too_large');
  return {staged:true,...await applyOwnerEditorialApproval(JSON.parse(raw))};
}
/** Completed manuscripts plus a separate exact publisher decision, not a timer
 * promoting raw assignments. Original brief hashes and slots must still match.
 */
export async function applyStagedEditorialCompletion(){
 const store=libraryStore();if(!store)return {staged:false};
 const raw=await store.get('editorial-library/completion-v1');if(!raw)return {staged:false};
 if(Buffer.byteLength(raw)>2*1024*1024)throw Error('completion_too_large');
 return {staged:true,...await applyEditorialCompletion(JSON.parse(raw))};
}
/** Explicit image-only owner decision for already-public stories. Opaque
 * preview versions stay in private KV, never the cron response/heartbeat. */
export async function applyStagedStoryArtwork(){
 const store=libraryStore();if(!store)return {staged:false};
 const raw=await store.get('editorial-library/story-artwork-v1');if(!raw)return {staged:false};
 if(Buffer.byteLength(raw)>100000)throw Error('story_artwork_too_large');
 const result=await applyStoryArtwork(JSON.parse(raw));
 await store.put('editorial-library/story-artwork-status-v1',JSON.stringify({checked_at:new Date().toISOString(),...result}));
 const {targets,...summary}={targets:undefined as unknown,...result};
 void targets;
 return {staged:true,...summary};
}
/** A separate explicit owner decision retires exact old merchandise artwork.
 * Existing authenticated cron only; it cannot approve replacement stock. */
export async function applyStagedLegacyMerchRetirement(){
 const store=libraryStore();if(!store)return {staged:false};
 const raw=await store.get('catalogue-retirement/pending-v1');if(!raw)return {staged:false};
 if(Buffer.byteLength(raw)>50000)throw Error('legacy_merch_retirement_too_large');
 const value=JSON.parse(raw),result=await applyLegacyMerchRetirement(value);
 if(result.retired>0||result.already>0)bumpProductPublicTruth(Array.isArray(value.targets)?value.targets.map((target:{id?:unknown})=>typeof target.id==='string'?target.id:''):[]);
 await store.put('catalogue-retirement/status-v1',JSON.stringify({checked_at:new Date().toISOString(),...result}));
 return {staged:true,...result};
}
