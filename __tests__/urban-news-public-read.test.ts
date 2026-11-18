import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
vi.mock('@/app/_lib/jsonld',()=>({NEWS_PUBLISHER_ID:'fixture-publisher'}));
import {q} from '@/lib/server/db';
import {getBlogPosts,getBlogPostSummaries,articleJsonLd} from '@/app/_lib/blog';
import {invalidate} from '@/lib/server/microcache';
const legacy={slug:'preserved-legacy',headline:'Legacy fixture',date:'2020-01-01',body:['Preserved fixture manuscript']};
const news={slug:'approved-fixture',headline:'Approved fixture',date:'2026-11-17',publication_time:'2026-11-17T10:00:00Z',modification_time:'2026-11-17T11:00:00Z',body:['Original approved fixture story.'],section:'music',image:'/assets/pwa-512.png',dek:'Fixture reporting only',author:'Urban News',schema_type:'NewsArticle',public_revision:'2',public_country:'US',public_verification:'attributed',public_correction:'Corrected fixture title.',public_sources:[{id:'source',url:'https://example.test/story',title:'Original announcement',publisher:'Fixture source',publishedAt:null}],private_excerpt:'Not selected or serialized'};
beforeEach(()=>{vi.mocked(q).mockReset();vi.stubEnv('URBAN_NEWS_ENABLED','false');for(const key of ['blog-published-posts','blog-published-post-summaries','blog-published-posts:urban-news','blog-published-post-summaries:urban-news'])invalidate(key)});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks()});
it('selects runtime mode on each read and never shares a cached legacy approval with the new feed',async()=>{
 vi.mocked(q).mockImplementation(async sql=>sql.includes("'approvedRevision'")?[news]:[legacy]);
 expect((await getBlogPosts()).map(post=>post.slug)).toEqual(['preserved-legacy']);
 vi.stubEnv('URBAN_NEWS_ENABLED','true');const [first,concurrent]=await Promise.all([getBlogPosts(),getBlogPosts()]);
 expect(first.map(post=>post.slug)).toEqual(['approved-fixture']);expect(concurrent).toEqual(first);expect(q).toHaveBeenCalledTimes(2);
 expect(first[0]).toMatchObject({newsCountry:'US',newsVerification:'attributed',newsCorrection:'Corrected fixture title.',newsRevision:2,datePublished:'2026-11-17T10:00:00.000Z',dateModified:'2026-11-17T11:00:00.000Z'});
 expect(JSON.stringify(first)).not.toContain('private_excerpt');
 vi.stubEnv('URBAN_NEWS_ENABLED','false');expect((await getBlogPosts()).map(post=>post.slug)).toEqual(['preserved-legacy']);
});
it('keeps card queries body-free while forwarding only approved geography and verification',async()=>{
 vi.stubEnv('URBAN_NEWS_ENABLED','true');vi.mocked(q).mockResolvedValue([news]);
 const summaries=await getBlogPostSummaries();expect(summaries[0]).toMatchObject({newsCountry:'US',newsVerification:'attributed'});
 expect(summaries[0]).not.toHaveProperty('newsSources');expect(summaries[0]).not.toHaveProperty('body');
 const sql=vi.mocked(q).mock.calls[0][0],projection=sql.slice(0,sql.indexOf('FROM posts'));
 expect(projection).not.toMatch(/\bbody\b|sources|excerpt|claims|evidence/);
});
it('emits truthful source citations and excludes the owned placeholder from documentary image metadata',async()=>{
 vi.stubEnv('URBAN_NEWS_ENABLED','true');vi.mocked(q).mockResolvedValue([news]);const post=(await getBlogPosts())[0];const schema=articleJsonLd(post);
 expect(schema['@type']).toBe('NewsArticle');expect(schema).not.toHaveProperty('image');
 expect(schema.citation?.[0]).toMatchObject({url:'https://example.test/story',name:'Original announcement'});expect(schema.citation?.[0]).not.toHaveProperty('datePublished');
});
it('fails closed after a news read expires instead of serving stale approval during an outage',async()=>{
 const clock=vi.spyOn(Date,'now').mockReturnValue(1000000);vi.stubEnv('URBAN_NEWS_ENABLED','true');vi.mocked(q).mockResolvedValueOnce([news]);
 expect(await getBlogPosts()).toHaveLength(1);clock.mockReturnValue(1001001);vi.mocked(q).mockRejectedValueOnce(Error('Private SQL details'));
 expect(await getBlogPosts()).toEqual([]);
});
