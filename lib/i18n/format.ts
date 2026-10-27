import {publicationInstant} from '../editorial-time';
import type {InterfaceLocale} from './locale';

const FORMAT_LOCALES: Readonly<Record<InterfaceLocale,string>> = {
  en:'en-KE', sw:'sw-KE', fr:'fr-FR', 'zh-Hans':'zh-Hans-CN', ru:'ru-RU', es:'es-ES',
};

/** Accept a region subtag only, so hints cannot replace the chosen language. */
function formatLocale(locale:InterfaceLocale,region?:string):string {
  if (typeof region === 'string' && /^(?:[a-z]{2}|\d{3})$/i.test(region)) {
    const candidate = `${locale}-${region.toUpperCase()}`;
    if (Intl.NumberFormat.supportedLocalesOf([candidate]).length) return candidate;
  }
  return FORMAT_LOCALES[locale];
}

export function formatInterfaceNumber(value:number,locale:InterfaceLocale,region?:string):string|null {
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat(formatLocale(locale,region),{maximumFractionDigits:2}).format(value);
}

export function formatKes(value:number,locale:InterfaceLocale,region?:string):string|null {
  const parts = formatInterfaceNumber(value,locale,region);
  return parts === null ? null : `KES ${parts}`;
}

function validCalendarDay(day:string):boolean {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  try {
    publicationInstant(day);
    return true;
  } catch {
    return false;
  }
}

export function formatCalendarDay(day:string,locale:InterfaceLocale,style:'short'|'long' = 'short'):string|null {
  if (!validCalendarDay(day)) return null;
  // A validated noon in the venue zone keeps a calendar day independent of TZ.
  const noon = new Date(`${day}T12:00:00+03:00`);
  return new Intl.DateTimeFormat(formatLocale(locale),{
    year:'numeric', month:style === 'long' ? 'long' : 'short', day:'numeric', timeZone:'Africa/Nairobi',
  }).format(noon);
}

export function formatNairobiTime(instant:string,locale:InterfaceLocale):string|null {
  if (typeof instant !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(instant);
  if (!match || !validCalendarDay(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59 || Number(match[6] ?? 0) > 23 || Number(match[7] ?? 0) > 59) return null;
  const date = publicationInstant(instant);
  return new Intl.DateTimeFormat(formatLocale(locale),{
    hour:'numeric',minute:'2-digit',timeZone:'Africa/Nairobi',timeZoneName:'short',
  }).format(date);
}
