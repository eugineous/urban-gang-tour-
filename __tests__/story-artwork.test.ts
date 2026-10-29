import {afterEach,expect,it,vi} from 'vitest';
import {storyArtworkManifest,storyArtworkInspection,storyArtworkQueue} from '@/lib/story-artwork';
const assets=()=>({hero:'/media/admin-stories/'+'a'.repeat(64)+'/hero.webp',og:'/media/admin-stories/'+'b'.repeat(64)+'/og.webp',alt:'An illustrated fictional planning desk',caption:'AI-generated editorial illustration',rights:'Owner-commissioned AI illustration',provenance:'AI-generated, not event photography',illustration:true});
const sample=()=>({version:1,mode:'owner_approved_story_artwork',phase:'apply',request_id:'12345678-1234-1234-1234-123456789abc',requested_at:new Date().toISOString(),expires_at:new Date(Date.now()+3600000).toISOString(),source_request:'Owner explicitly requests publishing these ten story illustrations.',targets:[{slug:'fictional-artwork-fixture',expected_image:'/assets/ugt-logo.png',expected_headline:'Fictional artwork fixture',expected_date:'2026-10-20',expected_version:'c'.repeat(64),assets:assets()}]});
afterEach(()=>vi.restoreAllMocks());
it('accepts exact data-only image changes for at most ten unique current stories',()=>{
 const valid=sample();expect(storyArtworkManifest(valid)).toEqual(valid);
 const ten=sample();ten.targets=Array.from({length:10},(_,i)=>({...ten.targets[0],slug:'fixture-'+i}));expect(storyArtworkManifest(ten).targets).toHaveLength(10);
 expect(()=>storyArtworkManifest({...ten,targets:[...ten.targets, {...ten.targets[0],slug:'eleventh'}]})).toThrow();
 expect(()=>storyArtworkManifest({...sample(),targets:[]})).toThrow();expect(()=>storyArtworkManifest({...sample(),targets:[...sample().targets,...sample().targets]})).toThrow();
});
it('rejects unbound versions, invalid dates, malformed phases and injected publication fields',()=>{
 const m=sample();
 for(const change of [{expected_version:''},{expected_version:'not-a-hash'},{expected_date:'2026-02-30'},{slug:'../private'},{published:true},{body:['replace the story']},{expected_headline:''}])expect(()=>storyArtworkManifest({...m,targets:[{...m.targets[0],...change}]})).toThrow();
 for(const change of [{phase:'publish-all'},{published:true},{mode:'approve_without_review'},{request_id:'not-a-uuid'}])expect(()=>storyArtworkManifest({...m,...change})).toThrow();
});
it('requires distinct same-origin hash-addressed WebPs and honest AI illustration details',()=>{
 const m=sample();
 for(const change of [{hero:'https://other.test/photo.webp'},{og:m.targets[0].assets.hero},{illustration:false},{caption:'Actual event photography'},{alt:''},{provenance:''},{hero:'/media/documents/'+'a'.repeat(64)+'/hero.webp'}])expect(()=>storyArtworkManifest({...m,targets:[{...m.targets[0],assets:{...assets(),...change}}]})).toThrow();
});
it('keeps the explicit synthetic stored caption and provenance while public presentation is neutral',()=>{
 const m=sample(),neutral={...m,targets:[{...m.targets[0],assets:{...assets(),caption:'Editorial illustration'}}]};
 expect(()=>storyArtworkManifest(neutral)).toThrow();
 expect(()=>storyArtworkManifest({...m,targets:[{...m.targets[0],assets:{...assets(),provenance:'Actual photograph from a reported event'}}]})).toThrow();
});
it('bounds request age and validity without converting expired requests into live permission',()=>{
 vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-25T12:00:00Z'));const m=sample();
 expect(()=>storyArtworkManifest({...m,requested_at:'2026-10-25T12:02:00Z'})).toThrow();
 expect(()=>storyArtworkManifest({...m,expires_at:'2026-10-27T12:00:00Z'})).toThrow();
 expect(()=>storyArtworkManifest({...m,requested_at:'invalid'})).toThrow();
 expect(storyArtworkManifest({...m,requested_at:'2026-10-25T09:00:00Z',expires_at:'2026-10-25T10:00:00Z'}).expires_at).toBe('2026-10-25T10:00:00Z');
});
it('requires explicit scheduled scope and refuses unknown or expanded authority',()=>{
 const m=sample();expect(storyArtworkManifest({...m,scope:'scheduled'})).toMatchObject({scope:'scheduled'});
 for(const scope of ['all','draft','scheduled-and-public',null])expect(()=>storyArtworkManifest({...m,scope})).toThrow();
});
it('inspects at most ten exact scheduled identities without accepting publication or manuscript data',()=>{
 const m=sample(),target={slug:m.targets[0].slug,expected_headline:m.targets[0].expected_headline,expected_date:m.targets[0].expected_date};
 const inspect={...m,mode:'inspect_scheduled_story_artwork',targets:[target]};delete (inspect as Partial<typeof inspect>).phase;
 expect(storyArtworkInspection(inspect)).toEqual(inspect);
 for(const change of [{targets:[]},{targets:[target,target]},{targets:Array.from({length:11},(_,i)=>({...target,slug:'fixture-'+i}))},{phase:'apply'},{published:true},{targets:[{...target,markdown:'private words'}]},{targets:[{...target,expected_date:'2026-02-30'}]}])expect(()=>storyArtworkInspection({...inspect,...change})).toThrow();
});
it('bounds queued scheduled requests to seven disjoint exact batches of one homogeneous phase',()=>{
 const requests=Array.from({length:7},(_,i)=>({...sample(),scope:'scheduled',request_id:`12345678-1234-1234-1234-123456789ab${i}`,targets:[{...sample().targets[0],slug:'queued-fixture-'+i}]}));
 const queue={version:1,mode:'scheduled_story_artwork_queue',request_id:'ffffffff-1234-1234-1234-123456789abc',requests};expect(storyArtworkQueue(queue)).toEqual(queue);
 for(const change of [{requests:[]},{requests:[...requests,requests[0]]},{requests:[requests[0],{...requests[1],request_id:requests[0].request_id}]},{requests:[requests[0],{...requests[1],targets:requests[0].targets}]},{requests:[{...requests[0],scope:'public'}]},{requests:[requests[0],{...requests[1],phase:'preview'}]},{requests:[{...requests[0],mode:'run_sql'}]},{sql:'UPDATE posts'}])expect(()=>storyArtworkQueue({...queue,...change})).toThrow();
});
