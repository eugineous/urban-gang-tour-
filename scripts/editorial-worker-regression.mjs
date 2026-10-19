// Real built production Worker; no remote secrets, DB, customer or provider calls.
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import path from 'node:path';
import assert from 'node:assert/strict';
const bundle=path.resolve(process.argv[2]);
const options=convertV4MiniflareOptions({workers:[{
 name:'urban-gang-tour',modules:true,modulesRoot:bundle,scriptPath:path.join(bundle,'worker.js'),
 compatibilityDate:'2024-09-23',compatibilityFlags:['nodejs_compat'],kvNamespaces:['UGT_MEDIA'],
 serviceBindings:{WORKER_SELF_REFERENCE:'urban-gang-tour'},
 assets:{directory:path.resolve('.open-next/assets'),binding:'ASSETS',run_worker_first:true,assetConfig:{html_handling:'none'},routerConfig:{has_user_worker:true}},
}]});
options.workers[0].config.exports.default={type:'worker'};
const runtime=new Miniflare(options);let checks=0;
try{
 for(const [route,method,status] of [['/blog/fictional-unpublished-fixture','GET',404],['/api/admin/editorial','GET',401],['/api/admin/editorial','POST',401],['/api/internal/cron/editorial','POST',503],['/media/editorial-library/pending-v1','GET',404]]){
  const response=await runtime.dispatchFetch('https://urbangangtour.co.ke'+route,{method});
  const text=await response.text();assert.equal(response.status,status,route);
  assert.ok(!text.includes('source_sha256'),route+' private source');
  if(route.startsWith('/api/'))assert.match(response.headers.get('Cache-Control'),/no-store/);
  console.log('PASS actual Worker',status,method,route);checks++;
 }
 console.log(JSON.stringify({passed:true,checks,remoteBindings:false}));
}finally{await runtime.dispose();}
