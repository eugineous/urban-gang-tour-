import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import LanguageChooser from '@/app/_components/LanguageChooser';
import {TRANSLATION_LANGUAGES,translationLanguage,preferredTranslationLanguage,googleTranslationUrl,localWelcomeLanguage,publicTranslationPath} from '@/lib/translation-options';
describe('browser-aware language choices',()=>{
 it('ships the current published Google NMT catalogue without pretending every choice is a translated local page',()=>{
  expect(TRANSLATION_LANGUAGES).toHaveLength(194);expect(new Set(TRANSLATION_LANGUAGES.map(l=>l.code)).size).toBe(194);
  for(const code of ['ar','de','hi','ja','ko','pt','sw','zh-CN','zh-TW'])expect(translationLanguage(code)).toBe(code);
  expect(localWelcomeLanguage('de')).toBeUndefined();expect(localWelcomeLanguage('zh-Hans-CN')).toBe('zh-Hans');
 });
 it('uses explicit saved choice before browser preferences and understands region/script variants',()=>{
  expect(preferredTranslationLanguage(['fr-FR','en-US'],'de-DE')).toBe('de');
  expect(preferredTranslationLanguage(['unknown','pt-BR'])).toBe('pt-BR');
  expect(preferredTranslationLanguage(['zh-Hant-HK'])).toBe('zh-TW');
  expect(preferredTranslationLanguage(['zh-SG'])).toBe('zh-CN');
  expect(preferredTranslationLanguage(['en-US'])).toBe('en');
  expect(preferredTranslationLanguage([], '__proto__')).toBe('en');
  for(const value of [null,{},'<script>', 'constructor','a'.repeat(51)])expect(translationLanguage(value)).toBeUndefined();
 });
 it('builds only an explicit Google handoff to a canonical public path',()=>{
  const url=new URL(googleTranslationUrl('/blog/campus-budget','ar')!);
  expect(url.origin).toBe('https://translate.google.com');expect(url.searchParams.get('u')).toBe('https://urbangangtour.co.ke/blog/campus-budget');
  expect(url.searchParams.get('tl')).toBe('ar');expect(url.searchParams.get('sl')).toBe('auto');
 });
 it.each(['/admin','/admin?tab=Content','/organizer/dashboard','/account','/book','/contact-us','/cart','/checkout','/shop','/shop/tee','/pay/success?ref=private','/tickets/private','/receipt/private','/api/orders','/blog/story?token=private','//evil.example','https://evil.example','/blog/%3Fsecret'])('never sends sensitive or arbitrary %s to a translation service',path=>{
  expect(publicTranslationPath(path)).toBeUndefined();expect(googleTranslationUrl(path,'fr')).toBeUndefined();
 });
 it('renders a closed accessible chooser without browser-native name hydration or unsolicited Google scripts',()=>{
  const html=renderToStaticMarkup(createElement(LanguageChooser,{path:'/about'}));
  expect(html).toContain('Choose language');expect(html).toContain('aria-haspopup="dialog"');expect(html).not.toContain('<script');expect(html).not.toContain('Afrikaans');expect(html).not.toContain('translate.google.com');
 });
});
