import {expect,it,vi,afterEach} from 'vitest';
const state=vi.hoisted(()=>({posts:[] as Record<string,unknown>[]}));
vi.mock('@/app/_lib/blog',()=>({getBlogPosts:async()=>state.posts}));
import {GET as feed} from '@/app/feed.xml/route';
import {GET as news} from '@/app/news-sitemap.xml/route';
afterEach(()=>vi.restoreAllMocks());
const post=(slug:string,datePublished:string)=>({slug,headline:'School & campus',datePublished,dateModified:datePublished,section:'Analysis',image:'https://example.test/owned.webp',description:'A verified fixture',body:[]});
it('preserves precise instants and uses a documented Nairobi fallback for legacy RSS dates',async()=>{
 state.posts=[post('exact','2026-10-20T06:07:00+03:00'),post('legacy','2026-10-20')];
 const response=await feed(),xml=await response.text();
 expect(xml).toContain('<pubDate>Tue, 20 Oct 2026 03:07:00 GMT</pubDate>');
 expect(xml).toContain('<pubDate>Mon, 19 Oct 2026 21:00:00 GMT</pubDate>');
 expect(xml).toContain('url="https://example.test/owned.webp"');expect(xml).not.toContain('https://urbangangtour.co.kehttps:');expect(xml).toContain('School &amp; campus');
});
it('uses actual instants for the inclusive 48h boundary and excludes future entries',async()=>{
 vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-22T03:07:00Z'));
 state.posts=[post('exact-boundary','2026-10-20T06:07:00+03:00'),post('too-old','2026-10-20T06:06:59+03:00'),post('legacy-old','2026-10-20'),post('future','2026-10-22T03:08:00Z')];
 const xml=await (await news()).text();expect(xml).toContain('/blog/exact-boundary');
 for(const slug of ['too-old','legacy-old','future'])expect(xml).not.toContain('/blog/'+slug);
});
