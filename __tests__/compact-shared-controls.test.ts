// Source contracts; rendered geometry and interactions are checked separately.
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {describe,expect,it} from 'vitest';
import {privacyMessages} from '@/ui/i18n/catalogues/privacy';
const shared=readFileSync('app/interaction-foundations.css','utf8');
const privacy=readFileSync('app/_components/PrivacyChoices.module.css','utf8');
const languages=readFileSync('app/responsive-continuation.css','utf8');
function values(css:string,selector:string,property:string){const result:string[]=[];postcss.parse(css).walkRules(selector,r=>r.walkDecls(property,d=>{result.push(d.value)}));return result;}
describe('compact shared controls',()=>{
 it('reduces CTA padding and typography without capping wrapped height or moving on focus',()=>{
  expect(values(shared,'.application-content .button','min-block-size')).toEqual(['44px']);
  expect(values(shared,'.application-content .button','padding')).toEqual(['10px 16px']);
  expect(values(shared,'.application-content .button','font')).toEqual(['550 14px/1.4 Inter,Arial,sans-serif']);
  expect(values(shared,'.application-content .button','white-space')).toEqual(['normal']);
  expect(values(shared,'.application-content .button','max-height')).toEqual([]);
  expect(shared).toContain('.application-content .button:is(:hover,:active,:focus-visible){transform:none}');
 });
 it('keeps optional secondary action groups and enquiry submits content-sized',()=>{
  expect(shared).toContain('>.button{flex:0 1 auto}');
  expect(shared).toContain(':is(.booking2-form,.contact-compose)>.button{justify-self:start;inline-size:fit-content}');
  expect(shared).not.toContain('flex:1 1 180px');
 });
 it('bounds the privacy panel and places equal consent choices in a compact row',()=>{
  expect(values(privacy,'.banner','width')).toEqual(['min(360px,calc(100% - 24px))']);
  expect(values(privacy,'.banner','max-height')).toContain('min(70dvh,520px)');
  expect(values(privacy,'.banner','overflow-y')).toEqual(['auto']);
  expect(values(privacy,'.actions','grid-template-columns')).toEqual(['repeat(2,minmax(0,1fr))']);
  expect(values(privacy,'.actions button','min-height')).toEqual(['44px']);
  expect(values(privacy,'.close','width')).toEqual(['44px']);
  expect(values(privacy,'.close','height')).toEqual(['44px']);
  expect(privacy).not.toContain('button:last-child');
 });
 it('keeps meaningful consent and necessary storage with two simple choices',()=>{
  const component=readFileSync('app/_components/CookieConsent.tsx','utf8');
  for(const handler of ['onClick={()=>decide(false)}','onClick={()=>decide(true)}','setOptionalConsent(accepted)'])expect(component).toContain(handler);
  expect(privacyMessages.en['consent.reject']).toBe('Reject');expect(privacyMessages.en['consent.accept']).toBe('Accept');
  for(const text of ['Necessary cookies','If you’re under 18','stays off until you accept'])expect(privacyMessages.en['consent.disclosure']).toContain(text);
  expect(component).not.toContain('privacy-storage-details');
 });
 it('replaces the language modal with a compact readable native selector',()=>{
  expect(values(languages,'.language-control','flex-wrap')).toEqual(['wrap']);
  expect(values(languages,'.language-select','inline-size')).toEqual(['160px']);
  expect(values(languages,'.language-select','min-inline-size')).toEqual(['0']);
  expect(values(languages,'.language-select','max-inline-size')).toEqual(['100%']);
  expect(values(languages,'.language-select','min-block-size')).toEqual(['44px']);
  expect(values(languages,'.language-select','font')).toEqual(['500 16px/1.4 Inter,Arial,sans-serif']);
  expect(languages).not.toContain('.language-dialog');
  expect(languages).toContain(':focus-visible');expect(languages).not.toContain('.language-apply');
 });
 it('does not introduce a blanket maximum for image, zoom or gallery buttons',()=>{
  expect(shared).not.toMatch(/(?:^|})\s*button\s*\{[^}]*max-(?:block-size|height)/);
 });
 it('compacts the mobile navigation dialog without changing desktop visibility or its native lifecycle',()=>{
  const navigation=readFileSync('app/navigation.css','utf8');
  expect(values(navigation,'dialog.menu-panel','width')).toEqual(['min(540px,calc(100% - 24px))']);
  expect(values(navigation,'dialog.menu-panel','max-height')).toContain('min(84dvh,calc(100dvh - 24px))');
  expect(values(navigation,'.menu-groups nav a','min-height')).toEqual(['48px','44px']);
  expect(values(navigation,'.menu-groups nav a','font-size')).toContain('20px');
  expect(navigation).toContain('.site-header .menu-toggle{display:none}');
  expect(navigation).toContain('dialog.menu-panel:not([open]){display:none}');
 });
});
