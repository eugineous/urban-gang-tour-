// Local-only browser fixtures: never publishes marketing or creates real orders.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const base='http://127.0.0.1:4202';
const out='/workspace/artifacts/backend-release-20261015';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const fixture={id:'CAM-FIXTURE-0001',version:1,name:'Browser fixture',headline:'Find your next adventure',description:'Explore the collection.',format:'popup',kind:'announcement',status:'live',image:'',href:'/shop',ctaLabel:'Shop now',startsAt:null,endsAt:null,targets:['*'],priority:10,cooldownHours:24,delaySeconds:5,promoId:null};
let checks=0;
try {
 for(const viewport of [{width:360,height:800},{width:412,height:915},{width:915,height:412},{width:1440,height:900}]) {
  const context=await browser.newContext({viewport,isMobile:viewport.width<1000,hasTouch:viewport.width<1000});
  await context.addInitScript(()=>localStorage.setItem('ugt-consent','no'));
  let live=true;
  await context.route('**/api/campaigns',route=>route.fulfill({json:{campaigns:live?[fixture]:[],validForMs:15000,serverTime:Date.now()}}));
  const page=await context.newPage();
  await page.goto(base+'/shop',{waitUntil:'domcontentloaded'});
  const dialog=page.getByRole('dialog',{name:fixture.headline});
  await dialog.waitFor({state:'visible',timeout:12000});
  const box=await dialog.boundingBox();
  assert.ok(box&&box.x>=0&&box.width<=viewport.width&&box.height<=viewport.height,'dialog fits viewport');checks++;
  await page.screenshot({path:`${out}/campaign-${viewport.width}.png`});
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});checks++;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(5500);
  assert.equal(await page.locator('dialog[open]').count(),0,'session frequency cap');checks++;
  await page.goto(base+'/cart',{waitUntil:'domcontentloaded'});
  assert.equal(await page.getByRole('complementary',{name:'Current campaign'}).count(),0);checks++;
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:412,height:915}});
 let rows=[];
 await context.route('**/api/admin/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/admin/me')return route.fulfill({json:{ok:true,scope:'super_admin',perms:[]}});
  if(url.pathname==='/api/admin/campaigns'){
   if(route.request().method()==='POST'){const body=route.request().postDataJSON();rows=[{...body,id:body.id||fixture.id,version:(body.version||0)+1}];return route.fulfill({json:{ok:true,campaign:rows[0]}})}
   return route.fulfill({json:{campaigns:rows}});
  }
  return route.fulfill({json:{ok:true,rows:[]}});
 });
 const page=await context.newPage();
 await page.goto(base+'/admin?tab=Campaigns',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'New campaign',exact:true}).click();
 await page.getByLabel('Internal name').fill('Browser fixture');
 await page.getByLabel('Headline',{exact:true}).fill(fixture.headline);
 await page.getByLabel('Publication').selectOption('live');
 await page.getByRole('button',{name:'Save campaign',exact:true}).click();
 await page.getByRole('button',{name:'Edit & preview'}).waitFor();
 assert.equal(rows[0].status,'live');checks++;
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.getByRole('button',{name:'Return to draft'}).waitFor();
 assert.equal(rows[0].status,'paused');checks++;
 await page.screenshot({path:out+'/admin-campaigns-mobile.png'});
 await context.close();
 console.log(JSON.stringify({localOnly:true,checks,viewports:4,screenshots:out}));
} finally {await browser.close()}
