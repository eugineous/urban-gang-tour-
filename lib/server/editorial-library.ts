import {getCloudflareContext} from '@opennextjs/cloudflare';
import {editorialBundle} from '../editorial-import';
import {importEditorial} from './editorial';
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
