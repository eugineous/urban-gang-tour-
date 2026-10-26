'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';

import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {formatCalendarDay,formatKes} from '@/lib/i18n/format';
import type {InterfaceLocale} from '@/lib/i18n/locale';
import {useState} from 'react';
import Link from './DocumentLink';
import {normalizePosterUrl, partnerAdmission, posterUrl, publicPartnerDetails} from '../../lib/partner-events';
import {ownedEventPresentation, type OwnedEvent} from '../lib/owned-event-presentation';
import styles from './EventPosterCard.module.css';

const text=(value:unknown) => typeof value==='string' ? value.trim() : '';

export function eventDateBadge(event:OwnedEvent, now:number,locale:InterfaceLocale='en') {
  const view=ownedEventPresentation(event, now);
  if (!view.dateTime) return null;
  const date=new Date(view.dateTime+'T12:00:00+03:00');
  return {
    dateTime:view.dateTime,
    day:new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{day:'numeric',timeZone:'Africa/Nairobi'}).format(date),
    month:new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{month:'short',timeZone:'Africa/Nairobi'}).format(date),
    weekday:new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{weekday:'short',timeZone:'Africa/Nairobi'}).format(date),
  };
}

/** Never turn missing inventory, an unknown admission type, or an old date into a free ticket. */
export function eventCardPrice(event:OwnedEvent, now:number, availabilityCurrent=true) {
  const view=ownedEventPresentation(event, now);
  if (view.past || !['published','ongoing'].includes(text(event.status))) return view.label;
  if (event.kind==='partner') {
    const details=publicPartnerDetails(event.partnerDetails);
    return details ? partnerAdmission(details) : 'Entry details to be confirmed';
  }
  if (event.kind==='school') return 'School tour stop';
  if (!availabilityCurrent) return 'Check latest availability';
  if (view.sellable && Array.isArray(event.tiers)) {
    const prices=event.tiers.filter((tier:unknown):tier is Record<string,unknown> => !!tier && typeof tier==='object' && !Array.isArray(tier))
      .filter(tier => tier.sellable===true && typeof tier.price==='number' && Number.isFinite(tier.price) && tier.price>=0)
      .map(tier => tier.price as number);
    if (prices.length) {
      const min=Math.min(...prices);
      return min===0 ? 'Free tickets' : 'from KES '+min.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2});
    }
  }
  return view.sellable ? 'View ticket options' : view.label;
}

export function EventPosterCard({event, now, availabilityCurrent=true, featured=false}:{event:OwnedEvent;now:number;availabilityCurrent?:boolean;featured?:boolean}) {
  const {locale}=useInterfaceLanguage(),t=useMessages(discoveryMessages);
  const view=ownedEventPresentation(event, now);
  const image=normalizePosterUrl(text(event.image));
  const [failedImage, setFailedImage]=useState('');
  const hasImage=Boolean(image && posterUrl(image) && failedImage!==image);
  const date=eventDateBadge(event, now,locale);
  const name=text(event.name);
  const statusMessage=eventStatusMessage(event,now);
  const partner=event.kind==='partner'?publicPartnerDetails(event.partnerDetails):null;
  const prices=Array.isArray(event.tiers)?event.tiers.filter((tier:unknown):tier is Record<string,unknown>=>!!tier&&typeof tier==='object'&&!Array.isArray(tier)).filter(tier=>tier.sellable===true&&typeof tier.price==='number'&&Number.isFinite(tier.price)&&tier.price>=0).map(tier=>tier.price as number):[];
  const price=view.past||!['published','ongoing'].includes(text(event.status))?t(statusMessage):event.kind==='partner'?t(partner?admissionMessage[partner.admission]:'card.entry'):view.school?t('status.school'):!availabilityCurrent?t('card.check'):view.sellable&&prices.length?(Math.min(...prices)===0?t('card.free'):t('card.from',{amount:formatKes(Math.min(...prices),locale)!})):t(view.sellable?'card.ticketOptions':statusMessage);
  const action=!availabilityCurrent?'card.latest':!/^\/events\//.test(view.href)?view.school?'action.school':'action.ask':view.sellable?'action.tickets':'action.details';
  const label=t(!availabilityCurrent&&view.sellable?'card.check':statusMessage);
  const venue=[text(event.venue),text(event.city)].filter((value,index,values) => !!value && values.indexOf(value)===index).join(', ');
  return <Link href={view.href} className={styles.card} data-featured={featured || undefined} data-has-artwork={hasImage} aria-label={name+' — '+t(action)}>
    {hasImage && <img className={styles.poster} src={image} alt={t('card.image',{name})} loading={featured?'eager':'lazy'} decoding="async" onError={() => setFailedImage(image)}/>}
    <div className={styles.content}>
      <div className={styles.top}>
        {date ? <time className={styles.dateBadge} dateTime={date.dateTime} aria-label={formatCalendarDay(date.dateTime,locale)||undefined}><span>{date.day}</span><strong>{date.month}</strong><small>{date.weekday}</small></time> : <span className={styles.unconfirmedDate}>{t('date.follow')}</span>}
        <h3 title={name} lang="en-KE">{name}</h3>
      </div>
      {!hasImage && <p className={styles.artworkState}>{t(image?'card.artworkUnavailable':'card.artworkFollow')}</p>}
      <div className={styles.bottom}><p className={styles.venue}>{venue?<span lang="en-KE">{venue}</span>:t('card.venue')}</p><p className={styles.price}>{price}</p>{price!==label && <small className={styles.status}>{label}</small>}</div>
    </div>
  </Link>;
}

export const admissionMessage={free:'admission.free',invitation:'admission.invitation',unconfirmed:'card.entry',external:'admission.external'} as const;
/** Finite semantic display binding. Authored records are never lookup keys. */
export function eventStatusMessage(event:OwnedEvent,now:number):keyof typeof discoveryMessages.en {
 const view=ownedEventPresentation(event,now),status=String(event.status);
 if(status==='published'){
  const partner=event.kind==='partner'?publicPartnerDetails(event.partnerDetails):null;
  if(partner&&!view.past)return admissionMessage[partner.admission];
  if(view.past)return view.dateTime&&Date.parse(view.dateTime+'T23:59:59+03:00')<now?'status.datePassed':'status.previousWork';
  return view.school?'status.school':view.sellable?'status.onSale':'status.published';
 }
 if(status==='completed')return view.school?'status.completedSchool':'status.completed';
 const keys={announced:'status.announced',ongoing:'status.ongoing',sales_paused:'status.sales_paused',sold_out:'status.sold_out',postponed:'status.postponed',rescheduled:'status.rescheduled'} as const;
 return keys[status as keyof typeof keys]||'status.update';
}
export function EventStatus({event,now}:{event:OwnedEvent;now:number}){return <MessageText catalogue={discoveryMessages} message={eventStatusMessage(event,now)}/>}
