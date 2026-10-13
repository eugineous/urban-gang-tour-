import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE||'http://127.0.0.1:4186';
const out=process.env.EVIDENCE_DIR||'evidence/reconstruction-final';
const paths=JSON.parse(await readFile('data/public-page-routes.json','utf8'));
const results=[],canonicals=new Set();
for(const path of paths){
 const response=await fetch(base+path),html=await response.text();
 assert.equal(response.status,200,path);
 const canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];
 assert.ok(title&&title.length>5,path+' title');
 assert.ok(canonical,path+' canonical');
 assert.equal(new URL(canonical).href,'https://urbangangtour.co.ke'+(path==='/'?'/':path),path+' canonical');
 assert.equal(canonicals.has(canonical),false,path+' duplicate canonical');
 canonicals.add(canonical);results.push({path,title,canonical,status:response.status});
}
assert.equal((await fetch(base+'/not-a-real-tour-page')).status,404);
await mkdir(out,{recursive:true});await writeFile(out+'/metadata-results.json',JSON.stringify(results,null,2));
console.log('PASS',results.length,'server-rendered public titles and unique canonical URLs; unknown route 404');
