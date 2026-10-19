import catalogue from '@/data/google-translation-languages.json';
import {SITE} from './site';
export const TRANSLATION_LANGUAGES=catalogue.languages;
export const LANGUAGE_CHOICE_KEY='ugt-language-choice';
const codes=new Map(TRANSLATION_LANGUAGES.map(item=>[item.code.toLowerCase(),item.code]));
export function translationLanguage(value:unknown):string|undefined{
 if(typeof value!=='string'||value.length>50)return;
 const code=value.trim().replaceAll('_','-').toLowerCase();
 if(/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(code))return codes.get('zh-tw');
 if(code==='zh'||/^zh-(?:hans|cn|sg)(?:-|$)/.test(code))return codes.get('zh-cn');
 if(code==='iw')return codes.get('he')||codes.get('iw');
 if(code==='fil'||code==='tl')return codes.get('fil')||codes.get('tl');
 return codes.get(code)||codes.get(code.split('-')[0]);
}
export function preferredTranslationLanguage(languages:readonly string[],saved?:unknown):string{
 const explicit=translationLanguage(saved);if(explicit)return explicit;
 for(const value of languages.slice(0,20)){const code=translationLanguage(value);if(code)return code;}
 return 'en';
}
const publicPages=new Set(['/','/about','/experience','/portfolio','/proof','/partners','/clients','/work-with-us','/press','/blog','/gallery','/events','/reels','/international','/accessibility','/faq']);
export function publicTranslationPath(value:string):string|undefined{
 // Never propagate query strings, hashes, arbitrary origins, tokens, account,
 // commerce, booking, ticket-holder or staff URLs into an external service.
 if(value.includes('?')||value.includes('#')||value.includes('%')||value.includes('\\'))return;
 if(publicPages.has(value))return value;
 if(/^\/(?:blog|gallery|events)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<240)return value;
 if(/^\/welcome\/(?:en|sw|fr|zh-Hans|ru|es)$/.test(value))return value;
}
export function googleTranslationUrl(path:string,language:string):string|undefined{
 const publicPath=publicTranslationPath(path),code=translationLanguage(language);
 if(!publicPath||!code)return;
 const url=new URL('https://translate.google.com/translate');
 url.searchParams.set('sl','auto');url.searchParams.set('tl',code==='fil'?'tl':code);url.searchParams.set('u',SITE.domain+publicPath);
 return url.href;
}
export function localWelcomeLanguage(language:string):string|undefined{
 const code=translationLanguage(language);
 return code==='zh-CN'?'zh-Hans':['en','sw','fr','ru','es'].includes(code||'')?code:undefined;
}
