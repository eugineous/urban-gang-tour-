import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {BlogPost} from '@/app/_lib/blog';
const state=vi.hoisted(()=>({posts:[] as BlogPost[],unavailable:false}));
vi.mock('@/app/_lib/blog',()=>({getBlogPosts:async()=>{if(state.unavailable)throw Error('unavailable');return state.posts;}}));
vi.mock('@/lib/server/urban-news-briefs',()=>({getBriefArchive:async()=>[],getKenyaXLinks:async()=>[],briefPhoto:()=>null,publisherBriefHref:()=>''}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>false,q:async()=>[]}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('NEXT_NOT_FOUND')},useRouter:()=>({refresh:vi.fn()}),usePathname:()=>'/blog',useSearchParams:()=>new URLSearchParams()}));
import BlogIndex,{generateMetadata} from '@/app/blog/page';
import {GET as newsSitemap} from '@/app/news-sitemap.xml/route';
const story=(i:number):BlogPost=>({slug:'fictional-'+i,headline:'Fictional studio report '+i,description:'Isolated fiction fixture',body:[],datePublished:new Date().toISOString(),dateModified:new Date().toISOString(),section:'music',image:'',newsCountry:i<25?'KE':'Global',newsVerification:'attributed',schemaType:'NewsArticle'});
beforeEach(()=>{vi.stubEnv('URBAN_NEWS_ENABLED','true');state.posts=Array.from({length:30},(_,i)=>story(i));state.unavailable=false});afterEach(()=>vi.unstubAllEnvs());
it('server renders an exact new-lane filtered second window and matching canonical/schema links',async()=>{
 const props={searchParams:Promise.resolve({q:'studio',category:'music',country:'KE',page:'2'})};const html=renderToStaticMarkup(await BlogIndex(props));expect([...html.matchAll(/data-news-story="/g)]).toHaveLength(12);expect(html).toContain('rel="next" href="/blog?q=studio&amp;category=music&amp;country=KE&amp;page=3"');expect(html).not.toContain('Fictional studio report 29');const meta=await generateMetadata(props);expect(meta.alternates?.canonical).toBe('https://urbangangtour.co.ke/blog?q=studio&category=music&country=KE&page=2');expect(meta.robots).toEqual({index:false,follow:true});expect(meta.title).toBe('Urban News | Kenya entertainment and music');
});
it('fails closed for current out-of-range filters and shows outages without false404',async()=>{
 await expect(BlogIndex({searchParams:Promise.resolve({category:'screen',page:'2'})})).rejects.toThrow('NEXT_NOT_FOUND');state.unavailable=true;const html=renderToStaticMarkup(await BlogIndex({searchParams:Promise.resolve({page:'999'})}));expect(html).toContain('Stories are temporarily unavailable.');expect(html).not.toContain('data-news-story');
});
it('bounds the fresh NewsArticle sitemap to1000 and excludes old, future and BlogPosting entries',async()=>{
 state.posts=Array.from({length:1005},(_,i)=>story(i));state.posts.unshift({...story(9001),slug:'old',datePublished:new Date(Date.now()-49*3600000).toISOString()},{...story(9002),slug:'future',datePublished:new Date(Date.now()+3600000).toISOString()},{...story(9003),slug:'blog-post',schemaType:'BlogPosting'});const xml=await(await newsSitemap()).text();expect([...xml.matchAll(/<news:news>/g)]).toHaveLength(1000);for(const slug of ['old','future','blog-post'])expect(xml).not.toContain('/blog/'+slug+'<');
});
