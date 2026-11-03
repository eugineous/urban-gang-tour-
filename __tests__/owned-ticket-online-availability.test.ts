import {beforeEach,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const state=vi.hoisted(()=>({q:vi.fn(),schema:vi.fn(),status:'published'}));
vi.mock('@/lib/server/db',()=>({q:state.q,qSchema:state.schema,hasDb:()=>true,db:()=>{throw Error('Public availability must not open a transaction')}}));
vi.mock('next/navigation',()=>({usePathname:()=>'/events/owned-fixture',notFound:()=>{throw Error('not_found')},permanentRedirect:()=>{throw Error('unexpected_redirect')}}));
import {resolveEventTruth} from '@/lib/server/event-truth';
import {readPublicEvents} from '@/lib/server/public-events';
import {invalidate} from '@/lib/server/microcache';
import {CAPACITY_COUNTS_SQL} from '@/lib/server/ticket-inventory';
import {EventPosterCard} from '@/ui/components/EventPosterCard';
import {ownedEventPresentation,ownedEventSignature} from '@/ui/lib/owned-event-presentation';
import {eventsFromDb} from '@/app/_lib/jsonld';
import EventPage from '@/app/events/[slug]/page';

const now=Date.parse('2099-11-01T12:00:00+03:00');
const row={id:'owned-fixture',slug:'owned-fixture',kind:'ticketed',name:'Owned fixture event',status:'published',event_date:'2099-11-06',event_time:'4:00 PM',venue:'Fixture venue',city:'Nairobi',description:'Published event details',image:'/uploads/owned-fixture.webp',tiers:[{name:'Standard',price:750,capacity:20,per_order_min:1,per_order_max:5}],sales_start_at:null,sales_end_at:null,previous_start_at:null};
const event={id:row.id,slug:row.slug,kind:row.kind,name:row.name,status:row.status,eventDate:row.event_date,tiers:[{name:'Standard',price:750,sellable:true}],sellable:true};
beforeEach(()=>{
 invalidate('site-events:all');state.status='published';state.schema.mockReset();
 state.q.mockReset().mockImplementation(async(sql:string)=>sql===CAPACITY_COUNTS_SQL?[{sold:'2',reserved:'3'}]:sql.includes('FROM tour_events')?[{...row,status:state.status}]:[]);
});

it('keeps real ticket inventory and prices distinct from the closed online-payment gate',async()=>{
 expect(await resolveEventTruth(row.slug)).toMatchObject({isSellable:true,isSoldOut:false,totalRemaining:15,onlineCheckoutAvailable:false,tiers:[{price:750,remaining:15,sellable:true}]});
 expect((await readPublicEvents())[0]).toMatchObject({sellable:true,onlineCheckoutAvailable:false,tiers:[{price:750,remaining:15,sellable:true}]});
 expect(state.schema).not.toHaveBeenCalled();expect(state.q.mock.calls.every(([sql])=>sql.startsWith('SELECT'))).toBe(true);
});

it.each([undefined,false])('does not advertise a ticket purchase when online availability is %s despite remaining inventory',onlineCheckoutAvailable=>{
 const source={...event,...(onlineCheckoutAvailable===undefined?{}:{onlineCheckoutAvailable})};
 expect(ownedEventPresentation(source,now)).toMatchObject({sellable:true,onlineCheckoutAvailable:false,label:'Online ticket payments unavailable',action:'View event details'});
 const html=renderToStaticMarkup(createElement(EventPosterCard,{event:source,now}));
 expect(html).toContain('Online ticket payments unavailable');expect(html).toContain('View event details');expect(html).toContain('750');
 expect(html).not.toContain('Tickets on sale');expect(html).not.toContain('View tickets');expect(html).not.toContain('Sold out');
});

it('keeps the published event discoverable without a purchase CTA or offer when ticket payments are unavailable',async()=>{
 const graph=await eventsFromDb() as {'@graph':Record<string,unknown>[]};
 expect(graph['@graph'][0]).toMatchObject({name:row.name,startDate:'2099-11-06T16:00:00+03:00'});expect(graph['@graph'][0].offers).toBeUndefined();
 const html=renderToStaticMarkup(await EventPage({params:Promise.resolve({slug:row.slug})}));
 expect(html).toContain('750');expect(html).toContain('Online ticket payments unavailable');expect(html).toContain('href="/contact-us"');
 expect(html).not.toContain('Get tickets');expect(html).not.toContain('schema.org/InStock');expect(html).not.toContain('schema.org/SoldOut');expect(html).not.toContain('/events?event=');
});

it('retains a real sold-out label without inventing that state from provider unavailability',async()=>{
 state.status='sold_out';const source=(await readPublicEvents())[0];
 expect(source.status).toBe('sold_out');expect(ownedEventPresentation(source,now)).toMatchObject({sellable:false,label:'Sold out'});
 expect(renderToStaticMarkup(createElement(EventPosterCard,{event:source,now}))).toContain('Sold out');
});

it('refreshes presentation when online availability changes while inventory stays the same',()=>{
 expect(ownedEventSignature([{...event,onlineCheckoutAvailable:false}])).not.toBe(ownedEventSignature([{...event,onlineCheckoutAvailable:true}]));
});
