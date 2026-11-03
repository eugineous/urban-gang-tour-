// Render the real footer and its native language/preferences controls offline.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {existsSync,readFileSync} from 'node:fs';
import postcss from 'postcss';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {describe,expect,it,vi} from 'vitest';
import {ContactFooter} from '@/ui/components/ContactInterface';
import {FOOTER_NAVIGATION} from '@/lib/site-navigation';
import {INTERFACE_LOCALES} from '@/lib/i18n/locale';

const props=()=>({onCookies:vi.fn(),focusView:false,onFocus:vi.fn()});
const css=readFileSync('ui/components/ContactChrome.module.css','utf8');
function values(selector:string,property:string){const result:string[]=[];postcss.parse(css).walkRules(selector,rule=>rule.walkDecls(property,decl=>{result.push(decl.value)}));return result;}

describe('premium public footer',()=>{
 it('restores the contact invitation before the genuine discovery and help destinations',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,props()));
  expect(FOOTER_NAVIGATION).toHaveLength(2);
  expect(FOOTER_NAVIGATION.map(group=>group.items.length)).toEqual([6,6]);
  expect(html).toContain('<h2>Let’s talk</h2>');
  expect(html).toContain('Events, hosting &amp; production');
  expect(html.indexOf('<h2>Let’s talk</h2>')).toBeLessThan(html.indexOf('aria-label="Explore"'));
  expect(html).not.toContain('<form');expect(html).not.toContain('<video');
  expect(html).toContain('data-site-footer');
  expect(html.match(/<a(?:\s|>)/g)).toHaveLength(25);
  expect(html).toContain('href="/app"');
  expect(html).toContain('href="/vendors"');
 });
 it('honours the existing invitation visibility choice on focused customer pages',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,{...props(),form:false,path:'/contact-us'}));
  expect(html).not.toContain('<h2>Let’s talk</h2>');
  expect(html).toContain('aria-label="Contact Urban Gang Tour"');
  expect(html).toContain('data-language-control');
 });
 it('preserves direct email, WhatsApp, five social accounts and legal access',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,props()));
  for(const value of ['mailto:admin@urbangangtour.co.ke','https://wa.me/254799886247','Email us','WhatsApp','/privacy-policy','/cookie-policy','/terms','/refund-policy'])expect(html).toContain(value);
  for(const name of ['Instagram','YouTube','TikTok','Facebook','X'])expect(html).toContain('aria-label="'+name+'"');
  expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(6);
 });
 it('keeps native selection local on private and payment pages',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,{...props(),path:'/checkout'}));
  expect(html).toContain('Your choice applies immediately.');
  expect(html).not.toContain('translate.google.com');
 });
 it('keeps cookie reopening and focus mode as explicit rendered controls',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,props()));
  expect(html).toContain('>Cookie settings</button>');
  expect(html).toContain('aria-pressed="false">Focus view: off</button>');
 });
 it('retains compact aligned tracks, wrapping, visible focus and 44px controls',()=>{
  expect(values('.columns','grid-template-columns')).toContain('repeat(2,minmax(0,1fr))');
  expect(values('.columns','grid-template-columns')).toContain('minmax(220px,1.4fr) repeat(2,minmax(0,1fr))');
  expect(values('.contactLinks>a','min-height')).toEqual(['44px']);
  expect(values('.linkGroup>a','min-height')).toEqual(['44px']);
  expect(values('.legal a,.preferences button','min-height')).toEqual(['44px']);
  expect(values('.socials>a','width')).toEqual(['44px']);
  expect(values('.socials','flex-wrap')).toEqual(['wrap']);
  expect(values('.footer :is(a,button,select):focus-visible','outline')).toEqual(['3px solid #55d9ed']);
 });
 it.skipIf(!existsSync('/usr/bin/chromium'))('keeps the rendered contact action, native choices and preferences usable across phone, tablet and desktop',async()=>{
  const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
   import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
   import {LanguageProvider} from './ui/i18n/LanguageProvider';import {ContactFooter} from './ui/components/ContactInterface';
   function Fixture(){const [cookies,setCookies]=useState(false),[focus,setFocus]=useState(false);return <LanguageProvider><ContactFooter onCookies={()=>setCookies(true)} focusView={focus} onFocus={()=>setFocus(value=>!value)}/>{cookies&&<dialog open aria-label="Cookie settings"><button onClick={()=>setCookies(false)}>Close settings</button></dialog>}</LanguageProvider>}
   createRoot(document.getElementById('app')).render(<Fixture/>);
  `},bundle:true,write:false,outdir:'/tmp/ugt-footer-regression',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'offline-footer',setup(builder){builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/";'}));}}]});
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
   const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(5000);
   await context.route('**/*',route=>new URL(route.request().url()).pathname==='/fixture'?route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><div id="app"></div>'}):route.abort());
   await page.goto('http://127.0.0.1/fixture');
   await page.addStyleTag({content:readFileSync('app/design.css','utf8')});
   await page.addStyleTag({content:bundle.outputFiles.find(file=>file.path.endsWith('.css'))!.text});
   await page.addScriptTag({content:bundle.outputFiles.find(file=>file.path.endsWith('.js'))!.text});
   const footer=page.locator('[data-site-footer]');
   await footer.getByRole('heading',{name:'Let’s talk',exact:true}).waitFor();
   const contact=footer.getByRole('link',{name:'Let’s talk',exact:true});
   expect(await contact.getAttribute('href')).toBe('/contact-us');
   expect(await footer.getByRole('combobox').locator('option').count()).toBe(6);
   for(const width of [320,768,1440]){
    await page.setViewportSize({width,height:1000});
    expect(await footer.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    expect(await footer.locator('a,button,select').evaluateAll(elements=>elements.every(element=>{const bounds=element.getBoundingClientRect();return bounds.height>=44&&bounds.width>=44}))).toBe(true);
    expect((await contact.boundingBox())!.width).toBeLessThan(240);
   }
   for(const locale of INTERFACE_LOCALES){
    await footer.getByRole('combobox').selectOption(locale);
    const labels={en:'Let’s talk',sw:'Tuzungumze',fr:'Parlons-en','zh-Hans':'聊一聊',ru:'Давайте поговорим',es:'Hablemos'};
    await footer.getByRole('heading',{name:labels[locale],exact:true}).waitFor();
    expect(await page.evaluate(()=>localStorage.getItem('ugt-interface-language-v1'))).toBe(locale);
   }
   await footer.getByRole('combobox').selectOption('en');
   await footer.getByRole('button',{name:'Cookie settings',exact:true}).click();
   expect(await page.getByRole('dialog',{name:'Cookie settings'}).isVisible()).toBe(true);
   await page.getByRole('button',{name:'Close settings'}).click();
   await footer.getByRole('button',{name:'Focus view: off',exact:true}).click();
   expect(await footer.getByRole('button',{name:'Focus view: on',exact:true}).getAttribute('aria-pressed')).toBe('true');
   await page.keyboard.press('Tab');await contact.focus();
   expect(await contact.evaluate(element=>getComputedStyle(element).outlineStyle)).toBe('solid');
  }finally{await browser.close()}
 },30000);
});
