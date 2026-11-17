import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {NEWS_CATEGORIES,type UrbanNewsDraft,type NewsPublication} from '@/lib/shared/urban-news';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).every(key=>keys.includes(key));
const text=(v:unknown,max:number,required=false):v is string=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)&&(!required||!!v.trim());
const member=(value:unknown,allowed:readonly string[])=>typeof value==='string'&&allowed.includes(value);
export function isNewsInstant(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))return false;
 const wall=Date.parse(value.slice(0,19)+'Z');
 return Number.isFinite(wall)&&new Date(wall).toISOString().slice(0,19)===value.slice(0,19);
}
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(object(value))return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
 return value;
}
export const urbanNewsDraftHash=(draft:UrbanNewsDraft)=>createHash('sha256').update(JSON.stringify(canonical(draft))).digest('hex');

/** URLs are attribution data only. This does not fetch them or bypass source access. */
export function canonicalNewsUrl(value:unknown):string{
 if(!text(value,2000,true)||/[\s\\]/.test(value))throw Error('invalid_news_url');
 let url:URL;try{url=new URL(value)}catch{throw Error('invalid_news_url')}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port||isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||host.endsWith('.')||/(?:^|\.)(?:localhost|local|internal|test\.invalid)$/.test(host))throw Error('invalid_news_url');
 if([...url.searchParams.keys()].some(key=>/^(?:api_?key|access_?token|token|password|secret|authorization|auth)$/i.test(key)))throw Error('invalid_news_url');
 for(const key of [...url.searchParams.keys()])if(/^(?:utm_.+|fbclid|gclid|dclid|msclkid)$/i.test(key))url.searchParams.delete(key);
 url.searchParams.sort();url.hash='';
 return url.href;
}

/** Private drafts may be incomplete; malformed data and arbitrary image fetch URLs are rejected. */
export function validateUrbanNewsDraft(value:unknown):UrbanNewsDraft{
 if(!object(value)||!exact(value,['headline','dek','body','category','country','verification','subjectKind','risk','evidence','claims','image','imageAlt','imageRights','author','disclosure'])||
  !text(value.headline,500)||!text(value.dek,2000)||!text(value.country,80)||!/^(?:Global|[A-Z]{2})$/.test(value.country)||!text(value.author,180)||!text(value.disclosure,2000)||!text(value.imageAlt,1000)||
  !member(value.category,NEWS_CATEGORIES)||!member(value.verification,['confirmed','attributed','developing'])||!member(value.subjectKind,['public_figure','organization','unknown'])||!member(value.risk,['routine','sensitive','unknown'])||!member(value.imageRights,['none','owned','licensed'])||
  !Array.isArray(value.body)||value.body.length>200||value.body.some(paragraph=>!text(paragraph,12000))||value.body.join('').length>100000||
  !Array.isArray(value.evidence)||value.evidence.length>30||!Array.isArray(value.claims)||value.claims.length>100||!text(value.image,1000))throw Error('invalid_news_draft');
 if(value.image&&!/^\/media\/admin-stories\/[a-f0-9]{64}\/[a-zA-Z0-9._-]+\.(?:webp|png|jpe?g)$/.test(value.image))throw Error('invalid_news_image');
 const ids=new Set<string>();
 for(const evidence of value.evidence){
  if(!object(evidence)||!exact(evidence,['id','url','publisher','title','observedAt','publishedAt','excerpt','rights','role','independenceKey','checked'])||!text(evidence.id,80,true)||!/^[a-zA-Z0-9_-]+$/.test(evidence.id)||ids.has(evidence.id)||!text(evidence.publisher,300,true)||!text(evidence.title,1000,true)||!text(evidence.excerpt,4000)||!text(evidence.independenceKey,300,true)||!isNewsInstant(evidence.observedAt)||Date.parse(String(evidence.observedAt))>Date.now()+60000||evidence.publishedAt!==null&&(!isNewsInstant(evidence.publishedAt)||Date.parse(String(evidence.publishedAt))>Date.now()+60000)||!member(evidence.rights,['unknown','link_only','public_facts','owned','licensed'])||!member(evidence.role,['primary','report'])||typeof evidence.checked!=='boolean')throw Error('invalid_news_evidence');
  canonicalNewsUrl(evidence.url);ids.add(evidence.id);
 }
 for(const claim of value.claims)if(!object(claim)||!exact(claim,['text','evidenceIds'])||!text(claim.text,2000,true)||!Array.isArray(claim.evidenceIds)||claim.evidenceIds.length>30||claim.evidenceIds.some(id=>!text(id,80,true))||new Set(claim.evidenceIds).size!==claim.evidenceIds.length)throw Error('invalid_news_claim');
 return value as UrbanNewsDraft;
}

/** An owner attestation, never a model's assertion that facts were checked. */
export function validateNewsPublication(draft:UrbanNewsDraft,checks:NewsPublication['checks']):void{
 validateUrbanNewsDraft(draft);
 if(!object(checks)||!exact(checks,['facts','rights','attribution','sensitiveNotes'])||checks.facts!==true||checks.rights!==true||checks.attribution!==true||checks.sensitiveNotes!==undefined&&!text(checks.sensitiveNotes,4000))throw Error('news_review_checks_required');
 if(!draft.headline.trim()||!draft.dek.trim()||!draft.author.trim()||!draft.body.length||draft.body.some(paragraph=>!paragraph.trim())||!draft.claims.length)throw Error('news_incomplete_draft');
 if(draft.risk==='unknown'||draft.subjectKind==='unknown')throw Error('news_risk_review_required');
 if(draft.risk==='sensitive'&&(!checks.sensitiveNotes||checks.sensitiveNotes.trim().length<30))throw Error('news_sensitive_notes_required');
 if(!draft.evidence.length||draft.evidence.some(evidence=>!evidence.checked||evidence.rights==='unknown'||!evidence.excerpt.trim()))throw Error('news_evidence_required');
 const checked=new Set(draft.evidence.filter(evidence=>evidence.checked).map(evidence=>evidence.id));
 if(draft.claims.some(claim=>!claim.evidenceIds.length||claim.evidenceIds.some(id=>!checked.has(id))))throw Error('news_claim_evidence_required');
 if(draft.verification==='confirmed'&&!draft.evidence.some(evidence=>evidence.role==='primary')&&new Set(draft.evidence.map(evidence=>evidence.independenceKey.toLowerCase())).size<2)throw Error('news_independent_sources_required');
 if(draft.image&&(draft.imageRights==='none'||!draft.imageAlt.trim()))throw Error('news_image_rights_required');
}
