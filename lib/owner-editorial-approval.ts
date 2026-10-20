import {editorialSlug} from './editorial-import';
export type OwnerEditorialApproval={
 version:1;mode:'owner_approved_analysis';request_id:string;source_sha256:string;
 requested_at:string;expires_at:string;source_request:string;
 targets:{slug:string;hash:string;revision:number}[];
};
/** Explicit publisher approval is not a fact-check certificate or permission for briefs. */
export function ownerEditorialApproval(raw:unknown):OwnerEditorialApproval{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('invalid_owner_approval');
 const d=raw as Record<string,unknown>;
 if(Object.keys(d).some(k=>!['version','mode','request_id','source_sha256','requested_at','expires_at','source_request','targets'].includes(k))||d.version!==1||d.mode!=='owner_approved_analysis'||typeof d.request_id!=='string'||! /^[a-f0-9-]{36}$/.test(d.request_id)||typeof d.source_sha256!=='string'||! /^[a-f0-9]{64}$/.test(d.source_sha256)||typeof d.source_request!=='string'||!d.source_request.trim()||d.source_request.length>2000||typeof d.requested_at!=='string'||typeof d.expires_at!=='string')throw Error('invalid_owner_approval');
 for(const time of [d.requested_at,d.expires_at])if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(time)||!Number.isFinite(Date.parse(time)))throw Error('invalid_approval_time');
 const start=Date.parse(d.requested_at),end=Date.parse(d.expires_at);
 if(start>Date.now()+60000||end<=start||end-start>86400000)throw Error('invalid_approval_time');
 if(!Array.isArray(d.targets)||!d.targets.length||d.targets.length>10)throw Error('invalid_approval_targets');
 const seen=new Set<string>();
 for(const target of d.targets){
  if(!target||typeof target!=='object'||Array.isArray(target)||Object.keys(target).some(k=>!['slug','hash','revision'].includes(k))||!editorialSlug(target.slug)||seen.has(target.slug)||typeof target.hash!=='string'||! /^[a-f0-9]{64}$/.test(target.hash)||!Number.isSafeInteger(target.revision)||target.revision<1)throw Error('invalid_approval_target');
  seen.add(target.slug);
 }
 return d as OwnerEditorialApproval;
}
