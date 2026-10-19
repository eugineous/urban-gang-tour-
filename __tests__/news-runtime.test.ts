import {describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
vi.mock('@/app/_lib/jsonld',()=>({NEWS_PUBLISHER_ID:'ugt'}));
import {q} from '@/lib/server/db';
import {getBlogPosts,articleJsonLd} from '@/app/_lib/blog';
describe('published newsroom reads',()=>{
 it('coalesces reads and retains articles through a transient database failure',async()=>{
  const clock=vi.spyOn(Date,'now').mockReturnValue(1_000_000);
  try{
   vi.mocked(q).mockResolvedValueOnce([{slug:'published-story',headline:'Published story',date:'2026-10-08',updated_at:'2026-10-19T10:00:00Z',section:'News',image:'/assets/photo.jpg',dek:'A published recap',body:['A real article.']}]);
   const [first,concurrent]=await Promise.all([getBlogPosts(),getBlogPosts()]);
   expect(first[0]).toMatchObject({slug:'published-story',headline:'Published story',datePublished:'2026-10-08',body:['A real article.']});
   expect(concurrent).toEqual(first);expect(q).toHaveBeenCalledTimes(1);
   expect(first[0].dateModified).toBe('2026-10-19T10:00:00.000Z');
   expect(vi.mocked(q).mock.calls[0][0]).toContain("(now() AT TIME ZONE 'Africa/Nairobi')::date");
   expect(vi.mocked(q).mock.calls[0][0]).toContain('ORDER BY date DESC, slug ASC');
   expect(articleJsonLd(first[0]).author).toEqual({'@type':'Organization',name:'Urban Gang Tour Newsroom',url:'https://urbangangtour.co.ke/blog'});
   clock.mockReturnValue(1_061_000);vi.mocked(q).mockRejectedValueOnce(new Error('temporary database failure'));
   expect(await getBlogPosts()).toEqual(first);
  }finally{clock.mockRestore();}
 });
});
