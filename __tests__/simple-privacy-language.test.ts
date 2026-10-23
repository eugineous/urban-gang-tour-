// SSR/source contracts; the release's browser run checks the actual native picker.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {describe,expect,it} from 'vitest';
import LanguageChooser from '@/app/_components/LanguageChooser';
import {TRANSLATION_LANGUAGES} from '@/lib/translation-options';

function values(css:string,selector:string,property:string){const found:string[]=[];postcss.parse(css).walkRules(selector,rule=>rule.walkDecls(property,decl=>{found.push(decl.value)}));return found;}

describe('native language switch',()=>{
 it('renders one labelled native select with all 194 choices and a browser-language reset',()=>{
  const html=renderToStaticMarkup(createElement(LanguageChooser,{path:'/about'}));
  expect(html.match(/<select\b/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Choose language"');
  expect(html.match(/<option\b/g)).toHaveLength(TRANSLATION_LANGUAGES.length+1);
  expect(html).toContain('value="auto" selected=""');
  for(const item of TRANSLATION_LANGUAGES)expect(html).toContain(`value="${item.code}"`);
  expect(html).toContain('Browser language (automatic)');
  expect(html).not.toContain('<dialog');expect(html).not.toContain('<script');
 });
 it('makes translation a separate explicit canonical-public-page link, not a selection side effect',()=>{
  const html=renderToStaticMarkup(createElement(LanguageChooser,{path:'/about'}));
  expect(html).toContain('class="language-apply"');
  expect(html).toContain('https://translate.google.com/translate?');
  expect(html).toContain('u=https%3A%2F%2Furbangangtour.co.ke%2Fabout');
  expect(html).toContain('target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"');
  expect(html).toContain('only when you click Go');
  const source=readFileSync('app/_components/LanguageChooser.tsx','utf8');
  expect(source).not.toMatch(/createPortal|showModal|window\.open|location\.(?:assign|replace)|fetch\(/);
  expect(source).toContain('localStorage.removeItem(LANGUAGE_CHOICE_KEY)');
  expect(source).toContain("addEventListener('languagechange',sync)");
  expect(source).toContain("addEventListener('storage',storage)");
 });
 it.each(['/account','/cart','/checkout','/shop','/book','/contact-us','/admin','/events/public-event?token=private'])('does not provide an external translation link for %s',path=>{
  const html=renderToStaticMarkup(createElement(LanguageChooser,{path}));
  expect(html).not.toContain('href="https://translate.google.com');
  expect(html).not.toContain('class="language-apply"');
  expect(html).toContain('Private pages and forms are not sent to Google.');
 });
 it('fits the 96px header slot with readable select text and 44px controls',()=>{
  const css=readFileSync('app/responsive-continuation.css','utf8');
  expect(values(css,'.language-control','inline-size')).toEqual(['96px']);
  expect(values(css,'.language-select','inline-size')).toEqual(['48px']);
  expect(values(css,'.language-select','block-size')).toEqual(['44px']);
  expect(values(css,'.language-select','font')).toEqual(['500 16px/1.4 Inter,Arial,sans-serif']);
  expect(values(css,'.language-apply,.language-private','min-block-size')).toEqual(['44px']);
  expect(css).toContain(':focus-visible');expect(css).not.toContain('.language-dialog');
 });
});

describe('two-choice cookie panel',()=>{
 it('offers Reject and Accept with a concise disclosure and policy links, not a third preferences step',()=>{
  const source=readFileSync('app/_components/CookieConsent.tsx','utf8');
  expect(source).toContain('onClick={()=>decide(false)}>Reject</button>');
  expect(source).toContain('onClick={()=>decide(true)}>Accept</button>');
  expect(source).toContain('Necessary cookies keep the site working.');
  expect(source).toContain('stays off until you accept.');
  expect(source).toContain('If you’re under 18, choose Reject.');
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
