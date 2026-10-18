// Read-only production smoke checks. Never signs in or creates records/charges.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const base='https://urbangangtour.co.ke';
const release='admin-studio-release-20261018-v1';
const out='/workspace/artifacts/admin-release-20261018';
await mkdir(out,{recursive:true});
const scratch=await mkdtemp(path.join(os.tmpdir(),'ugt-live-smoke-'));
const results=[];
async function get(route,expected=200){
 const id=results.length,headersFile=path.join(scratch,id+'.headers'),bodyFile=path.join(scratch,id+'.body');
 const code=execFileSync('curl',['--silent','--show-error','--max-time','30','--dump-header',headersFile,'--output',bodyFile,'--write-out','%{http_code}',base+route],{encoding:'utf8',timeout:35000}).trim();
 const raw=await readFile(headersFile,'utf8'),body=await readFile(bodyFile,'utf8');
 const headers=new Map([...raw.matchAll(/^([^:\r\n]+):\s*([^\r\n]*)/gm)].map(match=>[match[1].toLowerCase(),match[2].trim()]));
 assert.ok((Array.isArray(expected)?expected:[expected]).includes(Number(code)),route+' status '+code);
 assert.equal(headers.get('x-ugt-release'),release,route+' release');
 results.push({path:route,status:Number(code),release:headers.get('x-ugt-release'),cache:headers.get('cache-control')});
 console.log('PASS',code,route);
 return {headers,body};
}
try{
 for(const route of ['/','/admin','/shop','/about','/faq','/author/eugine-micah','/author/lucy-ogunde','/events','/tour-stops','/portfolio']){
  const {headers,body}=await get(route);
  assert.match(headers.get('content-type')||'',/text\/html/);
  assert.equal(headers.get('x-content-type-options'),'nosniff');
  assert.equal(headers.get('x-frame-options'),'SAMEORIGIN');
  assert.ok(body.includes('<html'),'HTML document, not an empty response');
 }
 for(const route of ['/api/admin/me','/api/admin/media-library','/api/admin/website?path=%2Fabout','/api/admin/story-workspace','/api/admin/data?view=orders']){
  const {headers}=await get(route,401);assert.match(headers.get('cache-control')||'',/no-store/);
 }
 for(const [route,key]of [['/api/site-data/events','events'],['/api/site-data/products','products'],['/api/site-data/gallery','photos'],['/api/site-data/posts','posts']]){
  const data=JSON.parse((await get(route)).body);assert.equal(data.ok,true);assert.ok(Array.isArray(data[key]),route+' list');results.at(-1).count=data[key].length;
  if(key==='events'){
   const before=JSON.parse(await readFile('/tmp/ugt-publish-before-events.json','utf8'));
   const ids=rows=>rows.map(row=>row.id).sort();
   assert.deepEqual(ids(data.events),ids(before.events),'Existing public event IDs must be retained');
  }
 }
 const {headers}=await get('/the-gang',[301,308]);assert.ok((headers.get('location')||'').endsWith('/about'));
 const worker=await get('/sw.js');assert.ok(worker.body.includes('ugt-'+release));assert.match(worker.headers.get('cache-control')||'',/no-store/);
 const client=await get('/release-client.js');assert.ok(client.body.includes(release));
 await writeFile(path.join(out,'live-smoke.json'),JSON.stringify({release,passed:true,checkedAt:new Date().toISOString(),results},null,2));
 console.log(JSON.stringify({passed:true,checks:results.length,out}));
}catch(error){
 await writeFile(path.join(out,'live-smoke.json'),JSON.stringify({release,passed:false,error:String(error),results},null,2));
 throw error;
}
