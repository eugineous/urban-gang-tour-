import {legacyNativeLocale, nativeLocale, type InterfaceLocale} from '../i18n/locale';

export type LanguageSnapshot = Readonly<{
  locale:InterfaceLocale;
  persistence:'unchecked'|'available'|'unavailable';
}>;
export type StorageLike = Pick<Storage,'getItem'|'setItem'>;
export interface LanguagePreferenceStore {
  getSnapshot():LanguageSnapshot;
  getServerSnapshot():LanguageSnapshot;
  subscribe(listener:() => void):() => void;
  start():void;
  stop():void;
  setLocale(locale:InterfaceLocale):void;
  reset():void;
}

const PREFERENCE = 'ugt-interface-language-v1';
const MIGRATED = 'ugt-interface-language-migrated-v1';
const LEGACY = 'ugt-language-choice';
const SERVER_SNAPSHOT:LanguageSnapshot = Object.freeze({locale:'en',persistence:'unchecked'});

/** Browser access is injected and deferred until start or an explicit choice. */
export function createLanguagePreferenceStore(options:{
  storage:() => StorageLike|null;
  events:EventTarget;
}):LanguagePreferenceStore {
  let snapshot = SERVER_SNAPSHOT;
  let started = false;
  let migrationAttempted = false;
  let pendingChoice = false;
  const listeners = new Set<() => void>();

  const update = (locale:InterfaceLocale,persistence:LanguageSnapshot['persistence']) => {
    if (snapshot.locale === locale && snapshot.persistence === persistence) return;
    snapshot = Object.freeze({locale,persistence});
    for (const listener of listeners) listener();
  };

  const load = (migrate:boolean) => {
    let locale = snapshot.locale;
    try {
      const storage = options.storage();
      if (!storage) throw new Error('Language preference storage unavailable');
      const saved = storage.getItem(PREFERENCE);
      locale = nativeLocale(saved) ?? 'en';
      if (migrate && storage.getItem(MIGRATED) === null) {
        // A failed or partial preference write must leave a durable tombstone.
        // Never read/import legacy unless this write has completed successfully.
        storage.setItem(MIGRATED,'1');
        if (saved === null) {
          const legacy = legacyNativeLocale(storage.getItem(LEGACY));
          if (legacy) {
            locale = legacy;
            storage.setItem(PREFERENCE,legacy);
          }
        }
      }
      pendingChoice = false;
      update(locale,'available');
    } catch {
      update(locale,'unavailable');
    }
  };

  const onStorage = (event:Event) => {
    const key = (event as StorageEvent).key;
    if (key === PREFERENCE || key === null) load(false);
  };

  const setLocale = (locale:InterfaceLocale) => {
    if (!nativeLocale(locale)) return;
    pendingChoice = true;
    migrationAttempted = true;
    // Notify first so unavailable storage never blocks the current choice.
    update(locale,snapshot.persistence);
    try {
      const storage = options.storage();
      if (!storage) throw new Error('Language preference storage unavailable');
      storage.setItem(MIGRATED,'1');
      storage.setItem(PREFERENCE,locale);
      // Writes alone cannot promise the choice can be restored on reload.
      if (storage.getItem(PREFERENCE) !== locale) throw new Error('Language preference could not be read back');
      pendingChoice = false;
      update(locale,'available');
    } catch {
      update(locale,'unavailable');
    }
  };

  return {
    getSnapshot:() => snapshot,
    getServerSnapshot:() => SERVER_SNAPSHOT,
    subscribe:(listener) => {listeners.add(listener);return () => {listeners.delete(listener);};},
    start:() => {
      if (started) return;
      started = true;
      options.events.addEventListener('storage',onStorage);
      const migrate = !migrationAttempted;
      migrationAttempted = true;
      if (!pendingChoice) load(migrate);
    },
    stop:() => {
      if (!started) return;
      started = false;
      options.events.removeEventListener('storage',onStorage);
    },
    setLocale,
    reset:() => setLocale('en'),
  };
}
