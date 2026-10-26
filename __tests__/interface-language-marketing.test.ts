import {Children,createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const selected=vi.hoisted(()=>({locale:'en'}));
const hooks=vi.hoisted(()=>({active:false,index:0,refIndex:0,states:[] as unknown[],refs:[] as Array<{current:unknown}>}));
vi.mock('react',async original=>{
 const actual=await original<typeof import('react')>();
 return {...actual,
  useState:(initial:unknown)=>{if(!hooks.active)return actual.useState(initial);const index=hooks.index++;if(!(index in hooks.states))hooks.states[index]=typeof initial==='function'?initial():initial;return [hooks.states[index],(value:unknown)=>{hooks.states[index]=typeof value==='function'?value(hooks.states[index]):value}];},
  useRef:(initial:unknown)=>{if(!hooks.active)return actual.useRef(initial);const index=hooks.refIndex++;return hooks.refs[index]??(hooks.refs[index]={current:initial});},
  useEffect:(effect:()=>void,deps:unknown[])=>{if(!hooks.active)return actual.useEffect(effect,deps);},
 };
});
vi.mock('@/ui/i18n/LanguageProvider',async original=>{
 const actual=await original<typeof import('@/ui/i18n/LanguageProvider')>();
 return {...actual,useInterfaceLanguage:()=>({locale:selected.locale,preferredLocale:selected.locale,persistence:'available',setLocale:()=>{},reset:()=>{}}),useMessages:(catalogue:import('@/lib/i18n/messages').Catalogue<string>)=>(key:string,values?:import('@/lib/i18n/messages').MessageValues)=>formatMessage(catalogue,selected.locale as InterfaceLocale,key,values).text};
});
import {catalogueProblems,formatMessage} from '@/lib/i18n/messages';
import {INTERFACE_LOCALES,type InterfaceLocale} from '@/lib/i18n/locale';
import Site from '@/ui/components/Site';
import {ExperiencePage} from '@/ui/components/ExperiencePage';
import {HomeEvents,HomeMerch} from '@/ui/components/HomeDiscovery';
import {HeroMotion} from '@/ui/components/HeroMotion';
import {YouTubeFeature} from '@/ui/components/ExperienceEnhancements';
import {AboutPortfolio,ProofBoard,SchoolDirectory} from '@/ui/components/PortfolioExperience';
import {PortfolioPage} from '@/ui/components/PortfolioReconstruction';
import {ClientsPortfolio} from '@/ui/components/ClientsPortfolio';
import {ShowcaseShelf} from '@/ui/components/ShowcaseShelf';
import PartnersPage from '@/app/partners/page';
import PressPage from '@/app/press/page';
import {OriginalContent} from '@/ui/i18n/OriginalContent';
import {PresenterProfile} from '@/ui/components/PresenterProfiles';
import {WEBSITE_DEFAULTS} from '@/lib/website-content';
import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
const headings={en:'What we do',sw:'Tunachofanya',fr:'Nos activités','zh-Hans':'我们的服务',ru:'Что мы делаем',es:'Qué hacemos'};
const faqHeadings={en:'Common questions',sw:'Maswali ya kawaida',fr:'Questions fréquentes','zh-Hans':'常见问题',ru:'Частые вопросы',es:'Preguntas frecuentes'};
const site=(path:string,pageContent:typeof WEBSITE_DEFAULTS[string]|null=null)=>renderToStaticMarkup(createElement(Site,{path,query:{},screens:[],products:[],events:[],posts:[],pageContent}));
beforeEach(()=>{selected.locale='en';hooks.active=false;hooks.index=0;hooks.refIndex=0;hooks.states=[];hooks.refs=[]});
function nodes(node:ReactNode):ReactElement<Record<string,unknown>>[]{const result:ReactElement<Record<string,unknown>>[]=[];Children.forEach(node,child=>{if(isValidElement<Record<string,unknown>>(child))result.push(child,...nodes(child.props.children as ReactNode))});return result;}
function renderHook<T>(render:()=>T):T{hooks.index=0;hooks.refIndex=0;return render()}
it('provides a complete six-language catalogue with exact placeholder contracts',()=>{
 expect(catalogueProblems(marketingMessages)).toEqual([]);
 for(const locale of INTERFACE_LOCALES)for(const key of Object.keys(marketingMessages.en)as Array<keyof typeof marketingMessages.en>){
  expect(formatMessage(marketingMessages,locale,key,{count:3,title:'Original title',name:'Original name',client:'Original client',category:'Original category',firstName:'Original name',number:'01',duration:'2:13',mission:'Original mission',programmeLink:'Original programme',collaboratorLink:'Original collaborator',archiveLink:'Original archive',action:'Original action',br:'\n'}).fallback).toBe(false);
 }
});
it.each(INTERFACE_LOCALES)('localizes factory business and FAQ controls in %s',locale=>{
 selected.locale=locale;
 expect(renderToStaticMarkup(createElement(ExperiencePage))).toContain(headings[locale]);
 expect(site('/faq')).toContain(faqHeadings[locale]);
 for(const item of ['school','hosts','publicEvents','tickets','afterRequest']as const)for(const part of ['question','answer']as const){
  const value=formatMessage(marketingMessages,locale,`faq.${item}.${part}`).text;
  expect(site('/faq')).toContain(renderToStaticMarkup(createElement('span',null,value)).slice(6,-7));
 }
});
it.each(INTERFACE_LOCALES)('localizes all scoped business surfaces and preserves fixed link payloads in %s',locale=>{
 selected.locale=locale;
 const surfaces=[
  [createElement(HomeEvents,{events:[],now:0}),'home.events.title'],
  [createElement(ClientsPortfolio),'clients.title'],
  [createElement(PortfolioPage,{initialNow:0}),'portfolio.title'],
  [createElement(AboutPortfolio),'aboutPortfolio.bring'],
  [createElement(ProofBoard),'proof.eyebrow'],
  [createElement(SchoolDirectory),'school.choose'],
  [createElement(PartnersPage),'partners.title'],
  [createElement(PressPage),'press.title'],
  [createElement(YouTubeFeature),'youtube.disclosure'],
  [createElement(HeroMotion),'heroVideo.play'],
 ] as const;
 for(const [component,key]of surfaces){
  const expected=renderToStaticMarkup(createElement('span',null,formatMessage(marketingMessages,locale,key).text)).slice(6,-7);
  expect(renderToStaticMarkup(component)).toContain(expected);
 }
 const experience=renderToStaticMarkup(createElement(ExperiencePage));
 for(const href of ['/book?type=school','/book?type=campus','/book?type=hosts','/book?type=public','/work-with-us','/events','/shop'])expect(experience).toContain(`href="${href}"`);
 expect(experience).toContain('KES 250');expect(experience).toContain('lang="en-KE">Campus Rave</h2>');
 const press=renderToStaticMarkup(createElement(PressPage));
 expect(press).toContain('<span lang="en-KE">From Potential to Purpose.</span>');
 expect(press).toContain('href="mailto:admin@urbangangtour.co.ke"');
});
it.each(INTERFACE_LOCALES)('preserves same-English CMS provenance and fallback biographies in %s',locale=>{
 selected.locale=locale;
 const source=WEBSITE_DEFAULTS['/faq'];
 const html=site('/faq',{...source});
 expect(html).toContain(`<span lang="en-KE">${source.title}</span>`);
 expect(html).toContain(`<span lang="en-KE">${source.faqs[0].question}</span>`);
 const biography=renderToStaticMarkup(createElement(PresenterProfile));
 expect(biography).toContain(`<span lang="en-KE">${WEBSITE_DEFAULTS['/author/eugine-micah'].body[0]}</span>`);
 expect(renderToStaticMarkup(createElement(OriginalContent,null,'Owner approved headline'))).toContain('lang="en-KE"');
 for(const lucy of [false,true]){
  const record=WEBSITE_DEFAULTS[lucy?'/author/lucy-ogunde':'/author/eugine-micah'];
  for(const content of [null,{...record}]){
   const html=renderToStaticMarkup(createElement(PresenterProfile,{lucy,content}));
   for(const paragraph of record.body)expect(html).toContain(renderToStaticMarkup(createElement(OriginalContent,{inline:true},paragraph)));
   expect(html).toContain('href="/book?type=hosts&amp;host='+(lucy?'lucy':'eugine')+'"');
  }
 }
 const about=site('/about',{...WEBSITE_DEFAULTS['/about']});
 for(const paragraph of WEBSITE_DEFAULTS['/about'].body)expect(about).toContain(renderToStaticMarkup(createElement(OriginalContent,{inline:true},paragraph)));
});
it.each(INTERFACE_LOCALES)('keeps four original Color Blast previews and exact destinations in %s',locale=>{
 selected.locale=locale;const html=renderToStaticMarkup(createElement(HomeMerch,{products:[]}));
 for(const [id,name]of [['cb-oversized-tee','Color Blast Oversized Tee'],['cb-hoodie','Color Blast Pullover Hoodie'],['cb-bucket-hat','Color Blast Bucket Hat'],['cb-tote','Color Blast Canvas Tote']]){
  expect(html).toContain(`data-home-design="${id}"`);expect(html).toContain(`href="/shop/${id}"`);
  expect(html).toContain(`<span lang="en-KE">${name}</span>`);
 }
 expect(html.match(/data-home-design=/g)).toHaveLength(4);
 expect(html).toContain('href="/shop/lookbook"');expect(html).not.toMatch(/Add to cart|KES\s?\d/);
});
it('retains the different empty CMS FAQ semantics on home and the FAQ page',()=>{
 const content={...WEBSITE_DEFAULTS['/faq'],faqs:[]};
 expect(site('/faq',content)).not.toContain('<details');
 expect(site('/',content).match(/<details/g)).toHaveLength(5);
});
it.each(INTERFACE_LOCALES)('treats arbitrary same-English shelf fields as source records in %s',locale=>{
 selected.locale=locale;
 const html=renderToStaticMarkup(createElement(ShowcaseShelf,{id:'source',label:'Brand campaigns',title:'Our work.',description:'School events',items:[{id:'stable-source-id',title:'School events',label:'Brand campaigns',description:'Our work.',href:'/events/source?ref=001234',action:'Original action'}]}));
 for(const value of ['Our work.','School events','Brand campaigns'])expect(html).toContain(`<span lang="en-KE">${value}</span>`);
 expect(html).toContain('href="/events/source?ref=001234"');
});
it('preserves video playback state, source and element identity when the interface language changes',()=>{
 hooks.active=true;hooks.states=['/media-library/hero-mobile-v2.mp4',true,true,false,true];
 selected.locale='en';const first=renderHook(()=>HeroMotion());
 const before=nodes(first),video=before.find(node=>node.type==='video')!;
 const state=[...hooks.states];selected.locale='fr';const after=nodes(renderHook(()=>HeroMotion()));
 expect(hooks.states).toEqual(state);
 expect(after.find(node=>node.type==='video')!.props.src).toBe(video.props.src);
 expect(after.find(node=>node.type==='video')!.props.style).toEqual(video.props.style);
 expect(after.find(node=>node.type==='video')!.key).toBe(video.key);
 expect(after.find(node=>node.type==='button')!.props['aria-label']).toBe(formatMessage(marketingMessages,'fr','heroVideo.pauseBackground').text);
});
it('relocalizes an existing shelf wrap announcement without resetting scroll or focus references',()=>{
 hooks.active=true;hooks.states=[true,'start'];const scrollTo=vi.fn();
 const row={scrollLeft:0,scrollWidth:1400,clientWidth:400,scrollTo};hooks.refs=[{current:row},{current:null}];
 const props={id:'stable-shelf',label:'Archive',title:'Original shelf',description:'Original description',items:[{id:'stable-record',title:'Original record',href:'/events/original',label:'Original label',action:'Original action'}]};
 selected.locale='en';const first=renderHook(()=>ShowcaseShelf(props));
 const firstStatus=nodes(first).find(node=>node.props.role==='status')!.props.children;
 selected.locale='es';const second=renderHook(()=>ShowcaseShelf(props));
 expect(nodes(second).find(node=>node.props.role==='status')!.props.children).toBe(formatMessage(marketingMessages,'es','shelf.start',{title:props.title}).text);
 expect(nodes(second).find(node=>node.props.role==='status')!.props.children).not.toBe(firstStatus);
 expect(hooks.states).toEqual([true,'start']);expect(hooks.refs[0].current).toBe(row);expect(scrollTo).not.toHaveBeenCalled();
 expect(nodes(second).find(node=>node.props.role==='region')!.props.id).toBe('stable-shelf-items');
});
