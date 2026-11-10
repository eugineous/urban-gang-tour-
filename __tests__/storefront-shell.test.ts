import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {chromium,type Browser,type Page} from 'playwright';
import {afterAll,beforeAll,expect,it,vi} from 'vitest';

vi.mock('next/navigation',()=>({usePathname:vi.fn()}));
import {usePathname} from 'next/navigation';
import {AppShell} from '@/app/_components/AppShell';

let browser:Browser;
const css=[...readFileSync('app/layout.tsx','utf8').matchAll(/import '\.\/([^']+\.css)'/g)]
 .map(([,file])=>readFileSync('app/'+file,'utf8')).join('\n');
const hrefs=['/events','/portfolio','/gallery','/clients','/about','/shop','/book'];

beforeAll(async()=>{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})});
afterAll(async()=>{await browser?.close()});

async function shellPage(path:string,width:number){
 vi.mocked(usePathname).mockReturnValue(path);
 const html=renderToStaticMarkup(createElement(AppShell,null,'Content'));
 const header=html.match(/<header\b[\s\S]*?<\/header>/)?.[0]||'';
 const dialog=html.match(/<dialog\b[\s\S]*?<\/dialog>/)?.[0]||'';
 const dock=html.match(/<nav class="storefront-dock"[\s\S]*?<\/nav>/)?.[0]||'';
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.route('**/*',route=>route.abort());
 await page.setContent(`<style>${css}</style>${header}${dialog}${dock}<main style="height:1800px"></main>`);
 return page;
}

async function expectLight(page:Page,selector:string){
 const surface=await page.locator(selector).evaluate(element=>{
  const style=getComputedStyle(element),channels=style.backgroundColor.match(/[\d.]+/g)?.map(Number)||[];
  return {channels,color:style.color};
 });
 expect(surface.channels.length).toBeGreaterThanOrEqual(3);
 expect(surface.channels.slice(0,3).every(channel=>channel>=220)).toBe(true);
 expect(surface.channels[3]??1).toBe(1);
 const luminance=(channels:number[])=>channels.slice(0,3).map(value=>{const s=value/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 const foreground=surface.color.match(/[\d.]+/g)!.map(Number);
 expect((luminance(surface.channels)+.05)/(luminance(foreground)+.05)).toBeGreaterThanOrEqual(4.5);
}

// Catches a storefront header/dock leaking onto the public site or /shop.
it.each(['/','/gallery','/shop'])('renders the same premium public navigation on %s',async path=>{
 const page=await shellPage(path,1440);
 try{
  expect(await page.locator('.header-content > .desktop-nav a').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).toEqual(hrefs);
  expect(await page.locator('.site-header [role="search"],.storefront-dock').count()).toBe(0);
  expect(await page.locator('.site-header .brand img').getAttribute('src')).toBe('/assets/ugt-logo.png');
  expect(await page.locator('.site-header .tickets-link').getAttribute('href')).toBe('/my-tickets');
  expect(await page.locator('.site-header .tickets-link').innerText()).toBe('My tickets');
  expect(await page.locator('.site-header .cart-link').getAttribute('href')).toBe('/cart');
  expect(await page.locator('.site-header .cart-link').getAttribute('aria-label')).toBe('Cart (0)');
  expect(await page.locator('.site-header .start-link').getAttribute('href')).toBe('/apply');
  expect(await page.locator('[aria-controls="site-menu"]').count()).toBe(1);
 }finally{await page.close()}
});

// Catches black/transparent header states and navigation/action overlap.
it('keeps the desktop header and centered navigation pill light at entry and after scrolling',async()=>{
 const page=await shellPage('/',1440);
 try{
  for(const width of [1024,1100,1280,1440]){
   await page.setViewportSize({width,height:900});
   for(const elevated of ['false','true']){
    await page.locator('.site-header').evaluate((header,elevated)=>{header.setAttribute('data-elevated',elevated);header.setAttribute('data-dark','true')},elevated);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await expectLight(page,'.site-header');await expectLight(page,'.desktop-nav');
    const bounds=await page.locator('.site-header').evaluate(header=>{
     const nav=header.querySelector('.desktop-nav')!,actions=header.querySelector('.header-actions')!,brand=header.querySelector('.brand')!;
     const n=nav.getBoundingClientRect(),a=actions.getBoundingClientRect(),b=brand.getBoundingClientRect();
     return {navLeft:n.left,navRight:n.right,brandRight:b.right,actionsLeft:a.left,sameRow:Math.abs(n.top-a.top)<20,overflow:nav.scrollWidth>nav.clientWidth+1,targets:[...header.querySelectorAll('.desktop-nav a,.header-actions a')].filter(link=>link.getClientRects().length).map(link=>link.getBoundingClientRect().height)};
    });
    expect(bounds.navLeft).toBeGreaterThanOrEqual(bounds.brandRight);
    expect(bounds.navRight).toBeLessThanOrEqual(bounds.actionsLeft);
    expect(bounds.sameRow).toBe(true);expect(bounds.overflow).toBe(false);
    expect(bounds.targets.length).toBeGreaterThanOrEqual(8);expect(bounds.targets.every(height=>height>=44)).toBe(true);
   }
  }
 }finally{await page.close()}
},20000);

// Catches a dark responsive/menu surface and a hidden header menu trigger.
it('keeps phone, tablet and zoomed-phone navigation light with one usable menu',async()=>{
 const page=await shellPage('/shop',390);
 try{
  for(const width of [200,320,390,768]){
   await page.setViewportSize({width,height:900});
   await expectLight(page,'.site-header');
   expect(await page.locator('.menu-toggle').isVisible()).toBe(true);
   expect(await page.locator('.desktop-nav').isVisible()).toBe(false);
   await page.locator('#site-menu').evaluate((dialog:HTMLDialogElement)=>dialog.showModal());
   await expectLight(page,'#site-menu');await expectLight(page,'.menu-dialog-heading');
   expect(await page.locator('#site-menu .menu-groups a').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).toEqual(hrefs);
   expect(await page.locator('#site-menu .menu-dialog-heading button').evaluate(button=>button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await page.locator('#site-menu').evaluate((dialog:HTMLDialogElement)=>dialog.close());
  }
  await page.setViewportSize({width:1200,height:900});
  await page.locator('html').evaluate(html=>{html.dataset.phoneViewport='wide';html.style.setProperty('--ugt-phone-zoom','2')});
  await expectLight(page,'.site-header');expect(await page.locator('.menu-toggle').isVisible()).toBe(true);
  expect(await page.locator('.desktop-nav').isVisible()).toBe(false);
 }finally{await page.close()}
},20000);
