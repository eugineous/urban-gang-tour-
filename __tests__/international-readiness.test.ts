import {afterEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {ContactFooter} from '@/ui/components/ContactInterface';
import {readFileSync} from 'node:fs';
import {WELCOME_LANGUAGES,isWelcomeLanguage,welcomeAlternates} from '@/lib/welcome-languages';
import Welcome,{generateMetadata,generateStaticParams} from '@/app/welcome/[language]/page';
import {SITE} from '@/lib/site';
import {SITE_MENU_GROUPS,SITE_UTILITY_NAVIGATION} from '@/lib/site-navigation';
import {metadataForPath} from '@/app/_lib/seo';
import {DISPLAY_PREFERENCES_BOOTSTRAP,FOCUS_VIEW_KEY,setFocusView} from '@/lib/client/display-preferences';

describe('actual translated welcome pages',()=>{
 it.each(Object.keys(WELCOME_LANGUAGES))('renders %s with its own canonical, language and reciprocal alternates',async language=>{
  const params=Promise.resolve({language}),metadata=await generateMetadata({params});
  const html=renderToStaticMarkup(await Welcome({params}));
  expect(metadata.alternates?.canonical).toBe(`${SITE.domain}/welcome/${language}`);
  expect(metadata.alternates?.languages).toEqual(welcomeAlternates);
  expect(html).toContain(`lang="${language}"`);expect(html.match(/<h1>/g)).toHaveLength(1);
  for(const code of Object.keys(WELCOME_LANGUAGES)){expect(html).toContain(`href="/welcome/${code}"`);expect(welcomeAlternates[code]).toBe(`${SITE.domain}/welcome/${code}`);}
  expect(html).toContain('KES');expect(html).toContain('href="/contact-us"');expect(html).not.toContain('<iframe');
 });
 it('does not claim arbitrary languages exist or accept inherited object names',async()=>{
  expect(generateStaticParams()).toEqual(Object.keys(WELCOME_LANGUAGES).map(language=>({language})));
  for(const code of ['de','../admin','__proto__','constructor','EN','zh'])expect(isWelcomeLanguage(code)).toBe(false);
  await expect(Welcome({params:Promise.resolve({language:'de'})})).rejects.toThrow();
 });
 it('keeps new routes discoverable, distinct and task-led',()=>{
  const links=[...SITE_MENU_GROUPS.flatMap(group=>group.items),...SITE_UTILITY_NAVIGATION];
  for(const path of ['/international','/accessibility'])expect(links.some(([,href])=>href===path)).toBe(true);
  expect(readFileSync('app/_components/AppShell.tsx','utf8')).toContain('<LanguageChooser path={path}/>');
  for(const path of ['/international','/accessibility']){
   const m=metadataForPath(path);expect(m.alternates?.canonical).toBe(SITE.domain+path);expect(m.description).toBeTruthy();expect(m.openGraph).toBeTruthy();expect(m.twitter).toBeTruthy();
  }
  expect(metadataForPath('/about').description).not.toContain('every stop nationally');
  expect(metadataForPath('/').description).toContain('Kenya');
 });
});
describe('calm display preference',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 function browser(value:string|null,blocked=false){
  const root={dataset:{} as Record<string,string>};
  const storage={getItem:vi.fn(()=>{if(blocked)throw Error('blocked');return value}),setItem:vi.fn(()=>{if(blocked)throw Error('blocked')})};
  const window={dispatchEvent:vi.fn()};vi.stubGlobal('document',{documentElement:root});vi.stubGlobal('localStorage',storage);vi.stubGlobal('window',window);
  vi.stubGlobal('CustomEvent',class{constructor(public type:string,public options:unknown){}});
  return {root,storage,window};
 }
 it.each([['true','true'],['false','false'],[null,'false'],['"yes"','false']])('applies saved %s before paint as %s',(saved,result)=>{
  const {root}=browser(saved);new Function(DISPLAY_PREFERENCES_BOOTSTRAP)();expect(root.dataset.focusView).toBe(result);
 });
 it('synchronizes the existing media and campaign preference without requiring storage',()=>{
  const {root,window}=browser(null,true);expect(()=>new Function(DISPLAY_PREFERENCES_BOOTSTRAP)()).not.toThrow();
  setFocusView(true);expect(root.dataset.focusView).toBe('true');expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'ugt-focus-view',options:{detail:true}}));
  setFocusView(false);expect(root.dataset.focusView).toBe('false');expect(FOCUS_VIEW_KEY).toBe('ugt-new-preview-v1focusView');
 });
 it('keeps animation opt-outs, visible text social labels and plain language entry links in the shipped shell',()=>{
  const css=readFileSync('app/international.css','utf8'),footer=renderToStaticMarkup(createElement(ContactFooter,{onCookies:()=>{},focusView:false,onFocus:()=>{}}));
  expect(css).toContain('[data-focus-view=true]');expect(css).toContain('prefers-reduced-motion');expect(css).toContain('animation:none!important');
  expect(footer).toContain('Languages / Lugha');expect(footer).toContain('Accessibility');expect(footer).toContain('Focus view: off');
  for(const label of ['WhatsApp','Instagram','YouTube','TikTok','Facebook','X'])expect(footer).toContain('<span>'+label+'</span>');
 });
});
