import {beforeEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const state=vi.hoisted(()=>({q:vi.fn(),truth:vi.fn(),story:null as null|{slug:string}}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
vi.mock('@/lib/server/catalog',()=>({formatEventDate:(d:string)=>d}));
vi.mock('@/lib/server/event-truth',()=>({resolveEventTruth:state.truth}));
vi.mock('@/app/_lib/blog',()=>({getBlogPost:async()=>state.story}));
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('404')},permanentRedirect:(url:string)=>{throw new Error('redirect '+url)}}));
import EventPage,{generateMetadata} from '@/app/events/[slug]/page';
import PartnerEventDetails from '@/app/_components/PartnerEventDetails';
import {EMPTY_PARTNER} from '@/lib/partner-events';

const partner={...EMPTY_PARTNER,organizer:'Actual institution & promoter',client:'Sherehe Vibes Africa',role:'Eugine Micah — hype. Lucy Ogunde — interviews.',admission:'external' as const,ticketUrl:'https://official.example/event',institutions:['University of Nairobi'],posters:[{url:'/media/admin-events/vendor.jpg',caption:'Original vendor call'}],newsSlug:'real-story'};
const row={id:'partner',slug:'partner-show',name:'Partner show',kind:'partner',status:'published',image:'/media/admin-events/original.jpg',description:'Campus event',event_date:'2099-11-06',event_time:'4:00 PM',venue:'Graduation Square',city:'Nairobi',tiers:[{price:500}],partner_details:partner};
const params={params:Promise.resolve({slug:'partner-show'})};
beforeEach(()=>{vi.clearAllMocks();state.q.mockResolvedValue([row]);state.story=null});
it('renders the contracted-event branch without asking UGT inventory for prices',async()=>{
 const element=await EventPage(params);expect(element.type).toBe(PartnerEventDetails);expect(state.truth).not.toHaveBeenCalled();
 const html=renderToStaticMarkup(await PartnerEventDetails({event:row}));
 expect(html).toContain('https://official.example/event');expect(html).toContain('noopener noreferrer');expect(html).toContain('Actual institution &amp; promoter');expect(html).toContain('Sherehe Vibes Africa');expect(html).toContain('Original vendor call');expect(html).toContain('/media/admin-events/original.jpg');
 expect(html).not.toContain('Get tickets');expect(html).not.toContain('/events?event=');expect(html).not.toContain('/blog/real-story');expect(html).not.toContain('InStock');
});
it('only links a related news story once it actually exists publicly',async()=>{
 state.story={slug:'real-story'};const html=renderToStaticMarkup(await PartnerEventDetails({event:row}));expect(html).toContain('/blog/real-story');
});
it('keeps completed partner work indexable, with unique canonical and no ticket CTA',async()=>{
 state.q.mockResolvedValue([{...row,status:'completed',event_date:'2026-09-18'}]);const meta=await generateMetadata(params);expect(meta.alternates?.canonical).toBe('https://urbangangtour.co.ke/events/partner-show');expect(meta.robots).toBeUndefined();
 const html=renderToStaticMarkup(await PartnerEventDetails({event:{...row,status:'completed',event_date:'2026-09-18'}}));expect(html).toContain('This event has ended. Ticket sales are closed.');expect(html).not.toContain('https://official.example/event');expect(html).toContain('CreativeWork');
});
it('keeps free entry distinct from a zero-priced UGT ticket',async()=>{
 const html=renderToStaticMarkup(await PartnerEventDetails({event:{...row,partner_details:{...partner,admission:'free',ticketUrl:''}}}));expect(html).toContain('Free admission');expect(html).toContain('isAccessibleForFree');expect(html).not.toContain('Buy from the official seller');expect(html).not.toContain('/events?event=');
});
it('does not render invalid partner metadata as an owned ticketed event',async()=>{
 state.q.mockResolvedValue([{...row,partner_details:{internalNotes:'not public'}}]);await expect(EventPage(params)).rejects.toThrow('404');expect(state.truth).not.toHaveBeenCalled();
});
