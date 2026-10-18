import {expect,it} from 'vitest';
import {EMPTY_PARTNER,partnerPublicationChecks,partnerPublicationIssues,partnerPublicationError} from '@/lib/partner-events';
const details={...EMPTY_PARTNER,organizer:'Organiser already entered',client:'Sherehe Vibes Africa',role:'Hosting already entered',admission:'free' as const};
const row={status:'published',eventDate:'2026-11-08',venue:'Main campus',image:''};
it('acknowledges optional missing artwork without blocking an announcement',()=>{
 expect(partnerPublicationIssues(details,row)).toEqual([]);
 expect(partnerPublicationChecks(details,row).find(check=>check.field==='image')?.ready).toBe(false);
 for(const field of ['organizer','client','role','eventDate','venue'])expect(partnerPublicationChecks(details,row).find(check=>check.field===field)?.ready).toBe(true);
});
it('acknowledges a newly added cover and shares the exact server readiness rules',()=>{
 const complete={...row,image:'/media/admin-events/original.jpg'};expect(partnerPublicationIssues(details,complete)).toEqual([]);expect(partnerPublicationError(details,complete)).toBeNull();expect(partnerPublicationChecks(details,complete).every(check=>check.ready)).toBe(true);
});
it('allows a listing without a seller while keeping the admission details unconfirmed',()=>{
 const complete={...row,image:'/media/admin-events/original.jpg'};
 expect(partnerPublicationIssues({...details,admission:'external'},complete)).toEqual([]);
 expect(partnerPublicationIssues({...details,admission:'invitation'},complete)).toEqual([]);
});
it('keeps incomplete private drafts possible and treats whitespace as missing',()=>{
 expect(partnerPublicationIssues(EMPTY_PARTNER,{status:'draft'})).toEqual([]);
 expect(partnerPublicationError(details,{...row,image:'/image.jpg',venue:'  '})).toBeNull();
 expect(partnerPublicationIssues(details,{...row,venue:'  '})).toEqual([]);
});
