import {editorialBundle,editorialSlug,type EditorialBundle} from './editorial-import';

export type EditorialCompletion={
 version:1;mode:'complete_owner_analysis';request_id:string;
 original_source_sha256:string;requested_at:string;expires_at:string;
 source_request:string;bundle:EditorialBundle;
 targets:{slug:string;hash:string;revision:number}[];
};

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exactKeys=(value:Record<string,unknown>,allowed:string[])=>{
 const actual=Reflect.ownKeys(value);
 return actual.length===allowed.length&&actual.every(key=>typeof key==='string'&&allowed.includes(key));
};
const sha256=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function canonicalInstant(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))return false;
 const parsed=new Date(value);
 return Number.isFinite(parsed.getTime())&&parsed.toISOString()===value;
}

/** Private, expiring data manifest, not a public write endpoint or login.
 * Targets bind the existing assignments; the bundle supplies complete articles.
 * Schema validity is not proof of authority, fact checking or publication.
 * Expiry/revision/hash checks must also be enforced by the server mutation.
 */
export function editorialCompletion(raw:unknown):EditorialCompletion{
 if(!object(raw)||!exactKeys(raw,['version','mode','request_id','original_source_sha256','requested_at','expires_at','source_request','bundle','targets'])||raw.version!==1||raw.mode!=='complete_owner_analysis'||typeof raw.request_id!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(raw.request_id)||!sha256(raw.original_source_sha256)||typeof raw.source_request!=='string'||!raw.source_request.trim()||raw.source_request.length>2000||raw.source_request.includes('\u0000'))throw Error('invalid_editorial_completion');
 if(!canonicalInstant(raw.requested_at)||!canonicalInstant(raw.expires_at))throw Error('invalid_completion_time');
 const start=Date.parse(raw.requested_at),end=Date.parse(raw.expires_at);
 if(start>Date.now()+60000||end<=start||end-start>86400000)throw Error('invalid_completion_time');
 const bundle=editorialBundle(raw.bundle);
 if(bundle.items.length>63||bundle.items.some(item=>item.kind!=='article'||item.date<'2026-10-30'||item.date>'2026-12-31'||item.metadata.editorial_type!=='Analysis / practical guide'||item.metadata.original_assignment_sha256!==raw.original_source_sha256))throw Error('invalid_completion_articles');
 if(!Array.isArray(raw.targets)||!raw.targets.length||raw.targets.length>63||raw.targets.length!==bundle.items.length)throw Error('invalid_completion_targets');
 const expected=new Set(bundle.items.map(item=>item.slug)),seen=new Set<string>();
 const targets:EditorialCompletion['targets']=[];
 for(const target of raw.targets){
  if(!object(target)||!exactKeys(target,['slug','hash','revision'])||!editorialSlug(target.slug)||!expected.has(target.slug)||seen.has(target.slug)||!sha256(target.hash)||typeof target.revision!=='number'||!Number.isSafeInteger(target.revision)||target.revision<1)throw Error('invalid_completion_target');
  seen.add(target.slug);targets.push({slug:target.slug,hash:target.hash,revision:target.revision});
 }
 return {version:1,mode:'complete_owner_analysis',request_id:raw.request_id,original_source_sha256:raw.original_source_sha256,requested_at:raw.requested_at,expires_at:raw.expires_at,source_request:raw.source_request,bundle,targets};
}
