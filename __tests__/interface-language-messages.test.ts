import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {INTERFACE_LOCALES, NATIVE_NAMES, isEnglishOnlyInterfacePath, legacyNativeLocale, nativeLocale} from '@/lib/i18n/locale';
import {catalogueProblems, defineCatalogue, formatMessage, selectMessageTemplate, type Catalogue} from '@/lib/i18n/messages';

const messages = defineCatalogue({
  en:{reference:'Reference {code}',items:{one:'{count} item',other:'{count} items'}},
  sw:{reference:'Rejeleo {code}',items:{one:'Kipengee {count}',other:'Vipengee {count}'}},
  fr:{reference:'Référence {code}',items:{one:'{count} article',other:'{count} articles'}},
  'zh-Hans':{reference:'参考编号 {code}',items:{other:'{count} 件商品'}},
  ru:{reference:'Номер {code}',items:{one:'{count} товар',few:'{count} товара',many:'{count} товаров',other:'{count} товара'}},
  es:{reference:'Referencia {code}',items:{one:'{count} artículo',other:'{count} artículos'}}
});

describe('native interface locale registry', () => {
  it('accepts exactly the six explicit supported choices', () => {
    expect(INTERFACE_LOCALES).toEqual(['en','sw','fr','zh-Hans','ru','es']);
    for (const locale of INTERFACE_LOCALES) expect(nativeLocale(locale)).toBe(locale);
    for (const value of ['auto','zh-CN','fr-FR','FR',' fr ',null,undefined,{},42,'constructor','__proto__']) {
      expect(nativeLocale(value)).toBeUndefined();
    }
    expect(nativeLocale('auto')).toBeUndefined();
    expect(nativeLocale({locale:'fr'})).toBeUndefined();
    expect(NATIVE_NAMES).toEqual({en:'English',sw:'Kiswahili',fr:'Français','zh-Hans':'简体中文',ru:'Русский',es:'Español'});
  });
  it('migrates only explicit supported legacy choices', () => {
    expect(legacyNativeLocale('zh-CN')).toBe('zh-Hans');
    for (const locale of INTERFACE_LOCALES) expect(legacyNativeLocale(locale)).toBe(locale);
    for (const value of ['auto','de','fr-FR','zh-TW',{locale:'fr'},null]) expect(legacyNativeLocale(value)).toBeUndefined();
  });
  it('limits English-only screens to private staff route segments', () => {
    for (const path of ['/admin','/admin/ops','/admin?tab=Content','/organizer/dashboard','/organizer/dashboard/settings','/organizer/events/abc']) expect(isEnglishOnlyInterfacePath(path)).toBe(true);
    for (const path of [null,'/','/administrator','/admin-help','/account','/organizer/login','/organizer/signup','/organizer/events-public']) expect(isEnglishOnlyInterfacePath(path)).toBe(false);
  });
});

describe('typed safe interface messages', () => {
  it('keeps identifiers exact while formatting only numeric values', () => {
    expect(formatMessage(messages,'fr','reference',{code:'001234'}).text).toContain('001234');
    expect(formatMessage(messages,'en','reference',{code:1234.5}).text).toBe('Reference 1,234.5');
    expect(formatMessage(messages,'en','reference',{code:'{count}'}).text).toBe('Reference {count}');
    expect(formatMessage(messages,'en','reference',{code:NaN}).text).not.toContain('NaN');
  });
  it.each([
    ['en',['0 items','1 item','2 items','5 items','21 items','1.5 items']],
    ['sw',['Vipengee 0','Kipengee 1','Vipengee 2','Vipengee 5','Vipengee 21','Vipengee 1.5']],
    ['fr',['0 article','1 article','2 articles','5 articles','21 articles','1,5 article']],
    ['zh-Hans',['0 件商品','1 件商品','2 件商品','5 件商品','21 件商品','1.5 件商品']],
    ['ru',['0 товаров','1 товар','2 товара','5 товаров','21 товар','1,5 товара']],
    ['es',['0 artículos','1 artículo','2 artículos','5 artículos','21 artículos','1,5 artículos']],
  ] as const)('uses %s cardinal plural branches for zero, one, two, five, twenty-one and fractions', (locale, expected) => {
    expect([0,1,2,5,21,1.5].map(count => formatMessage(messages,locale,'items',{count}).text)).toEqual(expected);
  });
  it('selects other when a plural branch is absent', () => {
    const partial = structuredClone(messages) as Catalogue<string>;
    Object.assign(partial.ru,{items:{other:'{count} fallback'}});
    expect(selectMessageTemplate(partial,'ru','items',2)).toEqual({template:'{count} fallback',lang:'ru',fallback:false});
    expect(selectMessageTemplate(messages,'en','items')).toEqual({template:'{count} items',lang:'en',fallback:false});
  });
  it('falls back to English with language metadata and never exposes raw missing keys', () => {
    const partial = structuredClone(messages);
    Reflect.deleteProperty(partial.fr,'reference');
    expect(formatMessage(partial,'fr','reference',{code:'001234'})).toEqual({text:'Reference 001234',lang:'en',fallback:true});
    expect(formatMessage(partial as Catalogue<string>,'fr','missing.key')).toEqual({text:'',lang:'en',fallback:true});
    expect(formatMessage(partial as Catalogue<string>,'fr','constructor').text).toBe('');
  });
  it('renders interpolation as escaped React text without creating HTML elements', () => {
    const attack = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const result = formatMessage(messages,'en','reference',{code:attack});
    expect(result.text).toBe(`Reference ${attack}`);
    const html = renderToStaticMarkup(createElement('span',{lang:result.lang},result.text));
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toMatch(/<(?:img|script)\b/);
  });
  it('checks exact English keys and placeholder parity in every locale and plural branch', () => {
    expect(catalogueProblems(messages)).toEqual([]);
    const missing = structuredClone(messages);
    Reflect.deleteProperty(missing.fr,'reference');
    expect(catalogueProblems(missing).join(' ')).toMatch(/fr.*reference/);
    const changed = structuredClone(messages);
    Object.assign(changed.fr,{reference:'Référence {id}'});
    expect(catalogueProblems(changed).join(' ')).toMatch(/fr.*reference/);
    const plural = structuredClone(messages);
    Object.assign(plural.ru,{items:{one:'{count} товар',few:'{quantity} товара',other:'{count} товара'}});
    expect(catalogueProblems(plural).join(' ')).toMatch(/ru.*items.*few/);
    const extra = structuredClone(messages);
    Object.assign(extra.es,{unexpected:'Extra'});
    expect(catalogueProblems(extra).join(' ')).toMatch(/es.*unexpected/);
    const noOther = structuredClone(messages);
    Object.assign(noOther.en,{items:{one:'{count} item'}});
    expect(catalogueProblems(noOther).join(' ')).toMatch(/en.*items.*other/);
  });
});
