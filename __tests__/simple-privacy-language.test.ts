// SSR/source contracts; the release's browser run checks the actual native picker.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {describe,expect,it} from 'vitest';
import LanguageChooser from '@/app/_components/LanguageChooser';
import {INTERFACE_LOCALES} from '@/lib/i18n/locale';
import {privacyMessages} from '@/ui/i18n/catalogues/privacy';

function values(css:string,selector:string,property:string){const found:string[]=[];postcss.parse(css).walkRules(selector,rule=>rule.walkDecls(property,decl=>{found.push(decl.value)}));return found;}

describe('native language switch',()=>{
 it('renders one labelled native select with all six supported explicit choices',()=>{
  const html=renderToStaticMarkup(createElement(LanguageChooser,{path:'/about'}));
  expect(html.match(/<select\b/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Language"');
  expect(html.match(/<option\b/g)).toHaveLength(INTERFACE_LOCALES.length);
  expect(html).toContain('value="en" selected=""');
  for(const code of INTERFACE_LOCALES)expect(html).toContain(`value="${code}"`);
  expect(html).not.toContain('value="auto"');
  expect(html).not.toContain('<dialog');expect(html).not.toContain('<script');
 });
 it('applies native selection locally without an external translation action',()=>{
  const html=renderToStaticMarkup(createElement(LanguageChooser,{path:'/about'}));
  expect(html).not.toMatch(/<a\b|translate.google|>Go</);
  expect(html).toContain('Your choice applies immediately.');
  const source=readFileSync('app/_components/LanguageChooser.tsx','utf8');
  expect(source).toContain('setLocale(nativeLocale(event.target.value)');
  expect(source).not.toMatch(/createPortal|showModal|window\.open|location\.(?:assign|replace)|fetch\(|navigator|localStorage/);
 });
 it.each(['/account','/cart','/checkout','/shop','/book','/contact-us','/admin','/events/public-event?token=private'])('does not provide an external translation link for %s',path=>{
  const html=renderToStaticMarkup(createElement(LanguageChooser,{path}));
  expect(html).not.toContain('href="https://translate.google.com');
  expect(html).not.toContain('class="language-apply"');
  expect(html).toContain('Your choice applies immediately.');
 });
 it('wraps readable native names and helper text with 44px controls',()=>{
  const css=readFileSync('app/responsive-continuation.css','utf8');
  expect(values(css,'.language-control','flex-wrap')).toEqual(['wrap']);
  expect(values(css,'.language-select','min-inline-size')).toEqual(['0']);
  expect(values(css,'.language-select','inline-size')).toEqual(['160px']);
  expect(values(css,'.language-select','min-block-size')).toEqual(['44px']);
  expect(values(css,'.language-select','font')).toEqual(['500 16px/1.4 Inter,Arial,sans-serif']);
  expect(css).toContain(':focus-visible');expect(css).not.toContain('.language-dialog');
  expect(css).not.toContain('inline-size:96px');
 });
});

describe('two-choice cookie panel',()=>{
 it('offers Reject and Accept with a concise disclosure and policy links, not a third preferences step',()=>{
  const source=readFileSync('app/_components/CookieConsent.tsx','utf8');
  expect(source).toContain('onClick={()=>decide(false)}');
  expect(privacyMessages.en['consent.reject']).toBe('Reject');
  expect(source).toContain('onClick={()=>decide(true)}');
  expect(privacyMessages.en['consent.accept']).toBe('Accept');
  expect(privacyMessages.en['consent.disclosure']).toContain('Necessary cookies keep the site working.');
  expect(privacyMessages.en['consent.disclosure']).toContain('stays off until you accept.');
  expect(privacyMessages.en['consent.disclosure']).toContain('If you’re under 18, choose Reject.');
  expect(source).toContain('href="/cookie-policy"');expect(source).toContain('href="/privacy-policy"');
  expect(source).not.toContain('privacy-storage-details');expect(source).not.toContain('setDetails');
 });
 it('retains real consent persistence, footer reopening and cleanup of already loaded optional services',()=>{
  const source=readFileSync('app/_components/CookieConsent.tsx','utf8');
  for(const contract of ['hasConsentChoice()','hasOptionalConsent()','setOptionalConsent(accepted)',"'ugt-open-cookie-settings'","document.getElementById('ugt-ga4')","document.getElementById('ugt-adsense')",'setCleanup(!accepted && loaded)','location.reload()'])expect(source).toContain(contract);
  expect(source).toContain('pathname?.startsWith(\'/admin\')');
  expect(source).toContain('/^\\/(checkout|pay)(\\/|$)/');
 });
 it('keeps choices equally styled, at least 44px tall and within a smaller scrollable panel',()=>{
  const css=readFileSync('app/_components/PrivacyChoices.module.css','utf8');
  expect(values(css,'.banner','width')).toEqual(['min(360px,calc(100% - 24px))']);
  expect(values(css,'.banner','overflow-y')).toEqual(['auto']);
  expect(values(css,'.actions','grid-template-columns')).toEqual(['repeat(2,minmax(0,1fr))']);
  expect(values(css,'.actions button','min-height')).toEqual(['44px']);
  expect(values(css,'.close','width')).toEqual(['44px']);
  expect(css).not.toMatch(/button:(?:first|last|nth)-child/);
 });
});
