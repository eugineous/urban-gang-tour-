import {describe, expect, it} from 'vitest';
import {nextTourEvent, tourEventAction, type PublicTourEvent} from '@/ui/lib/home-tour';

const now = Date.parse('2026-10-11T10:00:00+03:00');
const event = (overrides: Partial<PublicTourEvent> = {}): PublicTourEvent => ({id:'event', slug:'next-stop', name:'A school programme', kind:'school', status:'published', eventDate:'2026-10-12', ...overrides});
describe('homepage next stop truth', () => {
  it('excludes private/planning, past, unknown-date and postponed records', () => {
    expect(nextTourEvent([event({status:'draft'}), event({status:'cancelled'}), event({status:'postponed'}), event({eventDate:'2026-10-10'}), event({eventDate:null}), event({eventDate:'2026-02-30'}), event({kind:'past'})], now)).toBeUndefined();
  });
  it('uses the earliest published upcoming date and keeps today through Nairobi midnight', () => {
    const today = event({id:'today',eventDate:'2026-10-11'});
    expect(nextTourEvent([event(),today], now)?.id).toBe('today');
    expect(nextTourEvent([today],Date.parse('2026-10-12T00:00:00+03:00'))).toBeUndefined();
  });
  it('never offers tickets for a school even if a bad client flag says sellable', () => {
    expect(tourEventAction(event({sellable:true}))).toMatchObject({href:'/tour-stops',label:'Explore the school tour'});
  });
  it('requires both published status and server sellable truth before offering tickets', () => {
    expect(tourEventAction(event({kind:'ticketed',sellable:true})).label).toBe('View tickets');
    expect(tourEventAction(event({kind:'ticketed',sellable:false})).label).toBe('View event details');
    expect(tourEventAction(event({kind:'ticketed',status:'sold_out',sellable:true})).label).toBe('View event details');
  });
});
