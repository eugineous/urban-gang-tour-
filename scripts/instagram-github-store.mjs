import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {INSTAGRAM_REPOSITORY,publicInstagramProjection,validateInstagramArchive} from '../lib/instagram-public.mjs';
const exec=promisify(execFile);
export const TAG='instagram-media';
export async function gh(args){return(await exec('gh',args,{maxBuffer:12*1024*1024,timeout:120000})).stdout}
export async function releaseInfo(){try{return JSON.parse(await gh(['api','repos/'+INSTAGRAM_REPOSITORY+'/releases/tags/'+TAG]))}catch(error){if(String(error.stderr||'').includes('404'))return null;throw Error('github_release_access_failed')}}
async function readAsset(file){return JSON.parse(await gh(['api','repos/'+INSTAGRAM_REPOSITORY+'/releases/assets/'+file.id,'-H','Accept: application/octet-stream']))}
export async function archiveIndex(release){
 const file=(release?.assets||[]).filter(a=>/^archive-index-\d{13}\.json$/.test(a.name)).sort((a,b)=>b.name.localeCompare(a.name))[0];
 if(!file)return null;const value=await readAsset(file);if(!validateInstagramArchive(value))throw Error('stored_archive_index_invalid');return value;
}
export async function readPublicIndex(release){const file=release?.assets?.find(a=>a.name==='instagram-public.json');if(!file)return null;const value=publicInstagramProjection(await readAsset(file));if(!value)throw Error('stored_public_index_invalid');return value}
const content=value=>JSON.stringify(value?{account:value.account,posts:value.posts,automation:value.automation}:null);
export function scheduledInstagramWorkNeeded(stored,current){return !!stored&&(stored.automation?.enabled===true||content(publicInstagramProjection(stored))!==content(current))}
export async function reconcileInstagramProjection(stored,current,save){
 const next=publicInstagramProjection(stored);if(!next)throw Error('invalid_archive_checkpoint');
 if(content(next)!==content(current))await save(next);return next;
}
export async function publishIndex(value,dir,summary=value.summary){
 const projection=publicInstagramProjection({...value,summary});if(!projection)throw Error('invalid_public_projection');
 const path=join(dir,'instagram-public.json');await writeFile(path,JSON.stringify(projection));
 // Only this generated index is replaceable. Immutable checkpoints repair an interrupted replacement.
 await gh(['release','upload',TAG,path,'--repo',INSTAGRAM_REPOSITORY,'--clobber']);
}
