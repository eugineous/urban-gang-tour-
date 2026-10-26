'use client';

import {createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {createLanguagePreferenceStore, type LanguageSnapshot} from '../../lib/client/interface-language';
import {isEnglishOnlyInterfacePath, type InterfaceLocale} from '../../lib/i18n/locale';
import {formatMessage, type Catalogue, type MessageValues} from '../../lib/i18n/messages';

type InterfaceLanguage = {
  locale:InterfaceLocale;
  preferredLocale:InterfaceLocale;
  persistence:LanguageSnapshot['persistence'];
  setLocale:(locale:InterfaceLocale) => void;
  reset:() => void;
};
const LanguageContext = createContext<InterfaceLanguage>({
  locale:'en',preferredLocale:'en',persistence:'unchecked',setLocale:() => {},reset:() => {},
});

export function LanguageProvider({children}:{children:ReactNode}) {
  const [store] = useState(() => createLanguagePreferenceStore({
    storage:() => typeof window === 'undefined' ? null : window.localStorage,
    events:typeof window === 'undefined' ? new EventTarget() : window,
  }));
  const path = usePathname();
  const snapshot = useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
  const locale = isEnglishOnlyInterfacePath(path) ? 'en' : snapshot.locale;

  useEffect(() => {
    store.start();
    return store.stop;
  },[store]);
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en-KE' : locale;
  },[locale]);

  return <LanguageContext.Provider value={{locale,preferredLocale:snapshot.locale,persistence:snapshot.persistence,setLocale:store.setLocale,reset:store.reset}}>{children}</LanguageContext.Provider>;
}

export function useInterfaceLanguage():InterfaceLanguage {
  return useContext(LanguageContext);
}

export function useMessages<K extends string>(catalogue:Catalogue<K>):(key:K,values?:MessageValues) => string {
  const {locale} = useInterfaceLanguage();
  return (key,values) => formatMessage(catalogue,locale,key,values).text;
}
