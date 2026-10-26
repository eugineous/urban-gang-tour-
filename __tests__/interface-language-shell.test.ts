// SSR and hook contracts only. Task 8 supplies browser integration evidence.
import {Children,createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>({active:false,index:0,refIndex:0,states:[] as unknown[],refs:[] as Array<{current:unknown}>,context:undefined as unknown}));
vi.mock('react',async original=>{
 const actual=await original<typeof import('react')>();
 return {...actual,
  useContext:(context:Parameters<typeof actual.useContext>[0])=>hooks.active?hooks.context:actual.useContext(context),
  useState:(initial:unknown)=>{
   if(!hooks.active)return actual.useState(initial);
   const index=hooks.index++;
   if(!(index in hooks.states))hooks.states[index]=typeof initial==='function'?initial():initial;
   return [hooks.states[index],(value:unknown)=>{hooks.states[index]=typeof value==='function'?value(hooks.states[index]):value}];
  },
  useRef:(initial:unknown)=>{if(!hooks.active)return actual.useRef(initial);const index=hooks.refIndex++;return hooks.refs[index]??(hooks.refs[index]={current:initial});},
  useEffect:(effect:()=>void,deps:unknown[])=>{if(!hooks.active)return actual.useEffect(effect,deps);},
  useId:()=>hooks.active?'language-fixture':actual.useId(),
 };
});
vi.mock('next/navigation',()=>({usePathname:()=>'/about'}));
import LanguageChooser from '@/app/_components/LanguageChooser';
import {LanguageProvider} from '@/ui/i18n/LanguageProvider';
import {INTERFACE_LOCALES,NATIVE_NAMES} from '@/lib/i18n/locale';
import {AppShell} from '@/app/_components/AppShell';
import {ContactForm,ContactFooter} from '@/ui/components/ContactInterface';
import {CookieConsent} from '@/app/_components/CookieConsent';
import {createLanguagePreferenceStore} from '@/lib/client/interface-language';
import {catalogueProblems,formatMessage} from '@/lib/i18n/messages';
import {shellMessages,navigationMessageKey,navigationGroupKey} from '@/ui/i18n/catalogues/shell';
import {privacyMessages} from '@/ui/i18n/catalogues/privacy';

type Props={children?:ReactNode;[key:string]:unknown};
function nodes(node:ReactNode):ReactElement<Props>[] {
 const result:ReactElement<Props>[]=[];
 Children.forEach(node,child=>{if(isValidElement<Props>(child)){result.push(child,...nodes(child.props.children));}});
 return result;
}
function renderHook<T>(render:()=>T):T {hooks.index=0;hooks.refIndex=0;return render();}
function locale(code:typeof INTERFACE_LOCALES[number]='en',persistence='available',setLocale:(code:typeof INTERFACE_LOCALES[number])=>void=()=>{}){
 hooks.active=true;hooks.context={locale:code,preferredLocale:code,persistence,setLocale};
}
beforeEach(()=>{hooks.active=false;hooks.index=0;hooks.refIndex=0;hooks.states=[];hooks.refs=[];hooks.context=undefined;});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

it.each(['/about','/account','/cart','/checkout','/shop','/book','/contact-us','/admin','/events/public-event?token=private'])('renders six explicit native options and English SSR without translation URLs on %s',path=>{
 const html=renderToStaticMarkup(createElement(LanguageProvider,null,createElement(LanguageChooser,{path})));
 expect(html.match(/<option\b/g)).toHaveLength(6);
 expect(html).toContain('value="en" selected=""');
 for(const code of INTERFACE_LOCALES)expect(html).toContain(`value="${code}"${code==='en'?' selected=""':''}>${NATIVE_NAMES[code]}</option>`);
 expect(html).toContain('aria-label="Language"');
 expect(html).not.toMatch(/translate\.google|value="auto"|>Go<|>Browser<|<a\b/);
 expect(html).toContain('aria-describedby=');
});
it('keeps the chooser in the footer and every navigation destination stable',()=>{
 const html=renderToStaticMarkup(createElement(LanguageProvider,null,createElement(AppShell,null,'Example')));
 expect(html.slice(html.indexOf('<header'),html.indexOf('</header>'))).not.toContain('data-language-control');
 for(const href of ['/events','/portfolio','/clients','/shop','/about','/book','/account','/organizer/login','/privacy-policy'])expect(html).toContain(`href="${href}"`);
});
it('wraps normal root controls in one provider above the path-keyed shell and localizes the skip link',()=>{
 const source=readFileSync('app/layout.tsx','utf8');
 expect(source.match(/<LanguageProvider>/g)).toHaveLength(1);
 const region=source.slice(source.indexOf('<LanguageProvider>'),source.indexOf('</LanguageProvider>'));
 for(const component of ['AppShell','InstallableApp','ReferralCapture','CookieConsent','MessageText'])expect(region).toContain(`<${component}`);
 expect(source).toContain('lang="en-KE"');
 expect(readFileSync('app/_components/AppShell.tsx','utf8')).not.toMatch(/key=\{locale\}/);
});
it('coordinates translated privacy panels with a stable campaign interruption marker',()=>{
 expect(readFileSync('app/_components/CookieConsent.tsx','utf8')).toContain('data-privacy-preferences');
 const campaign=readFileSync('app/_components/CampaignDisplays.tsx','utf8');
 expect(campaign).toContain("document.querySelector('[data-privacy-preferences]')");
 expect(campaign).not.toContain('aside[aria-label="Privacy preferences"]');
});

it('has complete six-language catalogues with safe exact destination keys',()=>{
 expect(catalogueProblems(shellMessages)).toEqual([]);
 expect(catalogueProblems(privacyMessages)).toEqual([]);
 expect(INTERFACE_LOCALES.map(code=>shellMessages[code]['language.label'])).toEqual(['Language','Lugha','Langue','语言','Язык','Idioma']);
 for(const value of ['__proto__','constructor','toString','/events?secret=1','Unknown']){
  expect(navigationMessageKey(value)).toBeUndefined();expect(navigationGroupKey(value)).toBeUndefined();
 }
 expect(navigationMessageKey('/shop')).toBe('nav.shop');
});

it('changes the shared preference immediately and exposes a visit-only storage status',()=>{
 const store=createLanguagePreferenceStore({storage:()=>null,events:new EventTarget()});
 store.start();locale('en',store.getSnapshot().persistence,store.setLocale);
 const chooser=renderHook(()=>LanguageChooser({path:'/checkout'}));
 const select=nodes(chooser).find(node=>node.type==='select')!;
 (select.props.onChange as (event:{target:{value:string}})=>void)({target:{value:'fr'}});
 expect(store.getSnapshot().locale).toBe('fr');
 locale('fr',store.getSnapshot().persistence,store.setLocale);
 const french=renderToStaticMarkup(renderHook(()=>LanguageChooser({path:'/checkout'})));
 expect(french).toContain('value="fr" selected=""');
 expect(french).toContain('role="status"');expect(french).toContain('stockage du navigateur');
 store.stop();
});

it('keeps footer cookie and focus handlers functional after localization',()=>{
 locale('fr');const onCookies=vi.fn(),onFocus=vi.fn();
 const footer=renderHook(()=>ContactFooter({onCookies,onFocus,focusView:false}));
 const buttons=nodes(footer).filter(node=>node.type==='button');
 (buttons[0].props.onClick as ()=>void)();(buttons[1].props.onClick as ()=>void)();
 expect(onCookies).toHaveBeenCalledOnce();expect(onFocus).toHaveBeenCalledOnce();
 expect(buttons[0].props.children).toBe('Paramètres des cookies');
});

it.each([false,true])('preserves actual consent decision %s under translated labels',accepted=>{
 const values=new Map<string,string>();
 vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
 vi.stubGlobal('window',{dispatchEvent:vi.fn(),adsbygoogle:[]});
 vi.stubGlobal('document',{getElementById:()=>null});
 vi.stubGlobal('location',{pathname:'/about'});vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}')));
 locale('fr');hooks.states=[true,false];
 const panel=renderHook(()=>CookieConsent());
 const button=nodes(panel).find(node=>node.type==='button'&&node.props.children===(accepted?'Accepter':'Refuser'))!;
 (button.props.onClick as ()=>void)();
 expect(values.get('ugt-consent')).toBe(accepted?'yes':'no');
 expect(fetch).toHaveBeenCalledTimes(accepted?1:0);
 expect(renderHook(()=>CookieConsent())).toBeNull();
});

it.each([[false,false],[true,false],[false,true],[true,true]])('preserves exact English service disclosure for analytics %s / ads %s', (analytics,ads)=>{
 vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID',analytics?'G-test':'');vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT',ads?'ca-test':'');
 locale();hooks.states=[true,false];
 const html=renderToStaticMarkup(renderHook(()=>CookieConsent()));
 const services=[analytics&&'Google Analytics',ads&&'Google advertising'].filter(Boolean).join(' and ');
 const expected=`Necessary cookies keep the site working. Optional reporting${services?' ('+services+')':''} stays off until you accept. If you’re under 18, choose Reject.`;
 expect(html).toContain(expected);
});

it('translates contact feedback without changing a draft, busy submission or retry reference',async()=>{
 const values=new Map<string,string>();
 vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});
 vi.stubGlobal('FormData',class{get(){return ''}});
 let finish!:(response:Response)=>void;
 const pending=new Promise<Response>(resolve=>{finish=resolve});
 const fetcher=vi.fn<(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>>(()=>pending);vi.stubGlobal('fetch',fetcher);
 locale();let form=renderHook(()=>ContactForm({}));
 const draft={name:'Original Customer',email:'you@example.test',subject:'Original enquiry',message:'Original customer message'};
 for(const [name,value]of Object.entries(draft)){
  const field=nodes(form).find(node=>node.props.name===name)!;
  (field.props.onChange as (event:{target:{value:string}})=>void)({target:{value}});
  form=renderHook(()=>ContactForm({}));
 }
 const submit=(form.props.onSubmit as (event:unknown)=>Promise<void>)({preventDefault:()=>{},currentTarget:{}});
 const attempt=values.get('ugt-contact-attempt');
 const payload=JSON.parse(String(fetcher.mock.calls[0][1]?.body));
 expect(payload).toMatchObject({...draft,privacyAccepted:true});
 locale('fr');form=renderHook(()=>ContactForm({}));
 expect(form.props['aria-busy']).toBe(true);
 expect(nodes(form).find(node=>node.props.name==='name')!.props.value).toBe(draft.name);
 expect(values.get('ugt-contact-attempt')).toBe(attempt);
 finish(new Response(JSON.stringify({error:'invalid_email'}),{status:400}));await submit;
 form=renderHook(()=>ContactForm({}));
 expect(renderToStaticMarkup(form)).toContain(formatMessage(shellMessages,'fr','contact.error.email').text);
 locale('es');form=renderHook(()=>ContactForm({}));
 expect(renderToStaticMarkup(form)).toContain(formatMessage(shellMessages,'es','contact.error.email').text);
 expect(values.get('ugt-contact-attempt')).toBe(attempt);
 expect(JSON.parse(values.get('ugt-contact-draft')!)).toEqual(draft);
 expect(fetcher).toHaveBeenCalledOnce();
});
