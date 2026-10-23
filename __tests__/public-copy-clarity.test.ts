import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {ExperiencePage} from '@/ui/components/ExperiencePage';
import {PortfolioPage} from '@/ui/components/PortfolioReconstruction';
import {EventDiscovery} from '@/ui/components/EventDiscovery';
import {ContactPage,ContactFooter} from '@/ui/components/ContactInterface';
import {BookingForm} from '@/app/_components/BookingForm';
import International from '@/app/international/page';
import {WEBSITE_DEFAULTS} from '@/lib/website-content';
const render=(component:React.ComponentType,props={})=>renderToStaticMarkup(createElement(component,props));
describe('plain-language public copy',()=>{
 it('names the events page directly without a generic experience slogan',()=>{
  const html=renderToStaticMarkup(createElement(EventDiscovery,{events:[],initialNow:Date.parse('2026-10-23T12:00:00+03:00')}));
  expect(html).toContain('Events &amp; tickets.');expect(html).not.toContain('next best event experience');
  for(const label of ['Search events, schools or venues','Upcoming','Past events','All events'])expect(html).toContain(label);
 });
 it('names the services and their booking actions instead of an unexplained experience',()=>{
  const html=render(ExperiencePage);
  expect(html).toContain('Events, hosting<br/>&amp; production.');
  for(const label of ['School events','Campus Rave','Live hosting','Event production','Brand campaigns','Event listings &amp; tickets'])expect(html).toContain(label);
  expect(html).toContain('href="/book?type=school"');expect(html).toContain('Request a quote');
  expect(html).toContain('school agreement determine your quote');expect(html).not.toContain('Make it yours.');
 });
 it('keeps the portfolio archive distinction but drops carousel instructions and vague shelf names',()=>{
  const html=render(PortfolioPage);
  for(const text of ['founders’ earlier hosting','Campus events.','Brand campaigns.','Concerts &amp; cultural events.','Urban News.'])expect(html).toContain(text);
  expect(html).not.toContain('Next starts again');expect(html).not.toContain('next moment');
 });
 it('keeps contact consent and browser drafts with direct submission',()=>{
  const html=render(ContactPage);
  expect(html).toContain('Contact the team.');expect(html).toContain('Send an enquiry');
  expect(html).toContain('href="/privacy-policy"');expect(html).toContain('type="submit">Send message');
  expect(html).toContain('Your draft stays in this browser until your enquiry is saved.');expect(html).toContain('https://wa.me/254799886247');expect(html).toContain('mailto:admin@urbangangtour.co.ke');
  expect(html).not.toContain('Nothing is sent until you send it in');
  expect(html).toContain('We agree the programme, date and quote with you first.');
 });
 it('keeps direct contact access without a repeated footer invitation',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,{onCookies:()=>{},onFocus:()=>{},focusView:false}));
  expect(html).toContain('href="/contact-us"');expect(html).toContain('Email us');
  expect(html).not.toContain('Plan an event with us.');
  expect(html).toContain('Cookie settings');expect(html).toContain('Focus view:');
 });
 it('keeps booking safeguards and does not describe an enquiry as a reserved date',()=>{
  const html=render(BookingForm);
  expect(html).toContain('Book Urban<br/>Gang Tour.');expect(html).toContain('No payment is needed to send an enquiry.');
  expect(html).toContain('Sending this form does not reserve a date.');expect(html).toContain('I am an adult authorized to arrange this school event.');
  expect(html).toContain('privacy policy');expect(html).toContain('Request my event quote');expect(html).not.toContain('An event to remember');
 });
 it('shortens factory biographies without dropping identity, roles or programme credits',()=>{
  const eugine=WEBSITE_DEFAULTS['/author/eugine-micah'].body.join(' '),lucy=WEBSITE_DEFAULTS['/author/lucy-ogunde'].body.join(' ');
  expect(eugine.split(/\s+/).length).toBeLessThan(90);expect(lucy.split(/\s+/).length).toBeLessThan(70);
  for(const text of ['Kenyan television presenter','journalist','founder and executive producer','PPP TV Kenya','Lucy Ogunde'])expect(eugine).toContain(text);
  for(const text of ['television presenter, MC and event host','PPP TV Kenya','Eugine Micah'])expect(lucy).toContain(text);
 });
 it('preserves international payment and delivery limitations rather than making broad availability claims',()=>{
  const html=render(International);
  expect(html).toContain('Planning from abroad?');expect(html).toContain('M-Pesa requires a supported Kenyan M-Pesa number.');
  expect(html).toContain('We cannot guarantee acceptance of every international card.');expect(html).toContain('Worldwide shipping is not automatically available.');
  expect(html).toContain('check its status before paying again');
 });
});
