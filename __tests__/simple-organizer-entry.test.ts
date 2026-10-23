import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import SignupForm from '@/app/organizer/signup/SignupForm';
describe('organizer application entry',()=>{
 it('uses a native labelled form with submit and non-submit retry actions',()=>{
  const html=renderToStaticMarkup(createElement(SignupForm));
  expect(html).toContain('<form');expect(html).toContain('aria-label="Apply to sell tickets"');
  expect(html).toMatch(/<button[^>]*type="submit"/);
  const source=readFileSync('app/organizer/signup/SignupForm.tsx','utf8');
  expect(source).toContain('onSubmit={event=>{event.preventDefault();void submit()}}');
  expect(source).toContain('type="button" style={btnMagenta}');
 });
 it('keeps required business, bank and adult/terms rules with browser validation',()=>{
  const html=renderToStaticMarkup(createElement(SignupForm));
  for(const name of ['businessName','contactName','email','phone','password','settlementBank','settlementAccount','adultConfirmed','termsAccepted']){
   const input=html.match(new RegExp('<(?:input|select)[^>]*name="'+name+'"[^>]*>'))?.[0];
   expect(input,name).toBeTruthy();expect(input,name).toContain('required');
  }
  expect(html).toContain('Card payments only');expect(html).toContain('We review every application.');
  expect(html).toContain('href="/terms"');expect(html).toContain('href="/privacy-policy"');
 });
});
