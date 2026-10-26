import {Children,createElement,isValidElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const selected=vi.hoisted(()=>({locale:'en'}));
const authored=vi.hoisted(()=>({post:{slug:'original-story',section:'Original section',headline:'Original headline',description:'Original summary',author:'Original author',image:'/original.jpg',imageAlt:'Original alt',imageCaption:'AI illustration · Credit: Original artist',imageIllustration:'ai-generated',body:['## Original heading','Original **body** [Citation](https://example.com/source)','- Original one\n- Original two'],disclosure:'Original AI disclosure. This illustration is not a documentary photograph.',datePublished:'2026-10-26T21:30:00Z',dateModified:'2026-10-26T22:00:00Z'}}));
vi.mock('@/app/_lib/blog',()=>({getBlogPosts:async()=>[authored.post],getBlogPost:async()=>authored.post,articleJsonLd:(post:unknown)=>post}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:async()=>[{id:'original-event-id',slug:'original-event',kind:'ticketed',name:'Original event',event_date:'2099-11-06',event_time:'4:00 PM',venue:'Original venue',city:'Nairobi',image:'',description:'Original description',tiers:[],status:'postponed',previous_start_at:null}]}));
vi.mock('@/lib/server/event-truth',()=>({resolveEventTruth:async()=>null}));
vi.mock('@/lib/server/catalog',()=>({formatEventDate:(day:string)=>'Source date '+day}));
vi.mock('@/ui/i18n/LanguageProvider',async original=>{
 const actual=await original<typeof import('@/ui/i18n/LanguageProvider')>();
 return {...actual,useInterfaceLanguage:()=>({locale:selected.locale}),useMessages:(catalogue:import('@/lib/i18n/messages').Catalogue<string>)=>(key:string,values?:import('@/lib/i18n/messages').MessageValues)=>formatMessage(catalogue,selected.locale as InterfaceLocale,key,values).text};
});
import {catalogueProblems,formatMessage} from '@/lib/i18n/messages';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {mediaMessages} from '@/ui/i18n/catalogues/media';
import {EventDay,PublicationDate} from '@/ui/components/PublicationDate';
import {sortEventDirectory} from '@/ui/components/EventDiscovery';
import {INTERFACE_LOCALES,type InterfaceLocale} from '@/lib/i18n/locale';
import {EventDiscovery} from '@/ui/components/EventDiscovery';
import {PhotoGallery} from '@/app/_components/PhotoGallery';
import {EventCalendar} from '@/app/_components/EventCalendar';
import {VideoCaptionTrack,VideoTranscript} from '@/ui/components/MediaCaptions';
import ArticleText from '@/app/_components/ArticleText';
import BlogPost from '@/app/blog/[slug]/page';
import {buildEventCalendar} from '@/lib/event-calendar';
import EventPage from '@/app/events/[slug]/page';
const headings={en:'Events &amp; tickets.',sw:'Matukio na tiketi.',fr:'Événements et billets.','zh-Hans':'活动与门票。',ru:'События и билеты.',es:'Eventos y entradas.'};
const transcriptLabels={en:'Read video transcript',sw:'Soma nakala ya video',fr:'Lire la transcription vidéo','zh-Hans':'阅读视频文字稿',ru:'Читать расшифровку видео',es:'Leer la transcripción del vídeo'};
it('has complete six-language discovery and media catalogues with matching placeholders',()=>{
 expect(catalogueProblems(discoveryMessages)).toEqual([]);expect(catalogueProblems(mediaMessages)).toEqual([]);
});
it('composes the original article fields, AI disclosure, illustration marker and source paragraphs without editing their bytes',async()=>{
 const before=JSON.stringify(authored.post),tree=await BlogPost({params:Promise.resolve({slug:authored.post.slug})});
 const values:unknown[]=[];
 function visit(node:ReactNode){Children.forEach(node,child=>{if(isValidElement<Record<string,unknown>>(child)){values.push(child.props);visit(child.props.children as ReactNode)}else if(typeof child==='string')values.push(child)});}
 visit(tree);
 for(const field of ['section','headline','description','author','imageCaption','disclosure'] as const)expect(values).toContain(authored.post[field]);
 for(const paragraph of authored.post.body)expect(values).toContainEqual(expect.objectContaining({paragraph}));
 expect(values).toContainEqual(expect.objectContaining({src:authored.post.image,alt:authored.post.imageAlt,'data-editorial-illustration':authored.post.imageIllustration}));
 expect(values).toContainEqual(expect.objectContaining({url:'https://urbangangtour.co.ke/blog/original-story',title:authored.post.headline}));
 expect(JSON.stringify(authored.post)).toBe(before);
});
it('preserves the existing ticketed detail day and original share text even when postponed',async()=>{
 selected.locale='fr';
 const html=renderToStaticMarkup(await EventPage({params:Promise.resolve({slug:'original-event'})}));
 expect(html).toContain('dateTime="2099-11-06"');
 expect(html).toContain(encodeURIComponent('Original event — Original venue Source date 2099-11-06'));
 expect(html).not.toContain('/events?event=original-event-id');
});
it.each(INTERFACE_LOCALES)('preserves event date-only days and chronology around Nairobi midnight in %s',locale=>{
 selected.locale=locale;
 const now=Date.parse('2026-10-26T21:30:00Z');
 const events=[{id:'later',name:'Later',eventDate:'2026-10-28',status:'published',kind:'school'},{id:'first',name:'First',eventDate:'2026-10-27',status:'published',kind:'school'}];
 expect(sortEventDirectory(events,now).map(event=>event.id)).toEqual(['first','later']);
 const day=renderToStaticMarkup(createElement(EventDay,{day:'2026-10-27'}));
 expect(day).toContain('dateTime="2026-10-27"');expect(day).toContain('27');
 const instant=renderToStaticMarkup(createElement(PublicationDate,{value:'2026-10-26T21:30:00Z'}));
 expect(instant).toContain('dateTime="2026-10-26T21:30:00Z"');expect(instant).toContain('27');
});
it.each(INTERFACE_LOCALES)('localizes discovery chrome with canonical filters in %s',locale=>{
 selected.locale=locale;
 const html=renderToStaticMarkup(createElement(EventDiscovery,{events:[],initialNow:Date.parse('2026-10-26T21:30:00Z')}));
 expect(html).toContain(headings[locale]);
 for(const value of ['all','ticketed','partner','school','past'])expect(html).toContain(`value="${value}"`);
});
it.each(INTERFACE_LOCALES)('keeps transcript language, track and authored bytes under %s controls',locale=>{
 selected.locale=locale;
 const captions={asset:'localization-source-fixture',language:'sw',transcript:'Maandishi asilia.\nCredit: A & B',track:'/api/captions?asset=localization-source-fixture'};
 const html=renderToStaticMarkup(createElement(VideoTranscript,{captions}));
 expect(html).toContain(transcriptLabels[locale]);expect(html).toContain('lang="sw"');
 expect(html).toContain('Maandishi asilia.\nCredit: A &amp; B');
 const track=renderToStaticMarkup(createElement(VideoCaptionTrack,{captions}));
 expect(track).toContain('srcLang="sw"');expect(track).toContain(captions.track);
});
it.each(INTERFACE_LOCALES)('preserves original article parsing, citations, photo credits and calendar provider payload in %s',locale=>{
 selected.locale=locale;
 const source=['## Original headline','**Original** body [Source](https://example.com/report)','- Original one\n- Original two','<script>unsafe()</script>'];
 const snapshot=[...source];
 const article=source.map(paragraph=>renderToStaticMarkup(createElement(ArticleText,{paragraph}))).join('');
 expect(source).toEqual(snapshot);expect(article).toContain('<h2');expect(article).toContain('Original headline');expect(article).toContain('<strong>Original</strong>');expect(article).toContain('href="https://example.com/report"');expect(article).toContain('&lt;script&gt;');
 const gallery=renderToStaticMarkup(createElement(PhotoGallery,{photos:[{id:'source-id',url:'/source.jpg',caption:'Original caption · Credit: A & B',altText:'Original alt'}]}));
 expect(gallery).toContain('Original caption · Credit: A &amp; B');expect(gallery).toContain('alt="Original alt"');
 const event={name:'Original event',date:'2026-10-27',venue:'Original venue',url:'https://example.com/events/original',start:null};
 const calendar=renderToStaticMarkup(createElement(EventCalendar,event));
 expect(calendar).toContain('dates=20261027/20261028');expect(calendar).toContain('text=Original%20event');expect(calendar).toContain('location=Original%20venue');
 if(locale!=='en')expect(calendar).not.toContain('>Download calendar reminder<');
});

it.skipIf(!existsSync('/usr/bin/chromium'))('changes language in mounted photo/film/gallery/reels/transcript/share surfaces without resetting media or focus',async()=>{
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {LanguageProvider,useInterfaceLanguage} from './ui/i18n/LanguageProvider';
  import {PhotoGallery} from './app/_components/PhotoGallery';
  import {VideoTranscript} from './ui/components/MediaCaptions';
  import {VideoRoll} from './ui/components/ExperienceRails';
  import {MediaGallery,media} from './ui/components/MediaLibrary';
  import {ShareActions} from './ui/components/ShareActions';
  import {ReelsFeed} from './ui/components/ReelsFeed';
  import {EventCalendar} from './app/_components/EventCalendar';
  function Switch(){const language=useInterfaceLanguage();window.chooseLocale=language.setLocale;return null}
  const film=media.find(a=>a.kind==='video'&&!a.adult);
  createRoot(document.getElementById('app')).render(<LanguageProvider><Switch/>
   <div id="photo"><PhotoGallery photos={[{id:'source',url:'/source.jpg',caption:'Original caption · Credit A',altText:'Original alt'}]}/></div>
   <div id="film"><VideoRoll ids={[film.id]}/></div>
   <div id="gallery"><MediaGallery slug="machakos-campus"/></div>
   <div id="transcript"><VideoTranscript captions={{asset:'source',language:'sw-TZ',track:'/api/captions?asset=source',transcript:'Original transcript\\nCredit A'}}/></div>
   <div id="share"><ShareActions title="Original title" path="/source?original=yes"/></div>
   <div id="reels"><ReelsFeed/></div>
   <div id="calendar"><EventCalendar name="Original event" date="2026-10-27" venue="Original venue" url="http://127.0.0.1/event" start={null}/></div>
  </LanguageProvider>);
 `},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'local-navigation',setup(builder){builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'local'}));builder.onLoad({filter:/.*/,namespace:'local'},()=>({contents:'export const usePathname=()=>"/gallery";'}));builder.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(4000);let captionRequests=0;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:'<div id="app"></div>'});
   if(url.pathname==='/api/captions'){captionRequests++;return route.fulfill({contentType:'application/json',body:JSON.stringify({available:true,asset:url.searchParams.get('asset'),language:'sw-TZ',transcript:'Original fetched transcript',track:'/api/captions?asset='+url.searchParams.get('asset')})});}
   return route.abort();
  });
  await page.goto('http://127.0.0.1/fixture');
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('clipboard unavailable'))}});
   const state={play:0,pause:0,load:0};(window as any).mediaCalls=state;
   HTMLMediaElement.prototype.play=function(){state.play++;return Promise.resolve()};
   HTMLMediaElement.prototype.pause=function(){state.pause++};HTMLMediaElement.prototype.load=function(){state.load++};
   URL.createObjectURL=(blob:Blob)=>{(window as any).calendarBlob=blob;return 'blob:fixture'};URL.revokeObjectURL=()=>{};
   const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this)};
  });
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForSelector('#photo .ugt-photo-grid button');
  await page.locator('#photo .ugt-photo-grid button').click();
  await page.getByRole('button',{name:'Zoom image',exact:true}).click();
  await page.evaluate(()=>{
   const dialog=document.querySelector('#photo dialog')!,image=dialog.querySelector('img')!;
   const details=document.querySelector('#transcript details') as HTMLDetailsElement;details.open=true;
   (window as any).photoBefore={dialog,image};(window as any).chooseLocale('fr');
  });
  await page.getByRole('button',{name:'Ajuster l’image',exact:true}).waitFor();
  expect(await page.evaluate(()=>{const before=(window as any).photoBefore;return before.dialog===document.querySelector('#photo dialog')&&before.image===document.querySelector('#photo dialog img')&&(before.dialog as HTMLDialogElement).open&&!!document.querySelector('.ugt-photo-stage.zoomed')&&document.body.style.overflow==='hidden'})).toBe(true);
  await page.getByRole('button',{name:'Fermer la photo',exact:true}).click();
  await page.evaluate(()=>(window as any).chooseLocale('en'));
  await page.locator('#film .video-roll-card').first().click();
  await page.waitForSelector('#film .film-viewer video');
  await page.waitForSelector('#film .media-transcript');
  const requestsBefore=captionRequests;
  await page.evaluate(()=>{
   const video=document.querySelector('#film .film-viewer video') as HTMLVideoElement;video.currentTime=7;
   const close=document.querySelector('#film .film-viewer button') as HTMLButtonElement;close.focus();
   (window as any).filmBefore={video,dialog:video.parentElement,close,calls:{...(window as any).mediaCalls}};
   (window as any).chooseLocale('es');
  });
  await page.getByRole('button',{name:'Cerrar película',exact:true}).waitFor();
  expect(await page.evaluate(()=>{const b=(window as any).filmBefore,v=document.querySelector('#film .film-viewer video');return b.video===v&&b.dialog===v!.parentElement&&b.close===document.activeElement&&(v as HTMLVideoElement).currentTime===7&&document.body.style.overflow==='hidden'&&JSON.stringify(b.calls)===JSON.stringify((window as any).mediaCalls)})).toBe(true);
  expect(captionRequests).toBe(requestsBefore);
  expect(await page.locator('#transcript details').getAttribute('open')).not.toBeNull();
  expect(await page.locator('#transcript p').getAttribute('lang')).toBe('sw-TZ');
  expect(await page.locator('#film track').getAttribute('srclang')).toBe('sw-TZ');
  await page.getByRole('button',{name:'Cerrar película',exact:true}).click();
  await page.evaluate(()=>(window as any).chooseLocale('en'));
  await page.locator('#gallery .media-photo-grid button').first().click();
  await page.evaluate(()=>{
   (window as any).galleryBefore={dialog:document.querySelector('#gallery .lightbox'),image:document.querySelector('#gallery .lightbox img'),focus:document.activeElement};
   (window as any).chooseLocale('ru');
  });
  await page.locator('#gallery .lightbox-close').filter({hasText:'Закрыть'}).waitFor();
  expect(await page.evaluate(()=>{const b=(window as any).galleryBefore;return b.dialog===document.querySelector('#gallery .lightbox')&&b.image===document.querySelector('#gallery .lightbox img')&&b.focus===document.activeElement&&document.body.style.overflow==='hidden'})).toBe(true);
  await page.locator('#gallery .lightbox-close').click();
  const reel=page.locator('#reels article[data-active="true"] video');
  await page.evaluate(()=>{const v=document.querySelector('#reels article[data-active="true"] video') as HTMLVideoElement;v.currentTime=11;(window as any).reelBefore={video:v,src:v.getAttribute('src'),url:location.href,calls:{...(window as any).mediaCalls}};(window as any).chooseLocale('sw')});
  await page.getByRole('heading',{name:'Video fupi',exact:true}).waitFor();
  expect(await reel.evaluate((video:any)=>{const b=(window as any).reelBefore;return b.video===video&&video.currentTime===11&&video.getAttribute('src')===b.src&&location.href===b.url&&JSON.stringify(b.calls)===JSON.stringify((window as any).mediaCalls)})).toBe(true);
  await page.locator('#share button').last().click();
  await page.waitForSelector('#share input');
  await page.locator('#share input').focus();
  await page.evaluate(()=>{const input=document.querySelector('#share input') as HTMLInputElement;(window as any).shareBefore={input,value:input.value,start:input.selectionStart,end:input.selectionEnd};(window as any).chooseLocale('zh-Hans')});
  await page.locator('#share button').filter({hasText:'复制链接'}).waitFor();
  expect(await page.evaluate(()=>{const b=(window as any).shareBefore,input=document.querySelector('#share input') as HTMLInputElement;return b.input===input&&document.activeElement===input&&b.value===input.value&&b.start===input.selectionStart&&b.end===input.selectionEnd})).toBe(true);
  await page.locator('#calendar button').click();
  const exported=await page.evaluate(async()=>({text:await (window as any).calendarBlob.text(),type:(window as any).calendarBlob.type}));
  expect(exported.type).toBe('text/calendar;charset=utf-8');
  expect(exported.text).toBe(buildEventCalendar({name:'Original event',date:'2026-10-27',venue:'Original venue',url:'http://127.0.0.1/event',start:null}));
 }finally{await browser.close()}
},30000);
