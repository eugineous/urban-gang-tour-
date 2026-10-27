/** Interface choices are explicit; browser preferences never select a language. */
export const INTERFACE_LOCALES = ['en','sw','fr','zh-Hans','ru','es'] as const;
export type InterfaceLocale = typeof INTERFACE_LOCALES[number];

export const NATIVE_NAMES: Readonly<Record<InterfaceLocale,string>> = {
  en:'English', sw:'Kiswahili', fr:'Français', 'zh-Hans':'简体中文', ru:'Русский', es:'Español',
};

export function nativeLocale(value:unknown):InterfaceLocale|undefined {
  return typeof value === 'string'
    ? INTERFACE_LOCALES.find(locale => locale === value)
    : undefined;
}

export function legacyNativeLocale(value:unknown):InterfaceLocale|undefined {
  return value === 'zh-CN' ? 'zh-Hans' : nativeLocale(value);
}

export function isEnglishOnlyInterfacePath(path:string|null):boolean {
  const pathname = path?.split(/[?#]/,1)[0];
  return pathname !== undefined && ['/admin','/organizer/dashboard','/organizer/events']
    .some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
