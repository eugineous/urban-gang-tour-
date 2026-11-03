import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';
const enabled=existsSync('/usr/bin/chromium');
let browser:Browser,script:string,css:string;
const products=[{id:'alpha',name:'Alpha Tee',price:1000,category:'Apparel',image:'/assets/ugt-logo.png',stock:3,variants:[]},{id:'beta',name:'Beta Cap',price:500,category:'Headwear',image:'/assets/ugt-logo.png',stock:3,variants:[]}];
beforeAll(async()=>{
 if(!enabled)return;
 const output=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./ui/i18n/LanguageProvider';import{AppShell}from'./app/_components/AppShell';import{LiveCommerce}from'./app/_components/LiveCommerce';const categoryName=location.pathname.startsWith('/shop/category/')?({apparel:'Apparel',headwear:'Headwear'})[location.pathname.split('/').at(-1)]:undefined;createRoot(document.getElementById('app')).render(<LanguageProvider><AppShell><LiveCommerce view="shop" categoryName={categoryName}/></AppShell></LanguageProvider>);`},bundle:true,write:false,outdir:'shop-flow-fixture',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},external:['/assets/*','/fonts/*'],plugins:[{name:'fixture-navigation',setup(builder){builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>location.pathname;'}));}}]});
 const shellCss=[...readFileSync('app/layout.tsx','utf8').matchAll(/import '\.\/([^']+\.css)'/g)].map(([,file])=>readFileSync('app/'+file,'utf8')).join('\n');
 script=output.outputFiles.find(file=>file.path.endsWith('.js'))!.text;css=shellCss+'\n'+output.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
},30000);
afterAll(async()=>{await browser?.close()});
it.skipIf(!enabled)('navigates category cards and pills to category-only pages and keeps resets within that category',async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
 const posts:string[]=[],errors:string[]=[];
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()!=='GET'){posts.push(url.pathname);return route.abort();}
  if(url.pathname==='/fixture.js')return route.fulfill({contentType:'application/javascript',body:script});
  if(url.pathname==='/api/site-data/products')return route.fulfill({json:{ok:true,products}});
  if(url.pathname.startsWith('/assets/')&&existsSync('public'+url.pathname))return route.fulfill({body:readFileSync('public'+url.pathname)});
  if(request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main id="app"></main><script src="/fixture.js"></script></body></html>'});
  return route.abort();
 });
 try{
  const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1/shop?item=alpha');await page.locator('[data-shop-product="alpha"]').waitFor();
  const expectVisibleHeading=async()=>{
   const bounds=await page.evaluate(()=>({header:document.querySelector('.site-header')!.getBoundingClientRect().bottom,heading:document.querySelector('main h1')!.getBoundingClientRect().top,intro:document.querySelector('main#main-content > section > header')!.getBoundingClientRect().top}));
   expect(bounds.intro).toBeGreaterThanOrEqual(bounds.header);
   expect(bounds.heading).toBeGreaterThanOrEqual(bounds.header);
  };
  await expectVisibleHeading();
  expect(await page.locator('[data-shop-product="beta"]').count()).toBe(0);
  await page.locator('[data-shop-collection="Headwear"]').click();
  await page.waitForURL('**/shop/category/headwear');
  await page.locator('[data-shop-product="beta"]').waitFor();
  expect(await page.locator('[data-shop-product="alpha"]').count()).toBe(0);
  expect(await page.locator('h1').innerText()).toBe('Headwear');
  await expectVisibleHeading();
  await page.setViewportSize({width:1024,height:900});await expectVisibleHeading();
  await page.setViewportSize({width:390,height:844});await expectVisibleHeading();
  expect(await page.locator('main#main-content > section').evaluate(section=>getComputedStyle(section).paddingTop)).toBe('0px');
  await page.setViewportSize({width:1200,height:900});
  await page.locator('html').evaluate(html=>{html.dataset.phoneViewport='wide';html.style.setProperty('--ugt-phone-zoom','2')});
  expect(await page.locator('main#main-content > section').evaluate(section=>getComputedStyle(section).paddingTop)).toBe('0px');
  await expectVisibleHeading();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('searchbox').fill('no such merchandise');
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();
  await page.locator('[data-shop-product="beta"]').waitFor();
  expect(await page.locator('[data-shop-product="alpha"]').count()).toBe(0);
  expect(new URL(page.url()).pathname).toBe('/shop/category/headwear');
  await page.getByRole('link',{name:'Apparel',exact:true}).click();
  await page.waitForURL('**/shop/category/apparel');await page.locator('[data-shop-product="alpha"]').waitFor();
  expect(await page.locator('[data-shop-product="beta"]').count()).toBe(0);
  await page.reload();await page.locator('[data-shop-product="alpha"]').waitFor();
  expect(await page.locator('[data-shop-product="beta"]').count()).toBe(0);
  await page.getByRole('link',{name:'All merchandise',exact:true}).first().click();
  await page.waitForURL('**/shop');await page.locator('[data-shop-product="alpha"]').waitFor();await page.locator('[data-shop-product="beta"]').waitFor();
  expect(posts).toEqual([]);expect(errors).toEqual([]);
 }finally{await context.close()}
},20000);
