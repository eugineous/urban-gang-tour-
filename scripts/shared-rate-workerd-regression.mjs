import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const source = await readFile(new URL('../shared-rate-limit.mjs', import.meta.url),'utf8');
const persist = await mkdtemp(path.join(os.tmpdir(),'ugt-rate-proof-'));
const readRequests=Number(process.env.READ_REQUESTS||4000);
assert.ok(Number.isSafeInteger(readRequests)&&readRequests>0&&readRequests<=60000);
const options={name:'ugt-rate-proof',compatibilityDate:'2024-09-23',durableObjects:{LIMITER:{className:'SharedRateLimiter',useSQLite:true}},modules:[
  {type:'ESModule',path:'entry.mjs',contents:`export {SharedRateLimiter} from './shared.mjs';export default{fetch(request,env){const network=new URL(request.url).searchParams.get('network')||'fixture';return env.LIMITER.get(env.LIMITER.idFromName(network)).fetch(request)}};`},
  {type:'ESModule',path:'shared.mjs',contents:source.slice(0,source.indexOf('const credentials'))},
]};
let mf;
const take=async(scope,network='fixture')=>(await mf.dispatchFetch('http://fixture.test/take?network='+network,{method:'POST',body:JSON.stringify({scope})})).json();
try {
  mf=new Miniflare({...convertV4MiniflareOptions(options),resourcePersistencePath:persist});
  const results=await Promise.all(Array.from({length:20},()=>take('admin-password')));
  assert.equal(results.filter(result=>result.allowed).length,5);
  console.log('Concurrent credential budget: exactly 5 of 20 accepted.');
  await mf.dispose();mf=new Miniflare({...convertV4MiniflareOptions(options),resourcePersistencePath:persist});
  assert.equal((await take('admin-password')).allowed,false);
  console.log('Counter persisted across a fresh workerd runtime.');
  let allowed=0;
  for(const [scope,total] of [['purchase',1000],['public-read',readRequests]]) {
    const began=performance.now(),latencies=[];
    for(let start=0;start<total;start+=100) {
      const responses=await Promise.all(Array.from({length:Math.min(100,total-start)},async()=>{const at=performance.now();const result=await take(scope,'venue');latencies.push(performance.now()-at);return result}));
      assert.ok(responses.every(response=>response.allowed));allowed+=responses.length;
    }
    console.log(`${scope}: ${total} venue requests accepted.`);
    latencies.sort((a,b)=>a-b);const elapsed=performance.now()-began;
    console.log(JSON.stringify({scope,requests:total,elapsedMs:Math.round(elapsed),requestsPerMinute:Math.round(total*60000/elapsed),p95Ms:Math.round(latencies[Math.floor(latencies.length*.95)]),limiterOnly:true}));
  }
  console.log(JSON.stringify({realWorkerd:true,persistentSQLite:true,credentialAllowed:5,credentialDenied:15,venueAccepted:allowed}));
} finally {
  if(mf)await mf.dispose();
  await rm(persist,{recursive:true,force:true});
}
