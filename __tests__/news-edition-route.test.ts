import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({enabled:false}));
vi.mock('@/lib/server/urban-news-mode',()=>({urbanNewsEnabled:()=>state.enabled}));
vi.mock('@/app/_lib/blog',()=>({getBlogPostSummaries:async()=>[]}));
vi.mock('@/lib/server/request-time',()=>({requestTime:()=>1}));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw Error('redirect:'+path)}}));
import Page from '@/app/for-you/page';
it('honours the news cutover before exposing an edition',async()=>{state.enabled=false;await expect(Page()).rejects.toThrow('redirect:/blog')});
