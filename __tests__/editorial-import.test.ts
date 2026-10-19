import {describe,it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {editorialBundle,editorialAsset,editorialReview,articleParagraphs} from '@/lib/editorial-import';
import ArticleText from '@/app/_components/ArticleText';
const item=()=>({slug:'fictional-fixture',date:'2026-10-20',scheduled_at:'2026-10-20T06:07:00+03:00',title:'Fictional fixture',section:'Analysis',description:'A fictional test only',author:'Fixture editorial desk',kind:'article',markdown:'# Fictional fixture\n\n'+('Useful test sentence. '.repeat(150)),image_prompt:'Original still life, no people',metadata:{}});
const bundle=()=>({version:1,source_sha256:'a'.repeat(64),items:[item()]});
afterEach(()=>vi.restoreAllMocks());
describe('private editorial input boundary',()=>{
 it('normalizes 06:07 Nairobi to 03:07 UTC and permits normalized draft edits',()=>{
  const parsed=editorialBundle(bundle());expect(parsed.items[0].scheduled_at).toBe('2026-10-20T03:07:00.000Z');expect(editorialBundle(parsed)).toEqual(parsed);
 });
 it.each(['2026-02-30T06:07:00+03:00','2026-10-20T06:07:00','2026-10-20T06:07:00-04:00'])('rejects invalid/ambiguous schedule %s',value=>{const b=bundle();b.items[0].scheduled_at=value;expect(()=>editorialBundle(b)).toThrow()});
 it('rejects duplicate dates/slugs and unexpected privilege fields',()=>{
  const b=bundle();b.items.push({...item(),slug:'second'});expect(()=>editorialBundle(b)).toThrow();expect(()=>editorialBundle({...bundle(),published:true})).toThrow();expect(()=>editorialBundle({...bundle(),items:[{...item(),published:true}]})).toThrow();
 });
 it('stores reporting assignments as assignments but rejects relabelled briefs',()=>{
  const b=bundle();b.items[0]={...item(),kind:'assignment',markdown:'## Proposed structure\n\n**Reporting assignment:** Obtain records.'};expect(editorialBundle(b).items[0].kind).toBe('assignment');b.items[0].kind='article';expect(()=>editorialBundle(b)).toThrow('incomplete_article');
 });
 it('does not treat short text or raw front matter as a full story',()=>{
  const b=bundle();b.items[0].markdown='Short outline';expect(()=>editorialBundle(b)).toThrow('incomplete_article');
  expect(articleParagraphs('---\nauthor: Private\n---\n# Title\n\n## Section\n\nBody')).toEqual(['## Section','Body']);
 });
 it('requires real verification records, nonfuture timestamps and all attestations',()=>{
  const good={sources:[{url:'https://example.test/evidence',note:'Verified fictional fixture source',checked_at:'2026-10-19T00:00:00Z'}],facts_checked:true,rights_checked:true,originality_checked:true,safeguarding_checked:true,disclosure:'Analysis, not event reporting.'};
  vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-19T12:00Z'));expect(editorialReview(good)).toEqual(good);
  expect(()=>editorialReview({...good,facts_checked:false})).toThrow();expect(()=>editorialReview({...good,sources:[]})).toThrow();expect(()=>editorialReview({...good,sources:[{...good.sources[0],checked_at:'2030-01-01'}]})).toThrow();expect(()=>editorialReview({...good,sources:[{...good.sources[0],url:'javascript:alert(1)'}]})).toThrow();
 });
 it('requires two private WebP assets, permissions and illustration disclosure',()=>{
  const assets={hero:'/media/admin-stories/'+'a'.repeat(64)+'/hero.webp',og:'/media/admin-stories/'+'b'.repeat(64)+'/og.webp',alt:'An event planning desk',caption:'Editorial illustration: planning desk',rights:'Original commissioned illustration',provenance:'Fictional test',illustration:true};
  expect(editorialAsset(assets)).toEqual(assets);expect(()=>editorialAsset({...assets,og:assets.hero})).toThrow();expect(()=>editorialAsset({...assets,hero:'https://example.test/image.webp'})).toThrow();expect(()=>editorialAsset({...assets,caption:'Live event photo'})).toThrow();
 });
 it('renders source links and emphasis without executing raw HTML',()=>{
  const html=renderToStaticMarkup(createElement(ArticleText,{paragraph:'**Evidence** [Official source](https://example.test/source) <script>alert(1)</script> [bad](javascript:alert(1))'}));
  expect(html).toContain('<strong>Evidence</strong>');expect(html).toContain('href="https://example.test/source"');expect(html).not.toContain('<script>');expect(html).not.toContain('href="javascript:');
 });
});
