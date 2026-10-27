import {describe, expect, it} from 'vitest';
import {createLanguagePreferenceStore, type StorageLike} from '@/lib/client/interface-language';

const preference = 'ugt-interface-language-v1';
const marker = 'ugt-interface-language-migrated-v1';
const legacy = 'ugt-language-choice';

function fixture(initial:Record<string,string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes:string[] = [];
  const memory = {
    getItem:(key:string) => values.get(key) ?? null,
    setItem:(key:string,value:string) => {writes.push(key);values.set(key,value);},
    removeItem:(key:string) => {values.delete(key);},
  };
  const events = new EventTarget();
  const store = createLanguagePreferenceStore({storage:() => memory,events});
  const external = (key:string|null) => events.dispatchEvent(Object.assign(new Event('storage'),{key}));
  return {values,writes,memory,events,store,external};
}

describe('English-first observable language preference', () => {
  it('initializes without accessing storage and exposes one immutable stable English server snapshot', () => {
    let reads = 0;
    const store = createLanguagePreferenceStore({storage:() => {reads++;throw Error('blocked');},events:new EventTarget()});
    expect(reads).toBe(0);
    const server = store.getServerSnapshot();
    expect(server).toEqual({locale:'en',persistence:'unchecked'});
    expect(Object.isFrozen(server)).toBe(true);
    expect(store.getSnapshot()).toBe(server);
    expect(store.getServerSnapshot()).toBe(server);
    store.start();
    store.setLocale('ru');
    expect(store.getSnapshot()).toEqual({locale:'ru',persistence:'unavailable'});
    expect(store.getServerSnapshot()).toBe(server);
    store.stop();
  });

  it('migrates once, observes removal, resets explicitly to English and never resurrects retained French', () => {
    const {store,memory,events,writes,external} = fixture({[legacy]:'fr'});
    const changes:string[] = [];
    const unsubscribe = store.subscribe(() => changes.push(store.getSnapshot().locale));
    store.start();
    expect(store.getSnapshot()).toEqual({locale:'fr',persistence:'available'});
    expect(changes).toEqual(['fr']);
    expect(writes.slice(0,2)).toEqual([marker,preference]);
    expect(memory.getItem(legacy)).toBe('fr');
    memory.removeItem(preference);
    external(preference);
    expect(store.getSnapshot().locale).toBe('en');
    expect(changes).toEqual(['fr','en']);
    store.setLocale('ru');
    expect(changes).toEqual(['fr','en','ru']);
    expect(store.getServerSnapshot().locale).toBe('en');
    store.reset();
    expect(changes).toEqual(['fr','en','ru','en']);
    expect(memory.getItem(preference)).toBe('en');
    store.stop();
    const next = createLanguagePreferenceStore({storage:() => memory,events});
    next.start();
    expect(next.getSnapshot().locale).toBe('en');
    memory.removeItem(preference);
    external(preference);
    expect(next.getSnapshot().locale).toBe('en');
    unsubscribe();
    next.stop();
  });

  it.each(['en','sw','fr','zh-Hans','ru','es'])('loads the exact native choice %s', locale => {
    const {store} = fixture({[preference]:locale,[legacy]:'fr'});
    store.start();
    expect(store.getSnapshot()).toEqual({locale,persistence:'available'});
    store.stop();
  });

  it.each(['auto','de','fr-FR','zh-CN','__proto__',''])('rejects invalid native choice %j without falling through to legacy', locale => {
    const {store} = fixture({[preference]:locale,[legacy]:'fr'});
    store.start();
    expect(store.getSnapshot().locale).toBe('en');
    store.stop();
  });

  it.each([['zh-CN','zh-Hans'],['auto','en'],['fr-FR','en']])('normalizes only supported explicit legacy %s', (saved,expected) => {
    const {store,memory} = fixture({[legacy]:saved});
    store.start();
    expect(store.getSnapshot().locale).toBe(expected);
    expect(memory.getItem(legacy)).toBe(saved);
    store.stop();
  });

  it('uses marker-only completion and never retries legacy on another store', () => {
    const f = fixture({[legacy]:'fr'});
    const storage:StorageLike = {...f.memory,setItem:(key,value) => {
      if (key === preference) throw Error('preference blocked');
      f.memory.setItem(key,value);
    }};
    const store = createLanguagePreferenceStore({storage:() => storage,events:f.events});
    store.start();
    expect(store.getSnapshot()).toEqual({locale:'fr',persistence:'unavailable'});
    expect(f.memory.getItem(marker)).not.toBeNull();
    store.stop();
    const next = createLanguagePreferenceStore({storage:() => f.memory,events:f.events});
    next.start();
    expect(next.getSnapshot().locale).toBe('en');
    next.stop();
  });

  it('does not import or write legacy when the marker cannot be persisted', () => {
    const f = fixture({[legacy]:'fr'});
    const store = createLanguagePreferenceStore({storage:() => ({...f.memory,setItem:() => {throw Error('blocked');}}),events:f.events});
    store.start();
    expect(store.getSnapshot()).toEqual({locale:'en',persistence:'unavailable'});
    expect(f.memory.getItem(preference)).toBeNull();
    store.setLocale('es');
    expect(store.getSnapshot()).toEqual({locale:'es',persistence:'unavailable'});
    store.stop();
  });

  it('does not import after a marker write stores data and then throws', () => {
    const f = fixture({[legacy]:'fr'});
    const store = createLanguagePreferenceStore({storage:() => ({...f.memory,setItem:(key,value) => {f.memory.setItem(key,value);throw Error('partial');}}),events:f.events});
    store.start();
    expect(store.getSnapshot()).toEqual({locale:'en',persistence:'unavailable'});
    store.stop();
    const next = createLanguagePreferenceStore({storage:() => f.memory,events:f.events});
    next.start();
    expect(next.getSnapshot().locale).toBe('en');
    next.stop();
  });

  it('cannot reimport after a partial preference write and external removal', () => {
    const f = fixture({[legacy]:'fr'});
    const store = createLanguagePreferenceStore({storage:() => ({...f.memory,setItem:(key,value) => {
      f.memory.setItem(key,value);
      if (key === preference) throw Error('partial');
    }}),events:f.events});
    store.start();
    expect(store.getSnapshot().persistence).toBe('unavailable');
    f.memory.removeItem(preference);
    f.external(preference);
    expect(store.getSnapshot().locale).toBe('en');
    store.stop();
    const next = createLanguagePreferenceStore({storage:() => f.memory,events:f.events});
    next.start();
    expect(next.getSnapshot().locale).toBe('en');
    next.stop();
  });

  it.each(['storage','getItem','setItem'] as const)('keeps manual choices usable with throwing %s getters', target => {
    const broken = {
      get getItem() {if (target === 'getItem') throw Error('read getter');return () => null;},
      get setItem() {if (target === 'setItem') throw Error('write getter');return () => {};},
    };
    const store = createLanguagePreferenceStore({storage:() => {if (target === 'storage') throw Error('storage getter');return broken;},events:new EventTarget()});
    store.start();
    expect(store.getSnapshot().persistence).toBe('unavailable');
    store.setLocale('sw');
    expect(store.getSnapshot()).toEqual({locale:'sw',persistence:'unavailable'});
    store.reset();
    expect(store.getSnapshot().locale).toBe('en');
    store.stop();
  });

  it('reports unavailable null storage, notifies before persistence and ignores invalid runtime setters', () => {
    let observed = '';
    const f = fixture();
    const store = createLanguagePreferenceStore({storage:() => ({...f.memory,setItem:(key,value) => {
      if (key === preference) expect(observed).toBe('ru');
      f.memory.setItem(key,value);
    }}),events:f.events});
    store.start();
    store.subscribe(() => {observed = store.getSnapshot().locale;});
    store.setLocale('ru');
    expect(f.memory.getItem(preference)).toBe('ru');
    store.setLocale('de' as 'ru');
    expect(store.getSnapshot().locale).toBe('ru');
    store.stop();
    const unavailable = createLanguagePreferenceStore({storage:() => null,events:new EventTarget()});
    unavailable.start();
    unavailable.setLocale('fr');
    expect(unavailable.getSnapshot()).toEqual({locale:'fr',persistence:'unavailable'});
    unavailable.stop();
  });

  it('handles clear and relevant events without reimporting, ignores browser languages and unrelated keys', () => {
    const f = fixture({[legacy]:'fr'});
    let changes = 0;
    f.store.subscribe(() => changes++);
    f.store.start();
    f.memory.setItem(preference,'es');
    f.external('other');
    f.events.dispatchEvent(new Event('languagechange'));
    expect(f.store.getSnapshot().locale).toBe('fr');
    f.external(preference);
    expect(f.store.getSnapshot().locale).toBe('es');
    f.values.clear();
    f.external(null);
    expect(f.store.getSnapshot().locale).toBe('en');
    f.memory.setItem(legacy,'ru');
    f.external(legacy);
    expect(f.store.getSnapshot().locale).toBe('en');
    expect(changes).toBe(3);
    f.store.stop();
    f.store.start();
    expect(f.store.getSnapshot().locale).toBe('en');
    f.store.stop();
  });

  it('has idempotent start/stop, stable snapshots and removable subscriptions', () => {
    const f = fixture();
    let changes = 0;
    const unsubscribe = f.store.subscribe(() => changes++);
    f.store.start();
    f.store.start();
    expect(changes).toBe(1);
    const snapshot = f.store.getSnapshot();
    f.external(preference);
    expect(f.store.getSnapshot()).toBe(snapshot);
    unsubscribe();
    unsubscribe();
    f.store.setLocale('es');
    expect(changes).toBe(1);
    f.store.stop();
    f.store.stop();
    f.memory.setItem(preference,'ru');
    f.external(preference);
    expect(f.store.getSnapshot().locale).toBe('es');
    f.store.start();
    expect(f.store.getSnapshot().locale).toBe('ru');
    f.store.stop();
  });

  it('preserves an unsaved manual choice through a stop/start lifecycle', () => {
    const f = fixture();
    const store = createLanguagePreferenceStore({storage:() => ({...f.memory,setItem:() => {throw Error('blocked');}}),events:f.events});
    store.start();
    store.setLocale('es');
    store.stop();
    store.start();
    expect(store.getSnapshot()).toEqual({locale:'es',persistence:'unavailable'});
    store.stop();
  });

  it('honors an existing marker without importing legacy after reload', () => {
    const f = fixture({[marker]:'1',[legacy]:'fr'});
    f.store.start();
    expect(f.store.getSnapshot().locale).toBe('en');
    f.store.stop();
    expect(f.writes).toEqual([]);
  });

  it('loads English after a full clear and a fresh store', () => {
    const f = fixture({[legacy]:'fr'});
    f.store.start();
    f.values.clear();
    f.external(null);
    f.store.stop();
    const next = createLanguagePreferenceStore({storage:() => f.memory,events:f.events});
    next.start();
    expect(next.getSnapshot()).toEqual({locale:'en',persistence:'available'});
    next.stop();
  });

  it('does not promise persistence when a successful write cannot be read back', () => {
    const f = fixture();
    let blockReads = false;
    const store = createLanguagePreferenceStore({storage:() => ({
      getItem:(key) => {if (blockReads) throw Error('reads blocked');return f.memory.getItem(key);},
      setItem:f.memory.setItem,
    }),events:f.events});
    store.start();
    blockReads = true;
    store.setLocale('fr');
    expect(f.memory.getItem(preference)).toBe('fr');
    expect(store.getSnapshot()).toEqual({locale:'fr',persistence:'unavailable'});
    store.stop();
    store.start();
    expect(store.getSnapshot()).toEqual({locale:'fr',persistence:'unavailable'});
    store.stop();
    blockReads = false;
    store.setLocale('ru');
    expect(store.getSnapshot()).toEqual({locale:'ru',persistence:'available'});
  });
});
