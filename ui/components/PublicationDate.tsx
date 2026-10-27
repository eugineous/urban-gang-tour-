'use client';
import type {HTMLAttributes,ReactNode} from 'react';
import {publicationDate} from '@/lib/shared/publication-date';
import {formatCalendarDay,formatKes} from '@/lib/i18n/format';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';

export function PublicationDate({value,long=false}: {value:unknown;long?:boolean}) {
  const {locale}=useInterfaceLanguage(),t=useMessages(discoveryMessages);
  const date=publicationDate(value);
  if(!date)return <span>{t('date.unavailable')}</span>;
  // Validation stays in publicationDate; editorial instants retain Nairobi's day.
  const label=date.dateTime.length===10?formatCalendarDay(date.dateTime,locale,long?'long':'short'):new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{day:'numeric',month:long?'long':'short',year:'numeric',timeZone:'Africa/Nairobi'}).format(new Date(date.dateTime));
  return <time dateTime={date.dateTime}>{label}</time>;
}

export function EventDay({day,postponed=false,fallback,long=false}:{day?:string|null;postponed?:boolean;fallback?:string;long?:boolean}){
 const {locale}=useInterfaceLanguage(),t=useMessages(discoveryMessages);
 if(postponed)return <span>{t('date.newUnconfirmed')}</span>;
 const label=day?formatCalendarDay(day,locale,long?'long':'short'):null;
 return label?<time dateTime={day!}>{label}</time>:<span lang={fallback?'en-KE':undefined}>{fallback||t('date.unconfirmed')}</span>;
}

/** A small client label leaf around server-composed, original content. */
export function DiscoveryRegion({as:Tag='section',message,children,...props}:{as?:'section'|'nav';message:keyof typeof discoveryMessages.en;children:ReactNode}&HTMLAttributes<HTMLElement>){
 const t=useMessages(discoveryMessages);
 return <Tag {...props} aria-label={t(message)}>{children}</Tag>;
}

export function EventAmount({value,from=false}:{value:number;from?:boolean}){
 const {locale}=useInterfaceLanguage(),t=useMessages(discoveryMessages),amount=formatKes(value,locale);
 return <>{amount&&(from?t('card.from',{amount}):amount)}</>;
}
