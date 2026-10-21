// Actual production Worker HTTP checks; no browser/device/layout claims.
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
const runtime=new Miniflare(options);let checks=0;const titles=new Set();
try{
 for(const route of ['/','/experience','/events','/portfolio','/shop','/cart','/checkout','/book','/about','/blog','/gallery','/contact-us','/international','/accessibility','/welcome/en','/account','/organizer/login','/partners','/faq','/privacy-policy','/cookie-policy','/terms','/refund-policy','/ticket-terms','/reels','/press','/work-with-us','/marketplace','/affiliates']){
  const response=await runtime.dispatchFetch('https://urbangangtour.co.ke'+route);
  const html=await response.text();assert.equal(response.status,200,route);
  assert.equal((html.match(/<header class="site-header"/g)||[]).length,1,route+' header');
  assert.equal((html.match(/<main(?:\s|>)/g)||[]).length,1,route+' main');
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,route+' heading');
  const title=html.match(/<title>(.*?)<\/title>/)?.[1];assert.ok(title,route+' title');assert.ok(!titles.has(title),route+' unique title');titles.add(title);
  assert.match(html,/aria-controls="site-menu"/,route+' navigation control');assert.match(html,/class="mobile-menu-label">Menu<\/span>/,route+' mobile menu label');
  assert.match(html,/class="desktop-menu-label">More /,route+' desktop secondary navigation');
  assert.match(html,/class="start-link" href="\/contact-us">Let’s talk/,route+' direct contact action');
  assert.ok(!html.includes('mobile-shop-link')&&!html.includes('mobile-about-link'),route+' alternate controls removed');
  assert.match(html,/aria-label="Account and help"/,route+' support');
  if(route!=='/reels'&&route!=='/checkout'){
   assert.match(html,/data-site-footer/,route+' grouped footer');
   for(const label of ['Explore','Connect','Help','Policies'])assert.ok(html.includes('aria-label="'+label+'"'),route+' '+label+' footer group');
  }
  if(route==='/'){
   assert.match(html,/data-contact-launcher/,route+' restored contact launcher');
   assert.match(html,/data-host-invitation/,route+' dormant host invitation');
   assert.match(html,/aria-label="Booking questions"/,route+' inline FAQ');
   assert.equal((html.match(/<details(?:\s|>)/g)||[]).length,5,route+' default FAQs');
   assert.match(html,/Featured work\./,route+' featured archive');
  }
  console.log('PASS actual Worker shared controls',route);checks++;
 }
 console.log(JSON.stringify({passed:true,checks,remoteBindings:false,browserVerification:false}));
}finally{await runtime.dispose();}
