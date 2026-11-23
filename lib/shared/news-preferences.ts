import {nativeLocale,type InterfaceLocale} from '@/lib/i18n/locale';
import {NEWS_CATEGORIES,type NewsCategory} from './urban-news';

/** Selection is a reading preference, never evidence of an operational local desk. */
export const NEWS_MARKETS=[
 {code:'KE',name:'Kenya'}, {code:'UG',name:'Uganda'}, {code:'TZ',name:'Tanzania'},
 {code:'SO',name:'Somalia'}, {code:'GB',name:'United Kingdom'}, {code:'US',name:'United States'},
 {code:'SE',name:'Sweden'}, {code:'NL',name:'Netherlands'}, {code:'KZ',name:'Kazakhstan'},
 {code:'IN',name:'India'}, {code:'NG',name:'Nigeria'}, {code:'ZA',name:'South Africa'},
 {code:'GH',name:'Ghana'}, {code:'RW',name:'Rwanda'}, {code:'Global',name:'Global'},
] as const;
export type NewsMarketCode=typeof NEWS_MARKETS[number]['code'];
export type NewsPreferences=Readonly<{
 homeMarket:NewsMarketCode;
 followedMarkets:readonly NewsMarketCode[];
 topics:readonly NewsCategory[];
 language:InterfaceLocale;
}>;
export const DEFAULT_NEWS_PREFERENCES:NewsPreferences=Object.freeze({homeMarket:'KE',followedMarkets:Object.freeze([]),topics:Object.freeze([]),language:'en'});
export function isNewsMarket(value:unknown):value is NewsMarketCode{return NEWS_MARKETS.some(market=>market.code===value)}
export function parseNewsPreferences(value:unknown):NewsPreferences|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(Object.keys(v).length!==4||Object.keys(v).some(key=>!['homeMarket','followedMarkets','topics','language'].includes(key))||!isNewsMarket(v.homeMarket)||!nativeLocale(v.language)||!Array.isArray(v.followedMarkets)||v.followedMarkets.length>10||v.followedMarkets.some(m=>!isNewsMarket(m))||!Array.isArray(v.topics)||v.topics.length>14||v.topics.some(topic=>!NEWS_CATEGORIES.includes(topic)))return null;
 const followedMarkets=[...new Set(v.followedMarkets)] as NewsMarketCode[],topics=[...new Set(v.topics)] as NewsCategory[];
 if(followedMarkets.length>5||topics.length>7)return null;
 return Object.freeze({homeMarket:v.homeMarket,followedMarkets:Object.freeze(followedMarkets),topics:Object.freeze(topics),language:v.language as InterfaceLocale});
}
export function newsMarketName(code:string,locale='en'):string{
 if(code==='Global')return 'Global';
 try{return new Intl.DisplayNames([locale],{type:'region'}).of(code)||code}catch{return NEWS_MARKETS.find(m=>m.code===code)?.name||code}
}
