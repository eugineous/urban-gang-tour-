import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import PressPage from '@/app/press/page';
import Accessibility from '@/app/accessibility/page';
import SignupForm from '@/app/organizer/signup/SignupForm';

describe('plain-language support pages',()=>{
 it('keeps signup instructions and login links readable on the existing light backgrounds',()=>{
  const html=renderToStaticMarkup(createElement(SignupForm));
  expect(html).toContain('color:#555;margin-bottom:20px');
  expect(html).toContain('font-size:12px;color:#595959');
  expect(html).toContain('color:#ad1264;font-weight:700');
  for(const old of ['color:#bbb','color:#888','color:#E6218C'])expect(html).not.toContain(old);
  const luminance=(hex:string)=>{
   const rgb=hex.slice(1).match(/../g)!.map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
   return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  for(const [ink,paper] of [['#555555','#f5f4f0'],['#595959','#ffffff'],['#ad1264','#ffffff']]){
   expect((luminance(paper)+0.05)/(luminance(ink)+0.05)).toBeGreaterThanOrEqual(4.5);
  }
 });
 it('names the press page directly and retains the mission and team roles',()=>{
  const html=renderToStaticMarkup(createElement(PressPage));
  expect(html).toContain('<h1>Press &amp; media.</h1>');
  for(const text of ['From Potential to Purpose','Eugine Micah','Lucy Ogunde','TV presenter, MC','hype man','Event coordination and event supply','PPP TV'])expect(html).toContain(text);
  expect(html).not.toContain('The story behind the tour');
  expect(html).not.toContain('bringing conversation and audience connection');
 });
 it('keeps press contacts, factual profile links and publication-rights checks',()=>{
  const html=renderToStaticMarkup(createElement(PressPage));
  for(const href of ['/author/eugine-micah','/author/lucy-ogunde','/portfolio','/tour-stops','/gallery','mailto:admin@urbangangtour.co.ke'])expect(html).toContain(`href="${href}"`);
  expect(html).toContain('approved event details');
  expect(html).toContain('Confirm image rights and factual claims before publication.');
 });
 it('names accessibility settings directly and keeps the working focus-view control',()=>{
  const html=renderToStaticMarkup(createElement(Accessibility));
  expect(html).toContain('<h1>Accessibility &amp;<br/>display settings.</h1>');
  expect(html).toContain('No account needed; change it at any time.');
  expect(html).toContain('aria-pressed="false"');
  expect(html).toContain('Focus view: off');
  expect(html).not.toContain('Less distraction.');
 });
 it('preserves keyboard, media, language and accessibility-testing limitations',()=>{
  const html=renderToStaticMarkup(createElement(Accessibility));
  for(const text of ['Use Tab','Enter to follow a link','Escape to close the main menu','skips to the main content','browser’s zoom','reduced-motion preference','Some video captions or transcripts may not yet be available.','six languages','Most forms and articles are currently in English.','not a claim of full WCAG compliance','WCAG 2.2 AA','real-device testing are still needed'])expect(html).toContain(text);
  expect(html).toContain('href="/welcome/en"');
  expect(html).toContain('Report an accessibility problem');
 });
 it('uses plain payout-bank labels without changing application eligibility or promises',()=>{
  const html=renderToStaticMarkup(createElement(SignupForm)).replace(/\s+/g,' ');
  expect(html).toContain('Payout bank *');
  expect(html).toContain('Bank account number *');
  expect(html).not.toContain('Settlement bank');
  for(const text of ['automatic bank payouts','Card payments only','We review every application','our commission is deducted','18 or older and authorised','Terms','Privacy Policy'])expect(html).toContain(text);
 });
 it('keeps organizer request field names, endpoints and confirmation gates unchanged',()=>{
  const source=readFileSync('app/organizer/signup/SignupForm.tsx','utf8');
  expect(source).toContain("api('/api/organizer/banks')");
  expect(source).toContain("api('/api/organizer/signup'");
  expect(source).toContain('JSON.stringify({ businessName, contactName, email, phone, password, settlementBank, settlementAccount, adultConfirmed, termsAccepted })');
  expect(source).toContain('if (!adultConfirmed || !termsAccepted)');
  expect(source).toContain('Select your payout bank');
  expect(source).toContain('Enter your bank account number');
 });
});
