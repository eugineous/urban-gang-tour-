import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>false,q:vi.fn()}));
vi.mock('@/app/_lib/blog',()=>({getBlogPosts:async()=>[]}));
import TicketingPage,{metadata} from '@/app/ticketing/page';
import sitemap from '@/app/sitemap';
import {TICKETING_GUIDE,TICKETING_ALTERNATIVES,TICKETING_QUESTIONS,ticketingGuideStructuredData} from '@/lib/ticketing-guide';

describe('factual ticketing comparison guide',()=>{
 it('provides one real canonical and matching individual social cards',()=>{
  const url='https://urbangangtour.co.ke/ticketing';
  expect(metadata.title).toBe(TICKETING_GUIDE.title);
  expect(metadata.alternates?.canonical).toBe(url);
  expect(metadata.openGraph).toMatchObject({url,title:TICKETING_GUIDE.title,description:TICKETING_GUIDE.description});
  expect(metadata.twitter).toMatchObject({card:'summary_large_image',title:TICKETING_GUIDE.title,description:TICKETING_GUIDE.description});
 });
 it('renders clear next actions and visible questions without inventing a current ticket offer',()=>{
  const html=renderToStaticMarkup(createElement(TicketingPage));
  expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
  for(const href of ['/events','/organizer/signup','/account','/ticket-terms','/refund-policy','/contact-us'])expect(html).toContain('href="'+href+'"');
  for(const item of TICKETING_QUESTIONS)expect(html).toContain(item.question);
  expect(html).toContain('only when ticket sales are enabled');
  expect(html).toContain('A pending payment is not a paid ticket');
  expect(html).not.toContain('schema.org/InStock');
  expect(html).not.toContain('"@type":"Offer"');
 });
 it('identifies independent platforms without fabricated rankings, fees or availability claims',()=>{
  const html=renderToStaticMarkup(createElement(TicketingPage));
  expect(TICKETING_ALTERNATIVES).toHaveLength(4);
  for(const platform of TICKETING_ALTERNATIVES){expect(html).toContain(platform.name);expect(new URL(platform.url).protocol).toBe('https:')}
  expect(html).toContain('independent platforms, not endorsements or partners');
  expect(html).not.toMatch(/(?:#1|number one|cheapest|fastest|better than|best ticketing|guaranteed acceptance|available in every country)/i);
  expect(html).toContain('Regional availability is not automatic');
 });
 it('keeps structured data factual and rooted in the public canonical page',()=>{
  const data=ticketingGuideStructuredData();
  expect(data[0]).toMatchObject({'@type':'WebPage',url:'https://urbangangtour.co.ke/ticketing'});
  expect(data[0]).toMatchObject({about:{provider:{'@id':'https://urbangangtour.co.ke/#org'}}});
  expect(data[1]).toMatchObject({'@type':'BreadcrumbList'});
  expect(JSON.stringify(data)).not.toMatch(/aggregateRating|reviewCount|price|award|sameAs|isBasedOn/);
 });
 it('is discoverable once without exposing private or parameterised pages',async()=>{
  const pages=await sitemap();
  expect(pages.filter(page=>page.url==='https://urbangangtour.co.ke/ticketing')).toHaveLength(1);
  expect(pages.some(page=>/\/(?:admin|checkout|pay|receipt)(?:[/?]|$)/.test(page.url))).toBe(false);
 });
 it('reflows by actual content width, including phone desktop-viewport mode',()=>{
  const css=readFileSync('app/ticketing/Ticketing.module.css','utf8');
  expect(css).toContain('container:ticketing/inline-size');
  expect(css).toContain('@container ticketing (max-width:520px)');
  expect(css).toContain('html[data-phone-viewport=wide]');
  expect(css).toContain('min-height:44px');
 });
});
