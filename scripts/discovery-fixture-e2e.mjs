// Exercise real discovery components with deterministic published-content fixtures.
// These records never leave the test server or modify business data.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const port=Number(process.env.PORT||4193);
const entry=`import {createRoot} from 'react-dom/client';import Site from './ui/components/Site';
const posts=[{id:'new-school-story',headline:'A newly published school story',dek:'Reviewed newsroom content',section:'Schools & campuses',date:'2026-10-10',img:'/image.webp'},{id:'new-cultural-story',headline:'Culture story',dek:'Reviewed newsroom content',section:'Talent & culture',date:'2026-10-09',img:'/image.webp'}];
createRoot(document.getElementById('root')).render(<Site path={location.pathname} query={{}} screens={[]} products={[]} events={[]} posts={posts}/>);`;
const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'discovery-fixture.tsx',loader:'tsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},platform:'browser'});
const css=['app/design.css','app/modern.css','app/refinements.css','app/mobile-experience.css'].map(p=>readFileSync(p,'utf8')).join('\n');
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><div id="root"></div><script src="/fixture.js"></script>';
const server=createServer((req,res)=>{if(req.url==='/fixture.js'){res.setHeader('Content-Type','application/javascript');res.end(bundle.outputFiles[0].text)}else{res.setHeader('Content-Type','text/html');res.end(html)}});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
let passed=0;
try{
 for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',serviceWorkers:'block'});const page=await context.newPage();
  await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/api/captions'){const asset=u.searchParams.get('asset');if(u.searchParams.get('format')!=='json')return route.fulfill({body:'WEBVTT\n\n00:00:00.000 --> 00:00:10.000\nReviewed dialogue fixture.\n',contentType:'text/vtt'});return route.fulfill({json:{available:true,asset,language:'en',transcript:'Reviewed dialogue fixture.',track:'/api/captions?asset='+asset},contentType:'application/json'})}if(u.hostname!=='127.0.0.1'||u.pathname.startsWith('/api/')||route.request().resourceType()==='image'||route.request().resourceType()==='media')return route.fulfill({status:404,body:''});return route.continue()});
  const base='http://127.0.0.1:'+port;
  await page.goto(base+'/blog?category=schools');await page.getByRole('button',{name:'Schools & campuses',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.news-card h2')?.textContent==='A newly published school story');assert.equal(await page.locator('.news-card').count(),1);passed++;
  const originalHistory=await page.evaluate(()=>history.length);await page.getByRole('searchbox',{name:'Search stories'}).fill('published');assert.equal(await page.evaluate(()=>history.length),originalHistory);assert.equal(new URL(page.url()).searchParams.get('q'),'published');passed++;
  await page.getByRole('button',{name:'Talent & culture',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('category'),'culture');await page.goBack();await page.waitForFunction(()=>document.querySelector('.news-categories button[aria-pressed="true"]')?.textContent==='Schools & campuses');assert.equal(await page.getByRole('searchbox',{name:'Search stories'}).inputValue(),'published');passed++;
  await page.goto(base+'/blog?category=not-a-category');await page.waitForFunction(()=>document.querySelector('.news-categories button[aria-pressed="true"]')?.textContent==='All stories');assert.equal(new URL(page.url()).searchParams.has('category'),false);passed++;
  await page.goto(base+'/gallery?category=Campus&q=impossible-name');await page.getByRole('heading',{name:'No matching collections'}).waitFor();await page.getByRole('button',{name:'Reset gallery filters'}).click();await page.waitForFunction(()=>document.querySelectorAll('.archive-collections .collection-card').length>0);assert.equal(new URL(page.url()).search,'');passed++;
  await page.goto(base+'/gallery?category=Campus');await page.getByRole('button',{name:'Campus',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.filter-bar button[aria-pressed="true"]')?.textContent==='Campus');assert.ok(await page.locator('.archive-collections .collection-card').count()>0);passed++;
  await page.goto(base+'/events?category=not-real&source=missing&when=oops');await page.getByRole('heading',{name:'Find your next live experience.'}).waitFor();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('category'));assert.equal(new URL(page.url()).search,'');await page.getByRole('button',{name:'Entertainment',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('category'),'Entertainment');passed++;
  await page.goto(base+'/gallery/machakos-campus');const film=page.locator('.video-roll-card').first();await film.click();await page.locator('.film-viewer video track').waitFor({state:'attached'});await page.getByText('Read video transcript',{exact:true}).click();assert.equal(await page.locator('.film-viewer .media-transcript p').innerText(),'Reviewed dialogue fixture.');passed++;
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'Selected video modal must fit '+viewport.width);passed++;
  await context.close();
 }
 console.log(JSON.stringify({passed,viewports:3,flows:['deep links','new story categorization','typing history','Back restoration','unknown-filter recovery','gallery empty/reset','events filters','reviewed video track/transcript','modal fit']}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
