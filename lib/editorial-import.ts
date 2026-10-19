import { nairobiScheduleInstant } from './editorial-time';

export type EditorialItem = {
  slug:string; date:string; scheduled_at:string; title:string; section:string;
  description:string; author:string; kind:'article'|'assignment';
  markdown:string; image_prompt:string; metadata:Record<string,string|number>;
};
export type EditorialBundle = {version:1; source_sha256:string; items:EditorialItem[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const text=(v:unknown,max:number,required=true):v is string=>typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0)&&!v.includes('\u0000');
export const editorialSlug=(v:unknown):v is string=>typeof v==='string'&&v.length<=240&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

/** Strict data only. This gateway never evaluates pasted code, fetches URLs or grants publication. */
export function editorialBundle(value:unknown):EditorialBundle{
  if(!object(value)||!keys(value,['version','source_sha256','items'])||value.version!==1||typeof value.source_sha256!=='string'||! /^[a-f0-9]{64}$/.test(value.source_sha256)||!Array.isArray(value.items)||value.items.length<1||value.items.length>100)throw Error('invalid_editorial_bundle');
  const slugs=new Set<string>(),dates=new Set<string>();
  const items=value.items.map((raw):EditorialItem=>{
    if(!object(raw)||!keys(raw,['slug','date','scheduled_at','title','section','description','author','kind','markdown','image_prompt','metadata'])||!editorialSlug(raw.slug)||!text(raw.title,500)||!text(raw.section,120)||!text(raw.description,1000,false)||!text(raw.author,180)||!text(raw.markdown,100000)||!text(raw.image_prompt,12000)||!object(raw.metadata)||Object.keys(raw.metadata).length>40||Object.entries(raw.metadata).some(([k,v])=>k.length>80||!(text(v,4000,false)||typeof v==='number'&&Number.isFinite(v))))throw Error('invalid_editorial_item');
    if(raw.kind!=='article'&&raw.kind!=='assignment')throw Error('invalid_editorial_kind');
    if(typeof raw.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||typeof raw.scheduled_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:\+03:00|Z)$/.test(raw.scheduled_at))throw Error('nairobi_schedule_required');
    const parsed=new Date(raw.scheduled_at);if(!Number.isFinite(parsed.getTime()))throw Error('invalid_schedule');
    const wall=raw.scheduled_at.endsWith('+03:00')?raw.scheduled_at.slice(0,-6):new Date(parsed.getTime()+3*3600000).toISOString().slice(0,19),scheduled=nairobiScheduleInstant(wall);
    if(wall.slice(0,10)!==raw.date||slugs.has(raw.slug)||dates.has(raw.date))throw Error('duplicate_or_invalid_slot');
    // A copied brief labelled as an article cannot become a publishable draft.
    if(raw.kind==='article'&&(/requires_primary_reporting|requires_verification_and_full_draft|## Proposed structure|\*\*Reporting assignment:/.test(raw.markdown)||articleParagraphs(raw.markdown).join(' ').split(/\s+/).length<400))throw Error('incomplete_article');
    slugs.add(raw.slug);dates.add(raw.date);
    return {...raw,scheduled_at:scheduled} as EditorialItem;
  });
  return {version:1,source_sha256:value.source_sha256,items};
}

/** No HTML execution. Front matter and duplicate H1/deck are not article paragraphs. */
export function articleParagraphs(markdown:string):string[]{
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/,'').split(/\r?\n\s*\r?\n/).map(p=>p.trim()).filter(p=>p&&p!=='---'&&!/^# (?!#)/.test(p));
}

export type EditorialReview = {sources:{url:string;note:string;checked_at:string}[]; facts_checked:boolean; rights_checked:boolean; originality_checked:boolean; safeguarding_checked:boolean; disclosure:string};
export function editorialReview(value:unknown):EditorialReview{
  if(!object(value)||!keys(value,['sources','facts_checked','rights_checked','originality_checked','safeguarding_checked','disclosure'])||!Array.isArray(value.sources)||value.sources.length<1||value.sources.length>30||!text(value.disclosure,1500)||!['facts_checked','rights_checked','originality_checked','safeguarding_checked'].every(k=>value[k]===true))throw Error('review_checks_required');
  for(const source of value.sources){
    if(!object(source)||!keys(source,['url','note','checked_at'])||!text(source.url,2000)||!text(source.note,2000)||!text(source.checked_at,40))throw Error('invalid_source_record');
    let url;try{url=new URL(source.url)}catch{throw Error('invalid_source_url')}
    if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error('invalid_source_url');
    const time=Date.parse(source.checked_at);if(!Number.isFinite(time)||time>Date.now()+60000)throw Error('invalid_source_check_time');
  }
  return value as EditorialReview;
}

export type EditorialAsset={hero:string;og:string;alt:string;caption:string;rights:string;provenance:string;illustration:boolean};
export function editorialAsset(value:unknown):EditorialAsset{
  if(!object(value)||!keys(value,['hero','og','alt','caption','rights','provenance','illustration'])||!['hero','og','alt','caption','rights','provenance'].every(k=>text(value[k],k==='alt'?1000:3000))||typeof value.illustration!=='boolean')throw Error('image_details_required');
  // Only the existing access-controlled story upload scope. No SSRF or public draft bucket.
  for(const key of ['hero','og'])if(typeof value[key]!=='string'||!/^\/media\/admin-stories\/[a-f0-9]{64}\/[a-zA-Z0-9._-]+\.webp$/.test(value[key] as string)||(value[key] as string).includes('..'))throw Error('private_editorial_webp_required');
  if(value.hero===value.og)throw Error('separate_hero_and_og_required');
  if(value.illustration&&!/editorial illustration/i.test(String(value.caption)))throw Error('illustration_caption_required');
  return value as EditorialAsset;
}
