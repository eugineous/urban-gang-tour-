import {describe,it,expect} from 'vitest';
import {EMPTY_PARTNER,externalTicketUrl,parsePartnerDetails,partnerDetailIssues,partnerPublicationIssues} from '@/lib/partner-events';
const details={...EMPTY_PARTNER,organizer:'Organiser',posters:[{url:'/media/admin-events/poster.jpg',caption:''}]};
describe('partner poster validation and safe recovery',()=>{
 it('identifies the exact incomplete poster caption, without discrediting entered credits',()=>{
  expect(partnerDetailIssues(details)).toEqual([{field:'posters',label:'Poster 2',message:'Poster 2: add a short caption before publishing.',targetId:'partner-poster-0-caption'}]);
 });
 it('keeps incomplete captions and image rows in private drafts, but never validates them for publication',()=>{
  for(const poster of [{url:'/media/admin-events/poster.jpg',caption:''},{url:'',caption:'Caption in progress'}]){
   const draft={...details,posters:[poster]};
   expect(parsePartnerDetails(draft,{draft:true})?.posters).toEqual([poster]);
   expect(partnerPublicationIssues(draft,{status:'draft'})).toEqual([]);
   expect(partnerPublicationIssues(draft,{status:'pending_review'})).toEqual([]);
   expect(parsePartnerDetails(draft)).toBeNull();
   expect(partnerPublicationIssues(draft,{status:'announced'}).length).toBeGreaterThan(0);
  }
 });
 it('normalizes uploaded same-site image links while retaining strict external seller checks',()=>{
  const image=' https://urbangangtour.co.ke/media/admin-events/poster.jpg ';
  const parsed=parsePartnerDetails({...details,posters:[{url:image,caption:' Original poster '}],newsSlug:'https://www.urbangangtour.co.ke/blog/our-event?utm_source=copy'});
  expect(parsed?.posters).toEqual([{url:'/media/admin-events/poster.jpg',caption:'Original poster'}]);
  expect(parsed?.newsSlug).toBe('our-event');
  expect(externalTicketUrl('https://urbangangtour.co.ke/checkout')).toBeNull();
 });
 it('never permits unsafe supplied image links even in a draft',()=>{
  for(const url of ['javascript:alert(1)','data:image/png;base64,AAAA','//evil.example/a.jpg','https://u:p@urbangangtour.co.ke/a.jpg','https://127.0.0.1/a.jpg']){
   const draft={...details,posters:[{url,caption:''}]};
   expect(parsePartnerDetails(draft,{draft:true})).toBeNull();
   expect(partnerDetailIssues(draft,{draft:true})[0].targetId).toBe('partner-poster-0-url');
  }
 });
 it('reports multiple posters independently and clears only corrected issues',()=>{
  const multiple={...details,posters:[{url:'/one.jpg',caption:''},{url:'bad-link',caption:'Second poster'}]};
  expect(partnerDetailIssues(multiple).map(issue=>issue.targetId)).toEqual(['partner-poster-0-caption','partner-poster-1-url']);
  multiple.posters[0].caption='First poster';
  expect(partnerDetailIssues(multiple).map(issue=>issue.targetId)).toEqual(['partner-poster-1-url']);
 });
 it('rejects excessive captions, malformed metadata and unsafe story links',()=>{
  expect(partnerDetailIssues({...details,posters:[{url:'/x.jpg',caption:'x'.repeat(301)}]})[0].message).toContain('300');
  expect(parsePartnerDetails({...details,posters:[],newsSlug:'https://other.example/blog/event'})).toBeNull();
  expect(parsePartnerDetails({...details,posters:[],privateNotes:'Do not leak'})).toBeNull();
 });
});
