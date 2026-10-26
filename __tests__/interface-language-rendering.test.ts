import {createElement, type ReactElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {defineCatalogue, type Catalogue} from '@/lib/i18n/messages';
import type {LanguagePreferenceStore} from '@/lib/client/interface-language';
import {LanguageProvider, useInterfaceLanguage, useMessages} from '@/ui/i18n/LanguageProvider';
import {MessageText} from '@/ui/i18n/MessageText';
import {OriginalContent, originalContentMessages} from '@/ui/i18n/OriginalContent';
import {catalogueProblems} from '@/lib/i18n/messages';

const harness = vi.hoisted(() => ({active:false,path:'/',states:[] as unknown[],index:0,effects:[] as Array<() => void|(() => void)>,context:undefined as unknown}));
vi.mock('next/navigation',() => ({usePathname:() => harness.path}));
vi.mock('react',async original => {
  const actual = await original<typeof import('react')>();
  return {...actual,
    useState:(initial:unknown) => {
      if (!harness.active) return actual.useState(initial);
      const index = harness.index++;
      if (!(index in harness.states)) harness.states[index] = typeof initial === 'function' ? initial() : initial;
      return [harness.states[index],() => {}];
    },
    useEffect:(effect:() => void|(() => void)) => {
      if (!harness.active) return actual.useEffect(effect);
      harness.effects.push(effect);
    },
    useSyncExternalStore:(subscribe:LanguagePreferenceStore['subscribe'],getSnapshot:LanguagePreferenceStore['getSnapshot'],getServerSnapshot:LanguagePreferenceStore['getServerSnapshot']) => {
      if (!harness.active) return actual.useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
      return getSnapshot();
    },
    useContext:(context:Parameters<typeof actual.useContext>[0]) => harness.active && harness.context ? harness.context : actual.useContext(context),
  };
});

const messages = defineCatalogue({
  en:{label:'Reference {code}',rich:'Read {link}: {code}',items:{one:'{count} item',other:'{count} items'}},
  sw:{label:'Rejeleo {code}',rich:'Soma {link}: {code}',items:{one:'Kipengee {count}',other:'Vipengee {count}'}},
  fr:{label:'Référence {code}',rich:'Lire {link} : {code}',items:{one:'{count} article',other:'{count} articles'}},
  'zh-Hans':{label:'参考编号 {code}',rich:'阅读 {link}：{code}',items:{other:'{count} 件商品'}},
  ru:{label:'Номер {code}',rich:'Читать {link}: {code}',items:{one:'{count} товар',few:'{count} товара',other:'{count} товара'}},
  es:{label:'Referencia {code}',rich:'Lee {link}: {code}',items:{one:'{count} artículo',other:'{count} artículos'}},
});

type ContextValue = ReturnType<typeof useInterfaceLanguage>;
function renderProvider(children:ReactNode) {
  harness.index = 0;
  return LanguageProvider({children}) as ReactElement<{value:ContextValue;children:ReactNode}>;
}
function useFixtureLocale(locale:ContextValue['locale']) {
  harness.active = true;
  harness.context = {locale,preferredLocale:locale,persistence:'available',setLocale:() => {},reset:() => {}} satisfies ContextValue;
}

beforeEach(() => {
  harness.active = false;harness.path = '/';harness.states = [];harness.index = 0;harness.effects = [];harness.context = undefined;
});
afterEach(() => vi.unstubAllGlobals());

describe('language provider and localized leaf rendering', () => {
  it('provides safe English standalone defaults and stable English server renders', () => {
    function Probe() {
      const language = useInterfaceLanguage();
      const t = useMessages(messages);
      return createElement('p',null,`${language.locale}/${language.preferredLocale}/${language.persistence} ${t('label',{code:'001234'})}`);
    }
    const expected = '<p>en/en/unchecked Reference 001234</p>';
    expect(renderToStaticMarkup(createElement(Probe))).toBe(expected);
    expect(renderToStaticMarkup(createElement(LanguageProvider,null,createElement(Probe)))).toBe(expected);
    expect(renderToStaticMarkup(createElement(LanguageProvider,null,createElement(Probe)))).toBe(expected);
  });

  it('creates one store, retains exact child identities and derives private English without changing preference', () => {
    harness.active = true;
    const form = createElement('form',null,createElement('input',{defaultValue:'My name / 001234'}));
    const first = renderProvider(form);
    const store = harness.states[0] as LanguagePreferenceStore;
    const before = harness.states[0];
    first.props.value.setLocale('fr');
    const french = renderProvider(form);
    expect(harness.states[0]).toBe(before);
    expect(french.props.children).toBe(form);
    expect(french.key).toBeNull();
    expect(french.props.value.locale).toBe('fr');
    expect(store.getServerSnapshot().locale).toBe('en');
    for (const path of ['/admin','/admin/ops','/organizer/dashboard','/organizer/events/abc']) {
      harness.path = path;
      const staff = renderProvider(form);
      expect(staff.props.value.locale).toBe('en');
      expect(staff.props.value.preferredLocale).toBe('fr');
      expect(staff.props.children).toBe(form);
    }
    for (const path of ['/organizer/login','/organizer/signup','/administrator','/account']) {
      harness.path = path;
      expect(renderProvider(form).props.value.locale).toBe('fr');
    }
    french.props.value.reset();
    expect(renderProvider(form).props.value.preferredLocale).toBe('en');
  });

  it('returns localized plain strings for hooks, preserving exact references', () => {
    useFixtureLocale('fr');
    const t = useMessages(messages);
    expect(t('label',{code:'001234'})).toBe('Référence 001234');
    expect(t('items',{count:2})).toBe('2 articles');
  });

  it('starts after mount and returns cleanup that stops external updates', () => {
    harness.active = true;
    const values = new Map([['ugt-interface-language-v1','fr']]);
    const browser = Object.assign(new EventTarget(),{localStorage:{
      getItem:(key:string) => values.get(key) ?? null,
      setItem:(key:string,value:string) => {values.set(key,value);},
    }});
    vi.stubGlobal('window',browser);
    const child = createElement('input',{defaultValue:'001234'});
    expect(renderProvider(child).props.value.locale).toBe('en');
    const store = harness.states[0] as LanguagePreferenceStore;
    let changes = 0;
    const unsubscribe = store.subscribe(() => changes++);
    const cleanup = harness.effects[0]();
    expect(store.getSnapshot().locale).toBe('fr');
    expect(changes).toBe(1);
    values.set('ugt-interface-language-v1','ru');
    browser.dispatchEvent(Object.assign(new Event('storage'),{key:'ugt-interface-language-v1'}));
    expect(store.getSnapshot().locale).toBe('ru');
    expect(changes).toBe(2);
    if (typeof cleanup !== 'function') throw Error('Missing provider cleanup');
    cleanup();
    values.set('ugt-interface-language-v1','es');
    browser.dispatchEvent(Object.assign(new Event('storage'),{key:'ugt-interface-language-v1'}));
    expect(store.getSnapshot().locale).toBe('ru');
    expect(changes).toBe(2);
    unsubscribe();
  });

  it('interpolates React nodes and escaped strings without interpreting HTML or replacement tokens', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const child = createElement('a',{href:'/legal'},'Terms');
    const html = renderToStaticMarkup(createElement(MessageText,{catalogue:messages,message:'rich',values:{link:child,code:malicious}}));
    expect(html).toContain('<a href="/legal">Terms</a>');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    const literal = renderToStaticMarkup(createElement(MessageText,{catalogue:messages,message:'label',values:{code:'{link}'}}));
    expect(literal).toContain('Reference {link}');
  });

  it('uses numeric plural counts and formats numeric tokens in rich messages', () => {
    useFixtureLocale('fr');
    const output = MessageText({catalogue:messages,message:'items',values:{count:1234.5}});
    expect(renderToStaticMarkup(output)).toContain('1 234,5 articles');
  });

  it('declares English fallback language and does not read inherited placeholders', () => {
    useFixtureLocale('fr');
    const partial = structuredClone(messages);
    Reflect.deleteProperty(partial.fr,'label');
    const node = MessageText({catalogue:partial,message:'label',values:{code:'001234'}});
    expect(renderToStaticMarkup(node)).toBe('<span lang="en">Reference 001234</span>');
    const inherited = Object.create({code:'inherited'}) as Readonly<Record<string,ReactNode>>;
    expect(renderToStaticMarkup(MessageText({catalogue:messages,message:'label',values:inherited}))).not.toContain('inherited');
    expect(renderToStaticMarkup(MessageText({catalogue:messages as Catalogue<string>,message:'missing'}))).not.toContain('missing');
  });

  it('preserves original children exactly and keeps original language on only the source wrapper', () => {
    useFixtureLocale('en');
    const input = createElement('input',{defaultValue:'001234 / Customer input'});
    const source = createElement('article',null,'Original title',input);
    const block = OriginalContent({children:source});
    expect(block.type).toBe('div');
    expect(block.props.lang).toBe('en-KE');
    expect(block.props.children).toBe(source);
    expect(renderToStaticMarkup(block)).toBe('<div lang="en-KE"><article>Original title<input value="001234 / Customer input"/></article></div>');
    const inline = OriginalContent({children:source,language:'sw',inline:true});
    expect(inline.type).toBe('span');
    expect(inline.props.lang).toBe('sw');
    expect(inline.props.children).toBe(source);
  });

  it('keeps the native disclosure outside the source block with its own language and inline semantics', () => {
    useFixtureLocale('fr');
    const source = createElement('em',null,'Original English legal body');
    const html = renderToStaticMarkup(OriginalContent({children:source,disclose:true}));
    expect(html).toMatch(/lang="fr"/);
    expect(html).toContain('<div lang="en-KE"><em>Original English legal body</em></div>');
    expect(html).not.toMatch(/<div lang="en-KE">[^<]*<[^>]+lang="fr"/);
    const inline = renderToStaticMarkup(OriginalContent({children:'001234',language:'en',disclose:true,inline:true}));
    expect(inline).not.toMatch(/<(div|p)\b/);
    expect(inline).toContain('<span lang="en">001234</span>');
    expect(catalogueProblems(originalContentMessages)).toEqual([]);
  });
});
