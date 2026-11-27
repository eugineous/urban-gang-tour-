import {createHash} from 'node:crypto';
import reports from '../../data/urban-news-reports.json';
import photos from '../../data/urban-news-photos.json';
import bundledBriefs from '../../data/urban-news-local-briefs.json';
import {blockedNewsMaterial} from '@/lib/shared/urban-news-editing';
import {cached} from './microcache';
import {canonicalNewsUrl} from './urban-news-policy';

const archive = 'https://raw.githubusercontent.com/eugineous/urban-gang-tour-/urban-news-feeds/';
const outlets = {
  KE: {publisher:'The Standard Entertainment', hosts:['www.standardmedia.co.ke','www.tnx.africa'], country:'Kenya'},
  UG: {publisher:'Matooke Republic', hosts:['www.matookerepublic.com'], country:'Uganda'},
  NG: {publisher:'NotJustOk', hosts:['notjustok.com'], country:'Nigeria'},
  GB: {publisher:'BBC News', hosts:['www.bbc.co.uk','www.bbc.com'], country:'United Kingdom'},
  TZ: {publisher:'BBC News Swahili', hosts:['www.bbc.co.uk','www.bbc.com'], country:'Tanzania'},
  SO: {publisher:'BBC News Somali', hosts:['www.bbc.co.uk','www.bbc.com'], country:'Somalia'},
} as const;
const topics = ['Music','Screen','Culture','Sport'] as const;
const dayFormat = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi'});
const validDay = /^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const validId = /^[a-f0-9]{24}$/;

type SourcePhoto={source:string;license:string;credit:string;licenseLabel:string;alt:string};
const licenseUrl=/^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/(?:3\.0|4\.0)|publicdomain\/(?:mark|zero)\/1\.0)\/?$/;
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
  paragraphs?:string[];
  references?:{url:string;label:string}[];
  photo?:string;
  kind?:string;
  categories?:string[];
  sourcePhoto?:SourcePhoto;
};
const storyText=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>=12&&value.length<=max&&!/[<>\p{Cf}\u0000-\u001f]/u.test(value);
const isObject = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);

export function publisherBriefHref(brief:PublisherBrief) {
  return '/news/brief/'+dayFormat.format(new Date(brief.publishedAt))+'/'+brief.id;
}

export function parsePublisherBriefs(input:unknown,limit=45):PublisherBrief[] {
  if(!Array.isArray(input)||input.length>limit)return [];
  return input.flatMap(row=>{
    if(!isObject(row)||typeof row.country!=='string'||!Object.hasOwn(outlets,row.country))return [];
    const outlet=outlets[row.country as keyof typeof outlets];
    const publisher=outlet.publisher===row.publisher?outlet.publisher:row.country==='KE'&&row.publisher==='The Standard Sport'?'The Standard Sport':null;
    if(!publisher||blockedNewsMaterial(row.headline as string,row.sourceHeadline as string,row.body as string,row.url as string)||!topics.some(topic=>topic===row.topic)||
      !storyText(row.sourceHeadline,190)||!storyText(row.headline,230)||!storyText(row.body,450)||typeof row.sourceDate!=='string'||
      !Number.isFinite(Date.parse(row.sourceDate))||typeof row.publishedAt!=='string'||
      !Number.isFinite(Date.parse(row.publishedAt))||Date.parse(row.publishedAt)>Date.now()+60000)return [];
    let url:URL;
    try{url=new URL(canonicalNewsUrl(row.url))}catch{return []}
    if(url.protocol!=='https:'||!outlet.hosts.some(host=>host===url.hostname)||
      typeof row.id!=='string'||row.id!==createHash('sha256').update(url.href).digest('hex').slice(0,24))return [];
    const sourcePhoto=parsePhoto(row.sourcePhoto,outlet.hosts);
    return [{...(sourcePhoto?{sourcePhoto}:{}),id:row.id,url:url.href,publisher,country:row.country as keyof typeof outlets,
      topic:row.topic as PublisherBrief['topic'],headline:row.headline,body:row.body,sourceHeadline:row.sourceHeadline,sourceDate:row.sourceDate,publishedAt:row.publishedAt}];
  });
}

function parsePhoto(value:unknown,hosts:readonly string[]):SourcePhoto|undefined{
  if(!isObject(value)||typeof value.license!=='string'||!licenseUrl.test(value.license)||
    !storyText('Image credit '+value.credit,200)||typeof value.credit!=='string'||typeof value.alt!=='string'||
    !storyText('Photograph '+value.alt,250)||typeof value.licenseLabel!=='string'||value.licenseLabel.length>50)return;
  try{
    const source=new URL(canonicalNewsUrl(value.source));
    if(hosts.includes(source.hostname))return {source:source.href,license:value.license,credit:value.credit,licenseLabel:value.licenseLabel,alt:value.alt};
  }catch{}
}

async function readEdition(path:string,maxBytes=80_000) {
  const response=await fetch(archive+path,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!response.ok || Number(response.headers.get('content-length'))>maxBytes || !response.body){
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
      if(length>maxBytes){await reader.cancel();throw Error('news_edition_unavailable')}
      json+=decoder.decode(value,{stream:true});
    }
  }finally{reader.releaseLock()}
}

const editorialReports=(reports as PublisherBrief[]).filter(brief=>!blockedNewsMaterial(brief.headline,brief.body,...(brief.paragraphs??[])));
function mergeReports(rows:PublisherBrief[]) {
  return [...new Map([...rows,...editorialReports].map(story=>[story.id,story])).values()]
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}

export async function getBriefArchive(){
  const [latest,historical]=await Promise.all([
    getPublisherBriefs(),
    cached('urban-news:brief-archive',15*60_000,async()=>parsePublisherBriefs(await readEdition('archive-briefs.json',1_250_000),1500)).catch(()=>[]),
  ]);
  return mergeReports([...historical,...latest]);
}

export function briefPhoto(brief:PublisherBrief) {
  if(brief.sourcePhoto){
    const href=publisherBriefHref(brief)+'/photo/';
    return {...brief.sourcePhoto,path:href+'960',srcSet:undefined};
  }
  let key=brief.photo;
  if(!key&&/\bTiwa Savage\b/i.test(brief.sourceHeadline))key='tiwa-savage';
  if(!key&&/\bStonebwoy\b/i.test(brief.sourceHeadline))key='stonebwoy';
  if(!key&&/\bNikita Kering\b/i.test(brief.sourceHeadline))key='nikita-kering';
  if(!key&&/\bRach(?:ael|eal) Magoola\b/i.test(brief.sourceHeadline))key='rachael-magoola';
  if(!key||['nairobi','mogadishu'].includes(key)||!Object.hasOwn(photos,key))return;
  const photo=photos[key as keyof typeof photos];
  return {...photo,srcSet:photo.smallWidth<photo.width?`${photo.small} ${photo.smallWidth}w, ${photo.path} ${photo.width}w`:undefined};
}

export async function getPublisherBriefs(country?:string) {
  const fresh=await cached('urban-news:local-edition',5*60_000,async()=>{
    return parsePublisherBriefs(await readEdition('latest-briefs.json'));
  }).catch(()=>parsePublisherBriefs(bundledBriefs));
  return mergeReports(fresh.filter(brief=>Date.now()-Date.parse(brief.sourceDate)<72*3600_000)).filter(brief=>(!country||brief.country===country)&&Date.parse(brief.publishedAt)>Date.now()-7*86400_000);
}

export async function getPublisherBrief(day:string,id:string) {
  if(!validDay.test(day)||!validId.test(id))return;
  const sameStory=(brief:PublisherBrief)=>brief.id===id&&dayFormat.format(new Date(brief.publishedAt))===day;
  const report=editorialReports.find(sameStory);
  if(report)return report;
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

export async function fetchBriefPhoto(brief:PublisherBrief,width:string){
  const target=archive+'photos/'+brief.id+'-'+width+'.webp';
  const response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(5000)});
  if(!response.ok||!['image/webp','application/octet-stream'].includes(response.headers.get('content-type')||'')||!response.body){
    await response.body?.cancel();
    return new Response(null,{status:404});
  }
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];
  let bytes=0;
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>1_000_000){await reader.cancel();return new Response(null,{status:404})}
      chunks.push(value);
    }
    const buffer=new Uint8Array(bytes);
    let offset=0;
    for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
    const signature=new TextDecoder().decode(buffer.slice(0,12));
    if(!signature.startsWith('RIFF')||!signature.endsWith('WEBP'))return new Response(null,{status:404});
    return new Response(buffer,{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'}});
  }finally{reader.releaseLock()}
}

export function briefCountry(brief:PublisherBrief) {
  return outlets[brief.country].country;
}

export async function getKenyaXLinks(){
  return cached('urban-news:kenya-x',30*60_000,async()=>{
    const rows=await readEdition('x-entertainment.json',20_000);
    if(!Array.isArray(rows)||rows.length>6)return [];
    return rows.flatMap(row=>{
      if(!isObject(row)||typeof row.url!=='string'||typeof row.user!=='string'||typeof row.date!=='string'||
        !/^[A-Za-z0-9_]{1,15}$/.test(row.user)||!/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d{8,25}$/.test(row.url)||
        !row.url.startsWith('https://x.com/'+row.user+'/status/'))return [];
      const age=Date.now()-Date.parse(row.date);
      return age>=0&&age<72*3600_000?[{url:row.url,user:row.user,date:row.date}]:[];
    });
  }).catch(()=>[]);
}
