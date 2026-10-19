// Actual dry-bundled production adapter, no remote DB/provider/email bindings.
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
const runtime=new Miniflare(options);
try{
 for(const language of ['en','sw','fr','zh-Hans','ru','es']){
  const response=await runtime.dispatchFetch('https://urbangangtour.co.ke/welcome/'+language);
  assert.equal(response.status,200,language);const body=await response.text();
  assert.ok(body.includes('lang="'+language+'"'),language+' content');assert.ok(/hreflang="x-default"/i.test(body),language+' metadata');
  console.log('PASS actual Worker',200,language);
 }
 for(const suffix of ['de','constructor','fr/nested']){
  const response=await runtime.dispatchFetch('https://urbangangtour.co.ke/welcome/'+suffix);
  assert.equal(response.status,404,suffix);assert.equal(response.headers.get('X-Robots-Tag'),'noindex');console.log('PASS actual Worker',404,suffix);
 }
 console.log(JSON.stringify({passed:true,checks:9,remoteBindings:false}));
}finally{await runtime.dispose();}
