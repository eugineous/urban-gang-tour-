#!/usr/bin/env node
// Node 20+ local Codex workflow. Never accepts a credential on the command line.
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const MAX_IMAGE=5*1024*1024,MAX_JSON=16*1024;
export async function readCredential(env=process.env){
 let token=env.UGT_EDITOR_TOKEN;
 if(!token){
  const path=resolve(env.UGT_EDITOR_TOKEN_FILE||'.ugt-editor-token');
  let info;try{info=await stat(path)}catch{throw Error('Set UGT_EDITOR_TOKEN or create the ignored .ugt-editor-token file (chmod 600).')}
  if(!info.isFile()||info.size>128||(process.platform!=='win32'&&(info.mode&0o077)!==0))throw Error('Credential file must be a regular private file (chmod 600), at most 128 bytes.');
  token=(await readFile(path,'utf8')).trim();
 }
 if(!/^ugt_edit_[A-Za-z0-9_-]{43}$/.test(token))throw Error('Invalid editor credential format.');
 return token;
}
function baseUrl(env){
 const base=new URL(env.UGT_EDITOR_BASE_URL||'https://urbangangtour.co.ke');
 if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||!['https://urbangangtour.co.ke','https://www.urbangangtour.co.ke'].includes(base.origin))throw Error('UGT_EDITOR_BASE_URL must be an owned HTTPS UGT origin.');
 return base;
}
async function localFile(path,max){const info=await stat(path);if(!info.isFile()||!info.size||info.size>max)throw Error('Input file is empty, too large, or not a regular file.');const bytes=await readFile(path);if(bytes.length>max)throw Error('Input file is too large.');return bytes}
function imageType(bytes){if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'image/webp';throw Error('Poster must be JPEG, PNG or WebP; do not rename another format.')}
export async function run(argv,env=process.env,fetcher=fetch){
 const [command,eventPath]=argv;
 if(!['upload','draft'].includes(command)||!eventPath||argv.length!==2)throw Error('Usage: node scripts/editor-tools.mjs upload poster.jpg | draft event.json');
 const base=baseUrl(env),token=await readCredential(env);
 async function call(path,body,type){
  let response;try{response=await fetcher(new URL(path,base),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':type},body,redirect:'error',signal:AbortSignal.timeout(45000)})}catch{throw Error('Request failed or timed out. A draft may already exist; retry with the same requestId and identical body.')}
  let data;try{data=await response.json()}catch{throw Error('Server returned an unreadable response.')}
  if(!response.ok)throw Error('UGT request rejected ('+response.status+'): '+(typeof data.error==='string'&&!data.error.includes(token)&&/^[a-z_]{1,80}$/.test(data.error)?data.error:'request_failed'));
  return data;
 }
 async function upload(path){const bytes=await localFile(path,MAX_IMAGE);return call('/api/editor-tools/posters',bytes,imageType(bytes))}
 if(command==='upload')return upload(eventPath);
 const event=JSON.parse((await localFile(eventPath,MAX_JSON)).toString('utf8'));
 if(!event||typeof event!=='object'||Array.isArray(event)||Object.keys(event).some(key=>!['requestId','posterId','kind','name','eventDate','eventTime','venue','city','description'].includes(key))||typeof event.name!=='string'||!event.name.trim()||!['school','ticketed','past'].includes(event.kind)||!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$/.test(event.requestId||''))throw Error('Event JSON requires UUID v4 requestId, name and kind (school, ticketed or past), with supported draft fields only.');
 return call('/api/editor-tools/drafts',JSON.stringify(event),'application/json');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 run(process.argv.slice(2)).then(result=>process.stdout.write(JSON.stringify(result,null,2)+'\n')).catch(error=>{process.stderr.write((error instanceof SyntaxError?'Invalid event JSON.':error.message)+'\n');process.exitCode=1});
}
