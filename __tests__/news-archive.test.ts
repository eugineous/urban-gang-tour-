import {beforeEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {BlogPost} from '@/app/_lib/blog';

const state=vi.hoisted(()=>({posts:[] as BlogPost[],unavailable:false}));
vi.mock('@/app/_lib/blog',()=>({getBlogPosts:async()=>{if(state.unavailable)throw Error('feed_unavailable');return state.posts;}}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>false,q:async()=>[]}));
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/blog',notFound:()=>{throw Error('NEXT_NOT_FOUND')}}));
import BlogIndex,{generateMetadata} from '@/app/blog/page';

const story=(i:number):BlogPost=>({slug:`story-${String(i).padStart(2,'0')}`,headline:`Owned headline ${i}`,datePublished:'2026-11-16',dateModified:'2026-11-16',section:i%2?'Schools':'Updates',image:'/owned.jpg',description:`Owned introduction ${i}`,body:['Unchanged manuscript']});
const props=(searchParams:Record<string,string|string[]>={})=>({searchParams:Promise.resolve(searchParams)});
async function render(query:Record<string,string|string[]>={}){return renderToStaticMarkup(await BlogIndex(props(query)));}
function ids(html:string){return [...html.matchAll(/data-news-story="([^"]+)"/g)].map(match=>match[1]);}
function collection(html:string){return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map(match=>JSON.parse(match[1])).find(value=>value['@type']==='CollectionPage');}
beforeEach(()=>{state.unavailable=false;state.posts=Array.from({length:29},(_,i)=>story(i));});

describe('crawlable news archive',()=>{
 it('renders first page with twelve real story links and a crawlable next anchor',async()=>{
  const html=await render();expect(ids(html)).toHaveLength(12);expect(html).toMatch(/<a[^>]+href="\/blog\?page=2"[^>]*rel="next"|<a[^>]+rel="next"[^>]*href="\/blog\?page=2"/);expect(html).not.toContain('rel="prev"');
  expect(collection(html).mainEntity.itemListElement.map((x:{url:string})=>x.url.split('/').pop())).toEqual(ids(html));
 });
 it('renders distinct middle and final windows with previous and next URLs',async()=>{
  const first=await render(),middle=await render({page:'2'}),last=await render({page:'3'});
  expect(ids(middle)).toHaveLength(12);expect(ids(last)).toHaveLength(5);expect(new Set([...ids(first),...ids(middle),...ids(last)]).size).toBe(29);
  expect(middle).toContain('href="/blog" rel="prev"');expect(middle).toContain('href="/blog?page=3" rel="next"');expect(last).toContain('href="/blog?page=2" rel="prev"');expect(last).not.toContain('rel="next"');
  const metadata=await generateMetadata(props({page:'2'}));expect(metadata.alternates?.canonical).toBe('https://urbangangtour.co.ke/blog?page=2');expect(metadata.openGraph).toMatchObject({url:'https://urbangangtour.co.ke/blog?page=2'});
  expect(collection(middle).url).toBe('https://urbangangtour.co.ke/blog?page=2');
 });
 it('uses initial category and search filters on the server and marks filtered URLs noindex',async()=>{
  const html=await render({category:'schools',q:'Owned'});expect(ids(html)).toHaveLength(12);expect(ids(html).every(id=>Number(id.slice(-2))%2===1)).toBe(true);expect(html).toContain('href="/blog?q=Owned&amp;category=schools&amp;page=2" rel="next"');
  expect(html).toContain('value="Owned"');const metadata=await generateMetadata(props({category:'schools',q:'Owned'}));expect(metadata.robots).toEqual({index:false,follow:true});
  expect(html).toContain('action="/blog" method="get"');expect(html).toContain('name="q"');expect(html).toContain('name="category" value="schools"');
  expect(html).toContain('href="/blog?q=Owned&amp;category=events"');
  expect(metadata.alternates?.canonical).toBe('https://urbangangtour.co.ke/blog?q=Owned&category=schools');
 });
 it('normalizes malformed and duplicate query values without producing duplicate story URLs',async()=>{
  state.posts.push(story(0));const html=await render({page:['2','3'],q:['Owned','private'],category:'unknown'});expect(ids(html)).toEqual(ids(await render()));
  expect((await generateMetadata(props({page:'-1',category:'unknown'}))).alternates?.canonical).toBe('https://urbangangtour.co.ke/blog');
  const windows=await Promise.all([render(),render({page:'2'}),render({page:'3'})]);expect(windows.flatMap(ids)).toHaveLength(29);
 });
 it('has a truthful no-result first page and rejects current out-of-range pages',async()=>{
  const html=await render({q:'absent phrase'});expect(ids(html)).toEqual([]);expect(html).toContain('No matching stories');expect(html).not.toContain('rel="next"');
  await expect(render({page:'4'})).rejects.toThrow('NEXT_NOT_FOUND');await expect(render({q:'absent phrase',page:'2'})).rejects.toThrow('NEXT_NOT_FOUND');
 });
 it('shows feed unavailability instead of inventing a page-not-found or stale records',async()=>{
  state.unavailable=true;const html=await render({page:'999'});expect(html).toContain('Stories are temporarily unavailable.');expect(ids(html)).toEqual([]);expect(html).not.toContain('rel="next"');expect(collection(html).mainEntity.itemListElement).toEqual([]);
 });
});
