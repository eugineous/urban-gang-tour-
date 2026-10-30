import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({configured:true,q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>state.configured,q:state.q}));
vi.mock('@/ui/components/HostedSite',()=>({default:()=>null}));
vi.mock('@/app/_components/LiveCommerce',()=>({LiveCommerce:()=>null}));
vi.mock('@/app/_components/BookingForm',()=>({BookingForm:()=>null}));
vi.mock('@/lib/server/public-events',()=>({readPublicEvents:async()=>[]}));
vi.mock('@/lib/server/public-products',()=>({readPublicProducts:async()=>[]}));
vi.mock('@/lib/server/website-content',()=>({readWebsiteContent:async()=>null}));

import * as blog from '@/app/_lib/blog';
import {RenderedPage} from '@/app/_components/RenderedPage';
import {GET} from '@/app/api/site-data/posts/route';
import {invalidate} from '@/lib/server/microcache';

const row=(slug='published-story',publication_time:string|null='2026-10-29T06:07:00+03:00')=>({
 slug,headline:'Original headline',section:'Analysis',image:'/owned.jpg',dek:'Original introduction',
 date:'2026-10-29',publication_time,image_alt:'Owned photograph',
 updated_at:'2026-10-28T00:00:00Z',body:['Original complete manuscript'],author:'Original newsroom',
 schema_type:'BlogPosting',public_asset:{alt:'Owned photograph',caption:'Editorial illustration',illustration:true,og:'/owned-og.jpg'},
 disclosure:'Original disclosure',
});
const summary={slug:'published-story',headline:'Original headline',section:'Analysis',image:'/owned.jpg',description:'Original introduction',datePublished:'2026-10-29T03:07:00.000Z',imageAlt:'Owned photograph'};
const query=()=>state.q.mock.calls[0][0] as string;
const request=()=>new Request('https://urbangangtour.co.ke/api/site-data/posts',{headers:{'cf-connecting-ip':'192.0.2.223',cookie:'ugt_did=public_story_summary_fixture'}});

beforeEach(()=>{
 invalidate('blog-published-posts');invalidate('blog-published-post-summaries');
 state.configured=true;state.q.mockReset().mockResolvedValue([row()]);
});
afterEach(()=>vi.restoreAllMocks());

describe('body-free public story reads',()=>{
 it('queries summaries with the existing publication gates and without selecting article bodies',async()=>{
  expect(await blog.getBlogPostSummaries()).toEqual([summary]);
  const sql=query(),projection=sql.slice(0,sql.indexOf('FROM posts'));
  expect(projection).not.toMatch(/\bbody\b/);
  expect(sql).toContain('WHERE published AND (');
  expect(sql).toContain("date <= (now() AT TIME ZONE 'Africa/Nairobi')::date");
  expect(sql).toContain("editorial_status IN ('approved_for_auto_release','live')");
  expect(sql).toContain("(to_jsonb(posts)->>'scheduled_at')::timestamptz <= now()");
  expect(sql).toContain("COALESCE(to_jsonb(posts)->'editorial_review'->>'approved_revision','') = COALESCE(to_jsonb(posts)->>'editorial_revision','!')");
  expect(sql).toContain("COALESCE(to_jsonb(posts)->'editorial_review'->>'approved_hash','') = COALESCE(to_jsonb(posts)->>'editorial_import_hash','!')");
  expect(sql).not.toMatch(/\bLIMIT\b/i);
 });

 it('keeps legacy dates, managed instants and image defaults without introducing detail fields',async()=>{
  state.q.mockResolvedValue([{...row('legacy',null),date:new Date('2026-10-28T00:00:00Z'),image:'',section:'',dek:'',image_alt:null,public_asset:null}]);
  expect(await blog.getBlogPostSummaries()).toEqual([{slug:'legacy',headline:'Original headline',section:'News',image:'/assets/poster.png',description:'',datePublished:'2026-10-28',imageAlt:undefined}]);
 });

 it('selects the same latest three homepage cards using exact instants and deterministic slug ties',async()=>{
  state.q.mockResolvedValue([
   row('legacy',null),row('b-tied','2026-10-29T20:00:00+03:00'),row('old','2026-10-28T23:59:59Z'),
   row('newest','2026-10-29T18:01:00Z'),row('a-tied','2026-10-29T17:00:00Z'),
  ]);
  const page=await RenderedPage({pathName:'/'});
  expect(page.props.posts.map((post:{id:string})=>post.id)).toEqual(['newest','a-tied','b-tied']);
  expect(page.props.posts[0]).toEqual({id:'newest',headline:'Original headline',date:'2026-10-29T18:01:00.000Z',section:'Analysis',img:'/owned.jpg',dek:'Original introduction'});
  expect(query().slice(0,query().indexOf('FROM posts'))).not.toMatch(/\bbody\b/);
 });

 it.each(['/blog','/author/lucy-ogunde'])('keeps every public card on %s without fetching manuscripts',async pathName=>{
  state.q.mockResolvedValue([row('older','2026-10-28T03:00:00Z'),row('newer')]);
  const page=await RenderedPage({pathName});
  expect(page.props.posts.map((post:{id:string})=>post.id)).toEqual(['newer','older']);
  expect(query().slice(0,query().indexOf('FROM posts'))).not.toMatch(/\bbody\b/);
 });

 it('serves the same public feed fields and no-store headers using the body-free query',async()=>{
  const response=await GET(request());
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ok:true,posts:[{id:'published-story',headline:'Original headline',date:'2026-10-29T03:07:00.000Z',section:'Analysis',img:'/owned.jpg',dek:'Original introduction',imageAlt:'Owned photograph'}]});
  expect(query().slice(0,query().indexOf('FROM posts'))).not.toMatch(/\bbody\b/);
 });

 it('keeps full article bodies, bylines, disclosures and modification times for detail consumers',async()=>{
  await blog.getBlogPostSummaries();
  expect(await blog.getBlogPosts()).toEqual([{...summary,dateModified:'2026-10-29T03:07:00.000Z',body:['Original complete manuscript'],author:'Original newsroom',schemaType:'BlogPosting',imageCaption:'Editorial illustration',imageIllustration:true,ogImage:'/owned-og.jpg',disclosure:'Original disclosure'}]);
  expect(state.q.mock.calls[1][0].slice(0,state.q.mock.calls[1][0].indexOf('FROM posts'))).toMatch(/\bbody\b/);
 });

 it('never serves an expired successful summary when the publication check fails',async()=>{
  vi.spyOn(Date,'now').mockReturnValue(1_000);
  expect(await blog.getBlogPostSummaries()).toEqual([summary]);
  vi.spyOn(Date,'now').mockReturnValue(2_001);
  state.q.mockRejectedValue(new Error('private database detail'));
  const response=await GET(request());
  expect(response.status).toBe(503);expect(await response.json()).toEqual({ok:false,error:'stories_temporarily_unavailable'});
  expect(await blog.getBlogPostSummaries()).toEqual([]);
  await expect(blog.getBlogPostSummaries(true)).rejects.toThrow('private database detail');
 });

 it('keeps an absent database an empty public feed without issuing a query',async()=>{
  state.configured=false;
  expect(await blog.getBlogPostSummaries()).toEqual([]);
  const response=await GET(request());expect(await response.json()).toEqual({ok:true,posts:[]});
  expect(state.q).not.toHaveBeenCalled();
 });
});
