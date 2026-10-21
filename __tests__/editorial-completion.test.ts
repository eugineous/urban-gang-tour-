import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {editorialCompletion} from '@/lib/editorial-completion';

const original='a'.repeat(64),completed='b'.repeat(64);
function article(index=0){
 const date=new Date(Date.UTC(2026,9,30+index)).toISOString().slice(0,10);
 return {slug:'fictional-completion-'+index,date,scheduled_at:date+'T06:30:00+03:00',title:'Fictional fixture guide '+index,section:'Fixture analysis',description:'Synthetic validator fixture, not a real manuscript.',author:'Fixture desk',kind:'article',markdown:'# Fictional fixture\n\n'+Array(410).fill('fixture').join(' '),image_prompt:'Synthetic image brief.',metadata:{editorial_type:'Analysis / practical guide',original_assignment_sha256:original}};
}
function sample(count=1){
 const items=Array.from({length:count},(_,index)=>article(index));
 return {version:1,mode:'complete_owner_analysis',request_id:'12345678-1234-1234-1234-123456789abc',original_source_sha256:original,requested_at:'2026-10-21T09:00:00.000Z',expires_at:'2026-10-22T09:00:00.000Z',source_request:'Complete and schedule the remaining analytical guides.',bundle:{version:1,source_sha256:completed,items},targets:items.map(item=>({slug:item.slug,hash:'c'.repeat(64),revision:1}))};
}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-21T09:00:00.000Z'));});
afterEach(()=>vi.useRealTimers());

describe('private editorial completion manifest',()=>{
 it('normalises a complete bounded article bundle and retains exact existing-row targets',()=>{
  const request=sample(),value=editorialCompletion(request);
  expect(value.mode).toBe('complete_owner_analysis');expect(value.original_source_sha256).toBe(original);
  expect(value.bundle.source_sha256).toBe(completed);expect(value.bundle.items[0].scheduled_at).toBe('2026-10-30T03:30:00.000Z');
  expect(value.targets).toEqual(request.targets);
 });
 it('accepts exactly 63 consecutive original calendar slots and reordered target mappings',()=>{
  const request=sample(63);request.targets.reverse();
  expect(editorialCompletion(request).bundle.items.at(-1)?.date).toBe('2026-12-31');
 });
 it('allows a schema-valid expired request so the mutation can return a harmless expired result',()=>{
  const request={...sample(),requested_at:'2026-10-19T09:00:00.000Z',expires_at:'2026-10-20T09:00:00.000Z'};
  expect(editorialCompletion(request).expires_at).toBe(request.expires_at);
 });
 it.each([null,[],{},'manifest',1])('rejects malformed root input %j',value=>{
  expect(()=>editorialCompletion(value)).toThrow();
 });
 it('rejects unknown root keys, missing fields and caller-selected actions or auth',()=>{
  const request=sample();
  for(const field of ['published','action','auth','session','actor'])expect(()=>editorialCompletion({...request,[field]:true})).toThrow('invalid_editorial_completion');
  expect(()=>editorialCompletion({...request,[Symbol('unexpected')]:true})).toThrow('invalid_editorial_completion');
  for(const field of Object.keys(request)){const missing={...request} as Record<string,unknown>;delete missing[field];expect(()=>editorialCompletion(missing)).toThrow();}
 });
 it('rejects wrong versions, mode, request identity and invalid original provenance',()=>{
  const request=sample();
  for(const change of [{version:2},{mode:'approve_all'},{request_id:'a'.repeat(36)},{request_id:'12345678-1234-1234-1234-123456789abg'},{original_source_sha256:'A'.repeat(64)},{original_source_sha256:'short'}])expect(()=>editorialCompletion({...request,...change})).toThrow('invalid_editorial_completion');
 });
 it.each(['','  ','a'.repeat(2001),'request\u0000hidden'])('rejects missing, oversized or unsafe source request',source_request=>{
  expect(()=>editorialCompletion({...sample(),source_request})).toThrow('invalid_editorial_completion');
 });
 it('requires canonical UTC instants, not local offsets, rolled-over dates or missing milliseconds',()=>{
  for(const time of ['2026-10-21T12:00:00.000+03:00','2026-10-21T09:00:00Z','2026-02-30T09:00:00.000Z','2026-10-21T24:00:00.000Z','not-a-time']){
   expect(()=>editorialCompletion({...sample(),requested_at:time})).toThrow('invalid_completion_time');
   expect(()=>editorialCompletion({...sample(),expires_at:time})).toThrow('invalid_completion_time');
  }
 });
 it('enforces future clock skew and validity interval boundaries without rejecting exactly 24 hours',()=>{
  const request=sample();expect(()=>editorialCompletion(request)).not.toThrow();
  expect(()=>editorialCompletion({...request,requested_at:'2026-10-21T09:01:00.000Z'})).not.toThrow();
  expect(()=>editorialCompletion({...request,requested_at:'2026-10-21T09:01:00.001Z'})).toThrow('invalid_completion_time');
  for(const expires_at of [request.requested_at,'2026-10-21T08:59:59.999Z','2026-10-22T09:00:00.001Z'])expect(()=>editorialCompletion({...request,expires_at})).toThrow('invalid_completion_time');
 });
 it('reuses strict bundle validation for raw briefs, incomplete bodies, unknown fields and duplicate slots',()=>{
  const request=sample();
  for(const markdown of ['## Proposed structure\n\n'+article().markdown,'**Reporting assignment:** '+article().markdown,'requires_primary_reporting '+article().markdown,'requires_verification_and_full_draft '+article().markdown,'# Short\n\nNot a full article.']){
   expect(()=>editorialCompletion({...request,bundle:{...request.bundle,items:[{...article(),markdown}]}})).toThrow('incomplete_article');
  }
  expect(()=>editorialCompletion({...request,bundle:{...request.bundle,unrecognised:true}})).toThrow('invalid_editorial_bundle');
  expect(()=>editorialCompletion({...request,bundle:{...request.bundle,items:[{...article(),published:true}]}})).toThrow('invalid_editorial_item');
  const duplicate=sample(2);duplicate.bundle.items[1].slug=duplicate.bundle.items[0].slug;expect(()=>editorialCompletion(duplicate)).toThrow('duplicate_or_invalid_slot');
  const sameDate=sample(2);sameDate.bundle.items[1].date=sameDate.bundle.items[0].date;sameDate.bundle.items[1].scheduled_at=sameDate.bundle.items[0].scheduled_at;expect(()=>editorialCompletion(sameDate)).toThrow('duplicate_or_invalid_slot');
 });
 it('rejects assignment kinds, wrong analysis metadata and mismatched original archive provenance',()=>{
  const request=sample();
  for(const item of [{...article(),kind:'assignment'},{...article(),metadata:{...article().metadata,editorial_type:'Reported news'}},{...article(),metadata:{editorial_type:'Analysis / practical guide'}},{...article(),metadata:{...article().metadata,original_assignment_sha256:completed}}])expect(()=>editorialCompletion({...request,bundle:{...request.bundle,items:[item]}})).toThrow('invalid_completion_articles');
 });
 it('restricts completed articles to the original 30 October–31 December 2026 window',()=>{
  const request=sample();
  for(const date of ['2026-10-29','2027-01-01'])expect(()=>editorialCompletion({...request,bundle:{...request.bundle,items:[{...article(),date,scheduled_at:date+'T06:30:00+03:00'}]}})).toThrow('invalid_completion_articles');
 });
 it('rejects empty bundles and too many completion items',()=>{
  const request=sample();expect(()=>editorialCompletion({...request,bundle:{...request.bundle,items:[]},targets:[]})).toThrow();
  expect(()=>editorialCompletion(sample(64))).toThrow('invalid_completion_articles');
 });
 it('requires unique, complete one-to-one target mappings with no extra keys',()=>{
  const request=sample(2);
  for(const targets of [[],request.targets.slice(0,1),[...request.targets,request.targets[0]],[request.targets[0],request.targets[0]],[request.targets[0],{...request.targets[1],slug:'not-in-bundle'}],[request.targets[0],{...request.targets[1],published:true}]])expect(()=>editorialCompletion({...request,targets})).toThrow();
  expect(()=>editorialCompletion({...request,targets:Array(64).fill(request.targets[0])})).toThrow('invalid_completion_targets');
 });
 it('rejects malformed targets, missing hash or revision and unsafe revision values',()=>{
  const request=sample(),target=request.targets[0];
  for(const value of [null,[],{slug:target.slug,hash:target.hash},{slug:target.slug,revision:1},{...target,hash:'bad'},{...target,slug:'../admin'},{...target,revision:0},{...target,revision:-1},{...target,revision:1.5},{...target,revision:'1'},{...target,revision:Number.MAX_SAFE_INTEGER+1}])expect(()=>editorialCompletion({...request,targets:[value]})).toThrow('invalid_completion_target');
 });
});
