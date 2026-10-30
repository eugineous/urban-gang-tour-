import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/server/db',()=>({hasDb:()=>true}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> '192.0.2.19',deviceId:()=>null,PUBLIC_READ_NETWORK_LIMIT:50000}));
vi.mock('@/app/_lib/blog',()=>({getBlogPostSummaries:vi.fn()}));

import {getBlogPostSummaries} from '@/app/_lib/blog';
import {GET} from '@/app/api/site-data/posts/route';

describe('public newsroom refresh',()=>{
  beforeEach(()=>vi.mocked(getBlogPostSummaries).mockReset());
  it('retains exact publication time so refresh cannot change newest-first ordering',async()=>{
    vi.mocked(getBlogPostSummaries).mockResolvedValueOnce([{
      slug:'published-story', headline:'Published headline', datePublished:'2026-10-23T22:30:00.000Z',
      section:'Updates',image:'/public-story.jpg',
      description:'Published introduction',imageAlt:'Owned photograph',
    }]);
    const response=await GET(new Request('https://urbangangtour.co.ke/api/site-data/posts'));
    const data=await response.json();
    expect(response.status).toBe(200);
    expect(data.posts[0]).toMatchObject({id:'published-story',date:'2026-10-23T22:30:00.000Z',imageAlt:'Owned photograph'});
    expect(data.posts[0]).not.toHaveProperty('body');
  });
});
