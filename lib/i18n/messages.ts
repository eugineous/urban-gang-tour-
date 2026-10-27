import {formatInterfaceNumber} from './format';
import {INTERFACE_LOCALES, type InterfaceLocale} from './locale';

export type Message = string | Readonly<Partial<Record<Intl.LDMLPluralRule,string>> & {other:string}>;
export type Catalogue<K extends string> = Readonly<Record<InterfaceLocale,Readonly<Record<K,Message>>>>;
export type MessageValues = Readonly<Record<string,string|number>>;
export type FormattedMessage = {text:string;lang:InterfaceLocale;fallback:boolean};

export function defineCatalogue<const E extends Record<string,Message>>(
  value:{en:E}&Record<Exclude<InterfaceLocale,'en'>,Readonly<Record<keyof E,Message>>>
):Catalogue<Extract<keyof E,string>> {
  return value;
}

const own = (value:object,key:string):boolean => Object.prototype.hasOwnProperty.call(value,key);
const placeholders = (template:string):string[] => [...new Set(Array.from(
  template.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g),match => match[1],
))].sort();

function templateFor(message:Message|undefined,locale:InterfaceLocale,count?:number):string|undefined {
  if (typeof message === 'string') return message;
  if (!message || typeof message !== 'object') return undefined;
  const branch = typeof count === 'number' && Number.isFinite(count)
    ? new Intl.PluralRules(locale).select(count) : 'other';
  const selected = own(message,branch) ? message[branch] : undefined;
  return typeof selected === 'string' ? selected : typeof message.other === 'string' && own(message,'other') ? message.other : undefined;
}

export function selectMessageTemplate<K extends string>(
  catalogue:Catalogue<K>,locale:InterfaceLocale,key:K,count?:number,
):{template:string;lang:InterfaceLocale;fallback:boolean} {
  const local = catalogue[locale];
  const template = local && own(local,key) ? templateFor(local[key],locale,count) : undefined;
  if (template !== undefined) return {template,lang:locale,fallback:false};
  const english = catalogue.en;
  return {
    template:english && own(english,key) ? templateFor(english[key],'en',count) ?? '' : '',
    lang:'en',fallback:true,
  };
}

/** Returns plain text. React consumers render this as text, never as HTML. */
export function formatMessage<K extends string>(
  catalogue:Catalogue<K>,locale:InterfaceLocale,key:K,values:MessageValues = {},
):FormattedMessage {
  const count = own(values,'count') && typeof values.count === 'number' ? values.count : undefined;
  const selected = selectMessageTemplate(catalogue,locale,key,count);
  const text = selected.template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g,(_token,name:string) => {
    const value = own(values,name) ? values[name] : undefined;
    return typeof value === 'number' ? formatInterfaceNumber(value,locale) ?? '' : typeof value === 'string' ? value : '';
  });
  return {text,lang:selected.lang,fallback:selected.fallback};
}

export function catalogueProblems(catalogue:Catalogue<string>):string[] {
  const problems:string[] = [];
  const keys = Object.keys(catalogue.en);
  const pluralBranches = new Set(['zero','one','two','few','many','other']);
  for (const locale of INTERFACE_LOCALES) {
    const local = catalogue[locale];
    for (const key of Object.keys(local ?? {})) {
      if (!own(catalogue.en,key)) problems.push(`${locale}.${key}: unexpected key`);
    }
    for (const key of keys) {
      if (!local || !own(local,key)) {
        problems.push(`${locale}.${key}: missing key`);
        continue;
      }
      const source = catalogue.en[key];
      const sourceTemplates = typeof source === 'string' ? [source] : Object.values(source);
      const expected = [...new Set(sourceTemplates.filter((value):value is string => typeof value === 'string').flatMap(placeholders))].sort().join(',');
      const message = local[key];
      if (typeof message === 'string') {
        if (placeholders(message).join(',') !== expected) problems.push(`${locale}.${key}: placeholder mismatch`);
        continue;
      }
      if (!message || typeof message !== 'object' || !own(message,'other') || typeof message.other !== 'string') {
        problems.push(`${locale}.${key}.other: missing plural fallback`);
      }
      for (const [branch,template] of Object.entries(message ?? {})) {
        if (!pluralBranches.has(branch)) problems.push(`${locale}.${key}.${branch}: invalid plural branch`);
        if (typeof template !== 'string' || placeholders(template).join(',') !== expected) problems.push(`${locale}.${key}.${branch}: placeholder mismatch`);
      }
    }
  }
  return problems;
}
