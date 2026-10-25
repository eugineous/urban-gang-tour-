import {afterEach,expect,it,vi} from 'vitest';
import {storyArtworkManifest} from '@/lib/story-artwork';
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
it('bounds request age and validity without converting expired requests into live permission',()=>{
 vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-25T12:00:00Z'));const m=sample();
 expect(()=>storyArtworkManifest({...m,requested_at:'2026-10-25T12:02:00Z'})).toThrow();
 expect(()=>storyArtworkManifest({...m,expires_at:'2026-10-27T12:00:00Z'})).toThrow();
 expect(()=>storyArtworkManifest({...m,requested_at:'invalid'})).toThrow();
 expect(storyArtworkManifest({...m,requested_at:'2026-10-25T09:00:00Z',expires_at:'2026-10-25T10:00:00Z'}).expires_at).toBe('2026-10-25T10:00:00Z');
});
