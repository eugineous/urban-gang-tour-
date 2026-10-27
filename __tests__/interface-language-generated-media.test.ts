import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {formatMessage,type Catalogue,type MessageValues} from '@/lib/i18n/messages';
import {INTERFACE_LOCALES,type InterfaceLocale} from '@/lib/i18n/locale';
import {OriginalEventPoster} from '@/app/_components/EventArtwork';
import {MediaImage,MediaGallery,media,collections} from '@/ui/components/MediaLibrary';

const selected=vi.hoisted(()=>({locale:'en' as InterfaceLocale}));
vi.mock('@/ui/i18n/LanguageProvider',async original=>({
 ...await original<typeof import('@/ui/i18n/LanguageProvider')>(),
 useInterfaceLanguage:()=>({locale:selected.locale}),
 useMessages:(catalogue:Catalogue<string>)=>(key:string,values?:MessageValues)=>formatMessage(catalogue,selected.locale,key,values).text,
}));
const posterWords={en:'original event poster',sw:'bango asilia la tukio',fr:'affiche originale de l’événement','zh-Hans':'活动原始海报',ru:'оригинальная афиша события',es:'cartel original del evento'};
const photoWords={en:'event photograph',sw:'picha ya tukio',fr:'photo de l’événement','zh-Hans':'活动照片',ru:'фотография события',es:'fotografía del evento'};
const archiveWords={en:'historical poster',sw:'bango la kumbukumbu',fr:'affiche d’archive','zh-Hans':'历史海报',ru:'архивная афиша',es:'cartel histórico'};

it.each(INTERFACE_LOCALES)('localizes generated poster descriptions but preserves supplied captions in %s',locale=>{
 selected.locale=locale;
 const generated=renderToStaticMarkup(createElement(OriginalEventPoster,{name:'Original Event',image:'/original-poster.jpg'}));
 expect(generated).toContain(posterWords[locale]);
 expect(generated).toContain('Original Event');expect(generated).toContain('src="/original-poster.jpg"');
 expect(generated).toContain(`lang="${locale==='en'?'en-KE':locale}"`);
 const source=renderToStaticMarkup(createElement(OriginalEventPoster,{name:'Original Event',image:'/original-poster.jpg',caption:'Original supplied caption · A & B'}));
 expect(source).toContain('alt="Original supplied caption · A &amp; B"');expect(source).toContain('lang="en-KE"');
});

it.each(INTERFACE_LOCALES)('localizes generated gallery descriptions without rewriting asset titles in %s',locale=>{
 selected.locale=locale;const item=media.find(value=>value.kind==='photograph')!;
 for(const [kind,words] of [['photo',photoWords],['poster',archiveWords]] as const){
  const description=Object.freeze({kind,title:'Original Collection',index:2});
  const html=renderToStaticMarkup(createElement(MediaImage,{id:item.id,generatedDescription:description}));
  expect(html).toContain(words[locale]);expect(html).toContain('Original Collection');expect(html).toContain('2');
  expect(html).toContain(`lang="${locale==='en'?'en-KE':locale}"`);expect(html).toContain(`src="${item.src}"`);
 }
 const original=renderToStaticMarkup(createElement(MediaImage,{id:item.id,alt:'Original supplied asset caption'}));
 expect(original).toContain('alt="Original supplied asset caption"');expect(original).toContain('lang="en-KE"');
 const collection=collections.find(value=>value.slug==='machakos-campus')!;
 const gallery=renderToStaticMarkup(createElement(MediaGallery,{slug:collection.slug}));
 expect(gallery).toContain(photoWords[locale]);expect(gallery).toContain(collection.title);
});
