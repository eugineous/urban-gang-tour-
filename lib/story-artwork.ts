import {editorialAsset,editorialSlug,type EditorialAsset} from './editorial-import';

export type StoryArtworkTarget={slug:string;expected_image:string;expected_headline:string;expected_date:string;expected_version:string;assets:EditorialAsset};
export type StoryArtworkManifest={version:1;mode:'owner_approved_story_artwork';phase:'preview'|'apply';request_id:string;requested_at:string;expires_at:string;source_request:string;targets:StoryArtworkTarget[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(key=>allowed.includes(key));
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!v.includes('\u0000');
const instant=(v:unknown):v is string=>text(v,40)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));

/** Strict private operator data: cannot approve content, execute code or fetch a URL. */
export function storyArtworkManifest(raw:unknown):StoryArtworkManifest{
 if(!object(raw)||!keys(raw,['version','mode','phase','request_id','requested_at','expires_at','source_request','targets'])||raw.version!==1||raw.mode!=='owner_approved_story_artwork'||!['preview','apply'].includes(String(raw.phase))||!text(raw.request_id,36)||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(raw.request_id)||!instant(raw.requested_at)||!instant(raw.expires_at)||!text(raw.source_request,3000)||!Array.isArray(raw.targets)||raw.targets.length<1||raw.targets.length>10)throw Error('invalid_story_artwork_manifest');
 const start=Date.parse(raw.requested_at),end=Date.parse(raw.expires_at);
 if(start>Date.now()+60000||end<=start||end-start>86400000)throw Error('invalid_story_artwork_validity');
 const seen=new Set<string>();
 const targets=raw.targets.map((target):StoryArtworkTarget=>{
  if(!object(target)||!keys(target,['slug','expected_image','expected_headline','expected_date','expected_version','assets'])||!editorialSlug(target.slug)||seen.has(target.slug)||!text(target.expected_image,3000)||!text(target.expected_headline,500)||!text(target.expected_version,64)||!/^[a-f0-9]{64}$/.test(target.expected_version)||typeof target.expected_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(target.expected_date)||!Number.isFinite(Date.parse(target.expected_date))||new Date(target.expected_date).toISOString().slice(0,10)!==target.expected_date)throw Error('invalid_story_artwork_target');
  const assets=editorialAsset(target.assets);
  if(!assets.illustration||!/AI-generated editorial illustration/i.test(assets.caption))throw Error('story_artwork_illustration_required');
  seen.add(target.slug);
  return {...target,assets} as StoryArtworkTarget;
 });
 return {...raw,targets} as StoryArtworkManifest;
}
