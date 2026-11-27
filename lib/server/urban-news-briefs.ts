import {createHash} from 'node:crypto';
import bundledBriefs from '../../data/urban-news-local-briefs.json';
import {cached} from './microcache';
import {canonicalNewsUrl} from './urban-news-policy';

const archive = 'https://raw.githubusercontent.com/eugineous/urban-gang-tour-/urban-news-feeds/';
const outlets = {
  KE: {publisher:'The Standard Entertainment', hosts:['www.standardmedia.co.ke','www.tnx.africa'], country:'Kenya'},
  UG: {publisher:'Matooke Republic', hosts:['www.matookerepublic.com'], country:'Uganda'},
  NG: {publisher:'NotJustOk', hosts:['notjustok.com'], country:'Nigeria'},
  GB: {publisher:'BBC News', hosts:['www.bbc.co.uk','www.bbc.com'], country:'United Kingdom'},
} as const;
const topics = ['Music','Screen','Culture'] as const;
const dayFormat = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi'});
const validDay = /^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const validId = /^[a-f0-9]{24}$/;

export type PublisherBrief = {
  id:string;
  url:string;
  publisher:string;
  country:keyof typeof outlets;
  topic:typeof topics[number];
  sourceHeadline:string;
  headline:string;
  body:string;
  sourceDate:string;
  publishedAt:string;
};
const storyText=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>=12&&value.length<=max&&!/[<>\p{Cf}\u0000-\u001f]/u.test(value);
const isObject = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);

export function publisherBriefHref(brief:PublisherBrief) {
  return '/news/brief/'+dayFormat.format(new Date(brief.publishedAt))+'/'+brief.id;
}

export function parsePublisherBriefs(input:unknown):PublisherBrief[] {
  if(!Array.isArray(input)||input.length>45)return [];
  return input.flatMap(row=>{
    if(!isObject(row)||typeof row.country!=='string'||!Object.hasOwn(outlets,row.country))return [];
    const outlet=outlets[row.country as keyof typeof outlets];
    if(row.publisher!==outlet.publisher||!topics.some(topic=>topic===row.topic)||
      !storyText(row.sourceHeadline,190)||!storyText(row.headline,230)||!storyText(row.body,450)||typeof row.sourceDate!=='string'||
      !Number.isFinite(Date.parse(row.sourceDate))||typeof row.publishedAt!=='string'||
      !Number.isFinite(Date.parse(row.publishedAt))||Date.parse(row.publishedAt)>Date.now()+60000)return [];
    let url:URL;
    try{url=new URL(canonicalNewsUrl(row.url))}catch{return []}
    if(url.protocol!=='https:'||!outlet.hosts.some(host=>host===url.hostname)||
      typeof row.id!=='string'||row.id!==createHash('sha256').update(url.href).digest('hex').slice(0,24))return [];
    return [{id:row.id,url:url.href,publisher:outlet.publisher,country:row.country as keyof typeof outlets,
      topic:row.topic as PublisherBrief['topic'],headline:row.headline,body:row.body,sourceHeadline:row.sourceHeadline,sourceDate:row.sourceDate,publishedAt:row.publishedAt}];
  });
}

async function readEdition(path:string) {
  const response=await fetch(archive+path,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!response.ok || Number(response.headers.get('content-length'))>80_000 || !response.body){
    await response.body?.cancel();
    throw Error('news_edition_unavailable');
  }
  const reader=response.body.getReader();
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let length=0,json='';
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)return JSON.parse(json+decoder.decode()) as unknown;
      length+=value.byteLength;
      if(length>80_000){await reader.cancel();throw Error('news_edition_unavailable')}
      json+=decoder.decode(value,{stream:true});
    }
  }finally{reader.releaseLock()}
}

export async function getPublisherBriefs(country?:string) {
  const fresh=await cached('urban-news:local-edition',5*60_000,async()=>{
    return parsePublisherBriefs(await readEdition('latest-briefs.json'));
  }).catch(()=>parsePublisherBriefs(bundledBriefs));
  return fresh.filter(brief=>(!country||brief.country===country)&&Date.now()-Date.parse(brief.sourceDate)<72*3600_000);
}

export async function getPublisherBrief(day:string,id:string) {
  if(!validDay.test(day)||!validId.test(id))return;
  const sameStory=(brief:PublisherBrief)=>brief.id===id&&dayFormat.format(new Date(brief.publishedAt))===day;
  const local=parsePublisherBriefs(bundledBriefs).find(sameStory);
  const latest=await getPublisherBriefs();
  const active=latest.find(sameStory);
  if(active)return active;
  const edition=await cached('urban-news:edition:'+day,15*60_000,async()=>{
    const data=await readEdition('editions/'+day+'.json');
    return isObject(data)&&data.day===day?parsePublisherBriefs(data.stories):[];
  }).catch(()=>undefined);
  return edition?edition.find(sameStory):local;
}

export function briefCountry(brief:PublisherBrief) {
  return outlets[brief.country].country;
}
