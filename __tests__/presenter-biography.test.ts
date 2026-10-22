// SSR and selection contracts only; browser/device verification belongs to the release QA.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PresenterProfile} from '@/ui/components/PresenterProfiles';
import {PRESENTER_BIOGRAPHIES,presenterEventCredits,presenterRelatedStories} from '@/ui/lib/presenter-biography';
import {EMPTY_PARTNER} from '@/lib/partner-events';

const now=Date.parse('2026-10-22T12:00:00+03:00');
const event={id:'credited-event',slug:'credited-event',kind:'school',status:'completed',name:'Campus programme',eventDate:'2026-09-25',description:'Eugine Micah — hype. Lucy Ogunde — interviews.',venue:'Campus hall',city:'Nairobi'};

describe('structured, evidence-linked presenter biographies',()=>{
 it.each([false,true])('renders one readable biography with working section anchors, lucy=%s',lucy=>{
  const html=renderToStaticMarkup(createElement(PresenterProfile,{lucy,initialNow:now}));
  const record=PRESENTER_BIOGRAPHIES[lucy?'lucy':'eugine'];
  expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
  expect(html).toContain('id="presenter-name">'+record.name+'</h1>');
  for(const anchor of ['biography','broadcasting','selected-work','photographs']){
   expect(html).toContain('href="#'+anchor+'"');
   expect(html).toContain('id="'+anchor+'"');
  }
  expect(html).toContain('On this page');
  expect(html).toContain('href="'+record.collaboratorPath+'"');
  expect(html).toContain('Urban News · PPP TV Kenya');
  expect(html).toContain('href="/book?type=hosts&amp;host='+(lucy?'lucy':'eugine')+'"');
  expect(html.match(/<video(?:\s|>)/g)).toHaveLength(3);
  expect(html).not.toMatch(/birthDate|wikidata|wikipedia\.org|Verified celebrity|award-winning/i);
 });
 it('preserves published CMS text and portrait rather than replacing owner edits',()=>{
  const content={title:'Published presenter title',summary:'Published introduction',body:['Published biography paragraph.'],image:'/media/custom-portrait.jpg',faqs:[]};
  const html=renderToStaticMarkup(createElement(PresenterProfile,{content,initialNow:now}));
  expect(html).toContain('Published presenter title');expect(html).toContain('Published introduction');
  expect(html).toContain('Published biography paragraph.');expect(html).toContain('src="/media/custom-portrait.jpg"');
 });
 it('does not assign the company’s other events to either person without a named credit',()=>{
  const unrelated={...event,id:'company',slug:'company',description:'Urban Gang Tour promotes this event.'};
  expect(presenterEventCredits([unrelated],false,now)).toEqual([]);
  expect(presenterEventCredits([unrelated],true,now)).toEqual([]);
  const eugineOnly={...event,description:'Eugine Micah hosts the programme.'};
  expect(presenterEventCredits([eugineOnly],false,now)).toHaveLength(1);
  expect(presenterEventCredits([eugineOnly],true,now)).toEqual([]);
 });
 it('recognises explicit partner role credits without declaring the event completed',()=>{
  const credited={...event,kind:'partner',status:'announced',eventDate:null,description:'A new event announcement.',partnerDetails:{...EMPTY_PARTNER,admission:'unconfirmed',role:'Lucy Ogunde — interviews.'}};
  const rows=presenterEventCredits([credited],true,now);
  expect(rows).toHaveLength(1);expect(rows[0].date).toBe('Date to be confirmed');
  expect(rows[0].status).toBe('Announced · details to follow');
  expect(rows[0].status).not.toContain('completed');
 });
 it('excludes hidden records and unsafe URLs, preserving public credits in reverse date order',()=>{
  const rows=presenterEventCredits([
   {...event,id:'old',slug:'older-credit',eventDate:'2026-01-03'},
   event,{...event,id:'draft',status:'draft'},{...event,id:'unsafe',slug:'../admin'},
  ],false,now);
  expect(rows.map(row=>row.id)).toEqual(['credited-event','old']);
  expect(rows[0].href).toBe('/events/credited-event');
 });
 it('links only relevant public story excerpts without presenting a subject as its author',()=>{
  const stories=presenterRelatedStories([
   {id:'lucy-interview',headline:'Lucy Ogunde on campus',date:'2026-10-20'},
   {id:'eugine-news',headline:'Hosting stories',dek:'Eugine Micah talks about the programme.',date:'2026-10-22'},
   {id:'private',headline:'Eugine Micah',status:'draft'},
   {id:'../../admin',headline:'Eugine Micah'},
   {id:'unrelated',headline:'An event announcement',author:'Eugine Micah'},
  ],false);
  expect(stories).toEqual([{id:'eugine-news',headline:'Hosting stories',href:'/blog/eugine-news'}]);
 });
 it('shows optional credits and related stories only when supported by the supplied public records',()=>{
  const html=renderToStaticMarkup(createElement(PresenterProfile,{events:[event],posts:[{id:'lucy-story',headline:'Lucy Ogunde at the event'}],lucy:true,initialNow:now}));
  expect(html).toContain('href="#event-credits"');expect(html).toContain('href="/events/credited-event"');
  expect(html).toContain('href="#related-stories"');expect(html).toContain('href="/blog/lucy-story"');
  const empty=renderToStaticMarkup(createElement(PresenterProfile,{initialNow:now}));
  expect(empty).not.toContain('id="event-credits"');expect(empty).not.toContain('id="related-stories"');
 });
 it('reflows its article, facts, films and contents on narrow or wide-phone viewports',()=>{
  const css=readFileSync('ui/components/PortfolioProfiles.module.css','utf8');
  expect(css).toContain('.biographyLayout{display:grid;grid-template-columns:minmax(0,1fr)');
  expect(css).toContain('.biographyContents ol{display:flex;flex-wrap:wrap');
  expect(css).toContain(':global(html[data-phone-viewport=wide]) .biographyLayout{grid-template-columns:minmax(0,1fr)');
  expect(css).toContain(':global(html[data-phone-viewport=wide]) .biographyFilms{grid-template-columns:minmax(0,1fr)');
  expect(css).toContain('.biographyFilms video{display:block;width:100%!important;height:100%!important;object-fit:contain}');
  expect(css).toContain('.biographyFacts dl>div{grid-template-columns:minmax(0,1fr)');
 });
});
