import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {EventDiscovery,sortEventDirectory} from '@/ui/components/EventDiscovery';
import {EventPosterCard,eventCardPrice,eventDateBadge} from '@/ui/components/EventPosterCard';
import {EMPTY_PARTNER} from '@/lib/partner-events';

const now=Date.parse('2026-10-22T12:00:00+03:00');
const event={id:'event',kind:'ticketed',slug:'test-event',name:'A real campus event',status:'published',eventDate:'2026-11-06',image:'/uploads/event.jpg',venue:'Graduation Square',city:'Nairobi',priority:0,sellable:true,tiers:[{name:'Entry',price:750,sellable:true}]};

describe('Mookh-shaped directory preserves Urban Gang event truth',()=>{
  it('shows prices only for actually sellable tiers, not sold-out cheaper tiers',()=>{
    expect(eventCardPrice({...event,tiers:[{price:100,sellable:false},{price:750,sellable:true},{price:1000,sellable:true}]},now)).toBe('from KES 750.00');
    expect(eventCardPrice({...event,tiers:[{price:0,sellable:true}]},now)).toBe('Free tickets');
    expect(eventCardPrice({...event,tiers:[{price:500}]},now)).toBe('View ticket options');
    expect(eventCardPrice({...event,sellable:false},now)).toBe('Details published');
    expect(eventCardPrice(event,now,false)).toBe('Check latest availability');
  });
  it('does not advertise a price or active sales for past, paused or postponed events',()=>{
    expect(eventCardPrice({...event,status:'completed'},now)).toBe('Event completed');
    expect(eventCardPrice({...event,eventDate:'2026-09-01'},now)).toBe('Date passed');
    expect(eventCardPrice({...event,status:'sales_paused'},now)).toBe('Ticket sales paused');
    expect(eventCardPrice({...event,status:'postponed'},now)).toBe('Postponed');
  });
  it('keeps free, external and unknown partner admission distinct, without creating checkout links',()=>{
    for(const [admission,label] of [['free','Free admission'],['external','Tickets via organiser'],['invitation','By invitation'],['unconfirmed','Entry details to be confirmed']] as const){
      const partner={...event,kind:'partner',sellable:false,partnerDetails:{...EMPTY_PARTNER,admission}};
      expect(eventCardPrice(partner,now)).toBe(label);
      const html=renderToStaticMarkup(createElement(EventPosterCard,{event:partner,now}));
      expect(html).toContain('href="/events/test-event"');
      expect(html).not.toContain('/checkout');
    }
    expect(eventCardPrice({...event,kind:'partner',partnerDetails:null},now)).toBe('Entry details to be confirmed');
  });
  it('uses confirmed Nairobi dates and never puts the old date on postponed artwork',()=>{
    expect(eventDateBadge(event,now)).toEqual({dateTime:'2026-11-06',day:'6',month:'Nov',weekday:'Fri'});
    expect(eventDateBadge({...event,status:'postponed'},now)).toBeNull();
    expect(eventDateBadge({...event,eventDate:'2026-02-30'},now)).toBeNull();
    const html=renderToStaticMarkup(createElement(EventPosterCard,{event:{...event,status:'postponed'},now}));
    expect(html).not.toContain('datetime=');expect(html).toContain('Date<br/>to follow');
  });
  it('sorts upcoming chronologically, past newest first, and unconfirmed dates last',()=>{
    const rows=[{...event,id:'late',eventDate:'2026-12-01'},{...event,id:'early',eventDate:'2026-11-01'},{...event,id:'old',status:'completed',eventDate:'2026-07-01'},{...event,id:'recent',status:'completed',eventDate:'2026-09-01'},{...event,id:'unknown',status:'postponed'}];
    expect(sortEventDirectory(rows,now).map(row=>row.id)).toEqual(['early','late','unknown','recent','old']);
  });
  it('renders the original artwork with meaningful text, canonical links and a safe missing-artwork state',()=>{
    const html=renderToStaticMarkup(createElement(EventPosterCard,{event,now}));
    expect(html).toContain('src="/uploads/event.jpg"');expect(html).toContain('Event image: A real campus event');expect(html).toContain('href="/events/test-event"');
    const missing=renderToStaticMarkup(createElement(EventPosterCard,{event:{...event,image:'javascript:alert(1)'},now}));
    expect(missing).not.toContain('<img');expect(missing).toContain('Artwork unavailable');
  });
  it('renders one search-first owned catalogue, correct filters and no independent seller feed',()=>{
    const html=renderToStaticMarkup(createElement(EventDiscovery,{events:[event,{...event,id:'private',status:'draft',name:'Private event'}],initialNow:now}));
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);expect(html).toContain('Discover your next');
    expect(html).toContain('Search events, schools or venues');expect(html).toContain('aria-label="Grid view"');expect(html).toContain('aria-label="List view"');
    expect(html).toContain('href="/tour-stops"');expect(html).toContain('aria-label="Open event calendar"');
    for(const text of ['Upcoming','Past events','All events','Partner events','School tour'])expect(html).toContain(text);
    expect(html).toContain('href="/events/test-event"');expect(html).not.toContain('Private event');
    expect(html).not.toContain('Kenya picks');expect(html).not.toContain('Ticket sellers &amp; event guides');expect(html).not.toContain('workers.dev');
  });
  it('features only selected current dated events, not postponed or past records',()=>{
    const html=renderToStaticMarkup(createElement(EventDiscovery,{events:[{...event,priority:10},{...event,id:'old',slug:'old',name:'Past featured',priority:200,status:'completed'},{...event,id:'postponed',slug:'postponed',name:'Postponed featured',priority:100,status:'postponed'}],initialNow:now}));
    const featured=html.slice(html.indexOf('data-featured-events="true"'),html.indexOf('aria-labelledby="explore-events-title"'));
    expect(featured).toContain('A real campus event');expect(featured).not.toContain('Past featured');expect(featured).not.toContain('Postponed featured');
  });
  it('keeps server seed on refresh errors and provides size-aware layouts rather than old global overrides',()=>{
    const source=readFileSync('ui/components/EventDiscovery.tsx','utf8');
    expect(source).not.toContain('setCatalogue([])');expect(source).toContain("setRefreshState('stale')");expect(source).toContain('controller?.abort()');expect(source).toContain("document.removeEventListener('visibilitychange', onVisible)");
    const css=readFileSync('ui/components/EventDiscovery.module.css','utf8');
    expect(css).toContain('container-type:inline-size');expect(css).toContain('@container(max-width:700px)');expect(css).toContain('--event-grid-columns:2');expect(css).toContain('html[data-phone-viewport=wide]');
    expect(css).not.toContain('.discovery-poster');expect(css).not.toContain('!important');
  });
});
