'use client';

import {useState} from 'react';
import Link from './DocumentLink';
import {normalizePosterUrl, partnerAdmission, posterUrl, publicPartnerDetails} from '../../lib/partner-events';
import {ownedEventPresentation, type OwnedEvent} from '../lib/owned-event-presentation';
import styles from './EventPosterCard.module.css';

const text=(value:unknown) => typeof value==='string' ? value.trim() : '';

export function eventDateBadge(event:OwnedEvent, now:number) {
  const view=ownedEventPresentation(event, now);
  if (!view.dateTime) return null;
  const date=new Date(view.dateTime+'T12:00:00+03:00');
  return {
    dateTime:view.dateTime,
    day:new Intl.DateTimeFormat('en-KE',{day:'numeric',timeZone:'Africa/Nairobi'}).format(date),
    month:new Intl.DateTimeFormat('en-KE',{month:'short',timeZone:'Africa/Nairobi'}).format(date),
    weekday:new Intl.DateTimeFormat('en-KE',{weekday:'short',timeZone:'Africa/Nairobi'}).format(date),
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
  const view=ownedEventPresentation(event, now);
  const image=normalizePosterUrl(text(event.image));
  const [failedImage, setFailedImage]=useState('');
  const hasImage=Boolean(image && posterUrl(image) && failedImage!==image);
  const date=eventDateBadge(event, now);
  const name=text(event.name);
  const price=eventCardPrice(event, now, availabilityCurrent);
  const label=!availabilityCurrent && view.sellable ? 'Check latest availability' : view.label;
  const venue=[text(event.venue),text(event.city)].filter((value,index,values) => !!value && values.indexOf(value)===index).join(', ') || 'Venue to be confirmed';
  return <Link href={view.href} className={styles.card} data-featured={featured || undefined} data-has-artwork={hasImage} aria-label={name+' — '+(availabilityCurrent ? view.action : 'View latest event details')}>
    {hasImage && <img className={styles.poster} src={image} alt={'Event image: '+name} loading={featured?'eager':'lazy'} decoding="async" onError={() => setFailedImage(image)}/>}
    <div className={styles.content}>
      <div className={styles.top}>
        {date ? <time className={styles.dateBadge} dateTime={date.dateTime} aria-label={view.dateLabel}><span>{date.day}</span><strong>{date.month}</strong><small>{date.weekday}</small></time> : <span className={styles.unconfirmedDate}>Date<br/>to follow</span>}
        <h3 title={name}>{name}</h3>
      </div>
      {!hasImage && <p className={styles.artworkState}>Artwork {image?'unavailable':'to follow'}</p>}
      <div className={styles.bottom}><p className={styles.venue}>{venue}</p><p className={styles.price}>{price}</p>{price!==label && <small className={styles.status}>{label}</small>}</div>
    </div>
  </Link>;
}
