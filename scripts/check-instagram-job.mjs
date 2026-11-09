import {appendFile} from 'node:fs/promises';
import {INSTAGRAM_PROFILE,normalizeOwnedInstagramUrl} from '../lib/instagram-public.mjs';
import {releaseInfo,archiveIndex,readPublicIndex,scheduledInstagramWorkNeeded} from './instagram-github-store.mjs';
let enabled=true;
if(process.env.GITHUB_EVENT_NAME==='schedule'){
 const release=await releaseInfo();enabled=scheduledInstagramWorkNeeded(await archiveIndex(release),await readPublicIndex(release));
}else{
 if(process.env.IG_IMPORT_RIGHTS_CONFIRMED!=='true')throw Error('Confirm that this account’s content can be republished before starting.');
 if(!normalizeOwnedInstagramUrl(process.env.IG_IMPORT_PROFILE||INSTAGRAM_PROFILE))throw Error('Only the urban_newsgang account can be imported.');
}
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'enabled='+String(enabled)+'\n');
if(!enabled&&process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'Automatic Instagram sync is not enabled. Start one owner-confirmed manual import first.\n');
