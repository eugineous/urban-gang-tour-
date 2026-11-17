import {describe,expect,it} from 'vitest';
import {urbanNewsDraftHash,validateUrbanNewsDraft,validateNewsPublication,canonicalNewsUrl} from '@/lib/server/urban-news-policy';
import type {UrbanNewsDraft} from '@/lib/shared/urban-news';
export const checkedDraft:UrbanNewsDraft={headline:'A fictional music announcement',dek:'Fixture reporting only.',body:['The fictional artist announced a fixture release.'],category:'music',country:'KE',verification:'attributed',subjectKind:'public_figure',risk:'routine',evidence:[{id:'source-1',url:'https://example.test/announcement',publisher:'Fixture publisher',title:'Fixture announcement',observedAt:'2026-11-17T00:00:00Z',publishedAt:null,excerpt:'The fictional artist announced a fixture release.',rights:'public_facts',role:'primary',independenceKey:'fixture-publisher',checked:true}],claims:[{text:'A release was announced.',evidenceIds:['source-1']}],image:'',imageAlt:'',imageRights:'none',author:'Urban News',disclosure:'Prepared with AI assistance; reviewed by an editor.'};
describe('Urban News editorial policy',()=>{
 it('hashes the full saved revision including evidence with stable object ordering',()=>{
  expect(urbanNewsDraftHash(checkedDraft)).toMatch(/^[a-f0-9]{64}$/);
  expect(urbanNewsDraftHash({...checkedDraft,evidence:[{...checkedDraft.evidence[0],excerpt:'Changed evidence'}]})).not.toBe(urbanNewsDraftHash(checkedDraft));
  expect(urbanNewsDraftHash({...checkedDraft,body:[...checkedDraft.body]})).toBe(urbanNewsDraftHash(checkedDraft));
 });
 it('canonicalizes only public HTTPS source URLs without tracking',()=>{
  expect(canonicalNewsUrl('https://EXAMPLE.test/story?utm_source=fixture&a=2#part')).toBe('https://example.test/story?a=2');
  for(const url of ['http://example.test','https://user:pass@example.test','https://127.0.0.1/story','https://localhost/','https://169.254.169.254/','https://[::1]/'])expect(()=>canonicalNewsUrl(url)).toThrow('invalid_news_url');
 });
 it('allows incomplete private research but refuses publication without checked claim evidence',()=>{
  expect(validateUrbanNewsDraft({...checkedDraft,body:[],claims:[],risk:'unknown',evidence:[]})).toBeDefined();
  expect(()=>validateNewsPublication({...checkedDraft,evidence:[{...checkedDraft.evidence[0],checked:false}]},{facts:true,rights:true,attribution:true})).toThrow('news_evidence_required');
  expect(()=>validateNewsPublication({...checkedDraft,claims:[{text:'Unsupported',evidenceIds:['wrong']} ]},{facts:true,rights:true,attribution:true})).toThrow('news_claim_evidence_required');
  expect(()=>validateNewsPublication(checkedDraft,{facts:true,rights:true,attribution:true})).not.toThrow();
 });
 it('holds unknown risk and requires sensitive review notes, owned image rights and all attestations',()=>{
  expect(()=>validateNewsPublication({...checkedDraft,risk:'unknown'},{facts:true,rights:true,attribution:true})).toThrow('news_risk_review_required');
  expect(()=>validateNewsPublication({...checkedDraft,risk:'sensitive'},{facts:true,rights:true,attribution:true})).toThrow('news_sensitive_notes_required');
  expect(()=>validateNewsPublication({...checkedDraft,risk:'sensitive'},{facts:true,rights:true,attribution:true,sensitiveNotes:'Editor checked the attributed public announcement and privacy boundaries.'})).not.toThrow();
  expect(()=>validateNewsPublication({...checkedDraft,image:'https://publisher.test/photo.jpg',imageRights:'none'},{facts:true,rights:true,attribution:true})).toThrow();
  expect(()=>validateNewsPublication(checkedDraft,{facts:false,rights:true,attribution:true})).toThrow('news_review_checks_required');
 });
});
