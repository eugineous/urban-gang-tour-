import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4204';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Fictional local fixtures only');
const out='/workspace/artifacts/story-recovery-20261016';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
try{for(const [name,profile]of [['galaxy-s24',devices['Galaxy S24']],['galaxy-a55',devices['Galaxy A55']],['desktop',{viewport:{width:1440,height:1000}}]]){
 const context=await browser.newContext({...profile,serviceWorkers:'block'});
 const drafts=new Map(),trash=[];let failDraft=false,conflict=false,publishedWrites=0;
 let posts=[{slug:'fixture-story',headline:'Live fixture story',section:'News',image:'',dek:'Fixture summary',body:['Live fixture text'],published:true,date:'2026-10-15',version:'2026-10-16 00:00:00.123456+00'}];
 await context.route('**/api/admin/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/admin/me')return route.fulfill({json:{ok:true,scope:'super_admin',perms:[]}});
  if(url.pathname==='/api/admin/story-workspace'){
   if(req.method()==='GET'){
    if(url.searchParams.has('id')){const draft=drafts.get(url.searchParams.get('id'));return route.fulfill(draft?{json:{ok:true,draft,revisions:[{revision:draft.revision,saved_at:draft.updated_at}]}}:{status:404,json:{error:'not_found'}})}
    return route.fulfill({json:{ok:true,drafts:[...drafts.values()].map(draft=>({...draft,headline:draft.content.headline})),trash}});
   }
   const body=req.postDataJSON();
   if(body.action==='saveDraft'){
    if(failDraft)return route.fulfill({status:503,json:{error:'workspace_unavailable'}});
    const current=drafts.get(body.id);if(current&&current.revision!==body.revision)return route.fulfill({status:409,json:{error:'draft_conflict'}});
    const draft={id:body.id,revision:(current?.revision||0)+1,content:body.content,updated_at:new Date().toISOString()};drafts.set(body.id,draft);return route.fulfill({json:{ok:true,draft}});
   }
   if(body.action==='restoreStory'){const restored=trash.shift();posts=[{...restored,published:false,version:'2026-10-16 01:00:00+00'}];return route.fulfill({json:{ok:true,published:false}})}
  }
  if(url.pathname==='/api/admin/save'){
   const body=req.postDataJSON();
   if(body.kind==='post'){publishedWrites++;return route.fulfill(conflict?{status:409,json:{error:'story_conflict'}}:{json:{ok:true,slug:body.data.slug,version:'new'}})}
   if(body.kind==='deletePost'){trash.push(posts[0]);posts=[];return route.fulfill({json:{ok:true,recoverable:true}})}
  }
  return route.fulfill({json:{ok:true,rows:url.searchParams.get('view')==='posts'?posts:[]}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto(base+'/admin?tab=Content');await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByPlaceholder('Headline *',{exact:true}).fill('A private revised headline');
 await page.getByText('Private copy saved. The public story has not changed.',{exact:true}).waitFor();assert.equal(posts[0].headline,'Live fixture story');assert.equal(publishedWrites,0);checks++;
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone reflow');checks++;
 await page.screenshot({path:out+'/'+name+'-saved-copy.png',fullPage:true});
 await page.reload();await page.getByText('My saved story copies (1)',{exact:true}).click();await page.getByRole('button',{name:/A private revised headline · version/}).click();assert.equal(await page.getByPlaceholder('Headline *',{exact:true}).inputValue(),'A private revised headline');checks++;
 failDraft=true;await page.getByPlaceholder('Headline *',{exact:true}).fill('Keep this text through a failed save');await page.getByRole('alert').filter({hasText:'could not be confirmed saved'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save story',exact:true}).isDisabled(),true);assert.equal(await page.getByPlaceholder('Headline *',{exact:true}).inputValue(),'Keep this text through a failed save');checks++;
 failDraft=false;await page.getByRole('button',{name:'Retry / refresh copies',exact:true}).click();await page.getByText('Private copy saved. The public story has not changed.',{exact:true}).waitFor();await page.getByRole('button',{name:'Save story',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Save story',exact:true}).isEnabled(),true);checks++;
 conflict=true;await page.getByRole('button',{name:'Save story',exact:true}).click();await page.getByRole('alert').filter({hasText:'A newer version exists'}).waitFor();assert.equal(await page.getByPlaceholder('Headline *',{exact:true}).inputValue(),'Keep this text through a failed save');assert.equal(posts[0].headline,'Live fixture story');checks++;
 await page.getByRole('button',{name:'Close editor',exact:true}).click();await page.getByRole('button',{name:'Move to removed',exact:true}).click();await page.getByText('Removed stories (1)',{exact:true}).waitFor();assert.equal(posts.length,0);checks++;
 await page.getByText('Removed stories (1)',{exact:true}).click();await page.getByRole('button',{name:'Restore as draft',exact:true}).click();await page.getByRole('button',{name:'Edit',exact:true}).waitFor();assert.equal(posts[0].published,false);assert.equal(trash.length,0);checks++;
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/'+name+'-restored-draft.png',fullPage:true});await context.close();console.log('PASS',name,'private copies, reload, failed save, version conflict, Trash and Restore');
}console.log(JSON.stringify({checks,localFixtures:true,out}));}finally{await browser.close()}
