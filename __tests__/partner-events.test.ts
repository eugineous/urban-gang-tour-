import {describe,expect,it} from 'vitest';
import {EMPTY_PARTNER,externalTicketUrl,parsePartnerDetails,partnerPublicationError,partnerTicketAction,partnerAdmission} from '@/lib/partner-events';
import {partnerEventSchema} from '@/lib/partner-event-schema';
import {PARTNER_EVENT_DRAFTS} from '@/lib/partner-event-drafts';
import {isEventSellable} from '@/lib/server/event-lifecycle';
import {ownedEventPresentation,publicOwnedEvents,ownedEventSignature} from '@/ui/lib/owned-event-presentation';
import {nextTourEvent,tourEventAction} from '@/ui/lib/home-tour';

const details={...EMPTY_PARTNER,organizer:'Actual organiser',client:'Contracting company',role:'Hosting',ticketUrl:'https://tickets.example/show',institutions:['Real institution']};
const event={id:'partner',slug:'partner-show',kind:'partner',name:'Partner show',eventDate:'2026-11-06',status:'published',sellable:true,tiers:[{price:100}],venue:'Real venue',image:'/media/admin-events/original.jpg',partnerDetails:details};
const now=Date.parse('2026-10-15T12:00:00Z');
const schemaRow={...event,event_date:event.eventDate,event_time:'4:00 PM',partner_details:details};

describe('partner event validation',()=>{
  it('roundtrips a strict public metadata object',()=>{expect(parsePartnerDetails(JSON.stringify(details))).toEqual(details)});
  it('rejects unknown fields, malformed data and excessive arrays',()=>{
    for(const invalid of [{...details,internalNotes:'private'},null,[],{...details,institutions:['']},{...details,posters:[{url:'/ok.jpg',caption:'',extra:true}]},{...details,posters:Array(9).fill({url:'/ok.jpg',caption:'Poster'})},{...details,admission:'paid'},{...details,newsSlug:'../admin'}])expect(parsePartnerDetails(invalid)).toBeNull();
  });
  it.each(['javascript:alert(1)','http://tickets.example','https://user:password@tickets.example/','https://127.0.0.1/','https://0x7f000001/','https://10.1.1.1/','https://172.17.1.1/','https://192.168.1.1/','https://localhost/','https://a.localhost/','https://a.internal/','https://[::1]/','https://urbangangtour.co.ke/events?event=x','https://www.urbangangtour.co.ke/','https://review.chatgpt.site/','https://tickets.example:8443/'])('rejects unsafe or local seller %s',url=>expect(externalTicketUrl(url)).toBeNull());
  it('allows the actual poster seller without treating it as UGT inventory',()=>{expect(externalTicketUrl('https://airtravel.hustlesasa.shop/')).toBe('https://airtravel.hustlesasa.shop/')});
  it('also rejects local-checkout links using a trailing DNS dot',()=>{expect(externalTicketUrl('https://urbangangtour.co.ke./events')).toBeNull()});
  it('allows honest incomplete announcements without activating ticket sales',()=>{
    expect(partnerPublicationError(EMPTY_PARTNER,{status:'draft'})).toBeNull();
    expect(partnerPublicationError(EMPTY_PARTNER,{status:'published'})).toBeNull();
    expect(partnerPublicationError(details,{status:'published',image:event.image,eventDate:event.eventDate,venue:event.venue})).toBeNull();
    expect(partnerPublicationError({...details,ticketUrl:''},{status:'published',image:event.image,eventDate:event.eventDate,venue:event.venue})).toBeNull();
    expect(partnerPublicationError({...details,ticketUrl:''},{status:'completed',image:event.image,eventDate:'2026-09-18',venue:event.venue})).toBeNull();
    expect(partnerPublicationError({...details,admission:'free',ticketUrl:''},{status:'published',image:event.image,eventDate:event.eventDate,venue:event.venue})).toBeNull();
  });
});
describe('partner event presentation and SEO',()=>{
  it('cannot take UGT payment even with a forged sellable flag and tiers',()=>{
    expect(isEventSellable(event)).toBe(false);
    expect(ownedEventPresentation(event,now)).toMatchObject({publicEvent:true,sellable:false,action:'View event details',label:'Tickets via organiser',href:'/events/partner-show'});
    expect(tourEventAction(event).label).toBe('View event details');
  });
  it('shows partner dates in discovery and home but keeps drafts out',()=>{
    expect(publicOwnedEvents([event,{...event,status:'draft'},{...event,partnerDetails:null}],now)).toHaveLength(2);
    expect(nextTourEvent([event],now)).toEqual(event);
    expect(ownedEventSignature([event])).not.toEqual(ownedEventSignature([{...event,partnerDetails:{...details,ticketUrl:'https://different.example/'}}]));
  });
  it('only shows a seller link on active future dates',()=>{
    expect(partnerTicketAction(details,'published','2026-11-06',now)).toBe(details.ticketUrl);
    for(const status of ['draft','cancelled','completed','sold_out','postponed','sales_paused','archived'])expect(partnerTicketAction(details,status,'2026-11-06',now)).toBeNull();
    expect(partnerTicketAction(details,'published','2026-09-18',now)).toBeNull();
    expect(partnerTicketAction({...details,admission:'free'},'published','2026-11-06',now)).toBeNull();
  });
  it('does not invent external ticket stock or UGT organiser status',()=>{
    expect(partnerEventSchema(schemaRow)).toMatchObject({'@type':'Event',startDate:'2026-11-06T16:00:00+03:00',organizer:{name:'Actual organiser'}});
    expect(partnerEventSchema(schemaRow)).not.toHaveProperty('offers');
    expect(partnerEventSchema({...schemaRow,partner_details:{...details,admission:'free'},event_time:''})).toMatchObject({startDate:'2026-11-06',isAccessibleForFree:true});
  });
  it('uses portfolio work, not a live ticket offer, for completed collaborations',()=>{
    const schema=partnerEventSchema({...schemaRow,status:'completed'});
    expect(schema).toMatchObject({'@type':'CreativeWork',creditText:'Hosting',about:[{name:'Real institution'}]});
    expect(schema).not.toHaveProperty('offers');expect(schema).not.toHaveProperty('startDate');
    expect(partnerEventSchema({...schemaRow,status:'draft'})).toBeNull();
  });
  it('keeps the five supplied briefs distinct and uncertain facts unconfirmed',()=>{
    expect(new Set(PARTNER_EVENT_DRAFTS.map(d=>d.key)).size).toBe(5);
    for(const draft of PARTNER_EVENT_DRAFTS){expect(parsePartnerDetails(draft.partnerDetails)).not.toBeNull();expect(draft).not.toHaveProperty('published');expect(draft).not.toHaveProperty('image')}
    expect(PARTNER_EVENT_DRAFTS.find(d=>d.key==='freshers-bash-color-blast')?.eventDate).toBe('');
    expect(PARTNER_EVENT_DRAFTS.find(d=>d.key==='moi-mr-miss-culture-gala-2026')?.partnerDetails.client).toBe('');
    expect(PARTNER_EVENT_DRAFTS.find(d=>d.key==='unifest-2026-university-of-nairobi')?.partnerDetails.admission).toBe('free');
    expect(partnerAdmission({...details,admission:'unconfirmed'})).toBe('Entry details to be confirmed');
  });
});
