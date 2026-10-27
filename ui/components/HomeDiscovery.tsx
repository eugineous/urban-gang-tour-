'use client';
import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages} from '@/ui/i18n/LanguageProvider';


import {OriginalContent} from '@/ui/i18n/OriginalContent';
import type {FC} from 'react';
import {ArrowUpRight, CalendarBlank} from '@phosphor-icons/react';
import type {LiveShopProduct} from '@/lib/shop-discovery';
import {merchProducts, type MerchProduct} from '@/data/color-blast';
import GeneratedProductImage from '@/app/_components/merch/GeneratedProductImage';
import {homepageUpcomingEvents} from '../lib/home-discovery';
import type {OwnedEvent} from '../lib/owned-event-presentation';
import {EventPosterCard} from './EventPosterCard';
import Link from './DocumentLink';
import styles from './HomeDiscovery.module.css';

export function HomeEvents({events, now, current=true}:{events:OwnedEvent[];now:number;current?:boolean}) {const t=useMessages(marketingMessages);
  const upcoming=homepageUpcomingEvents(events, now, 3);
  return <section className={`wrap ${styles.section}`} id="home-events" aria-labelledby="home-events-title">
    <div className={styles.heading} data-home-reveal>
      <div><p className={styles.eyebrow}>{t('home.events.plan')}</p><h2 id="home-events-title">{t('home.events.title')}</h2></div>
      <div className={styles.links}><Link href="/tour-stops"><CalendarBlank size={18} aria-hidden="true"/>{t('calendar')}</Link><Link className={styles.allLink} href="/events">{t('allEvents')} <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </div>
    {upcoming.length ? <div className={styles.events} data-count={upcoming.length} aria-label={t('upcomingEvents')}>
      {upcoming.map(event=><div className={styles.event} key={String(event.id||event.slug)} data-home-event={String(event.slug)} data-home-reveal><EventPosterCard event={event} now={now} availabilityCurrent={current} featured/></div>)}
      {upcoming.length<3 && <div className={styles.organiser} data-home-reveal><p className={styles.eyebrow}>{t('home.events.next')}</p><h3><MessageText catalogue={marketingMessages} message="home.events.bring" values={{br:<br/>}}/></h3><p>{t('home.events.hosting')}</p><Link href="/book">{t('bookTeam')} <ArrowUpRight size={20} aria-hidden="true"/></Link><Link className={styles.listEvent} href="/ticketing">{t('home.events.advertise')} <ArrowUpRight size={16} aria-hidden="true"/></Link></div>}
    </div> : <div className={styles.empty}><h3>{t('home.events.empty')}</h3><p>{current?t('home.events.exploreSummary'):t('home.events.unavailable')}</p><Link className="button" href="/events">{t('exploreEvents')} <ArrowUpRight size={18} aria-hidden="true"/></Link><Link className={styles.emptyBook} href="/book">{t('bookTeam')}</Link></div>}
    {!current&&upcoming.length>0&&<p className={styles.notice} role="status">{t('home.events.stale')}</p>}
  </section>;
}

const featuredDesigns=merchProducts.filter(design=>['cb-oversized-tee','cb-hoodie','cb-bucket-hat','cb-tote'].includes(design.id));

function HomeDesign({design}:{design:MerchProduct}) {const t=useMessages(marketingMessages);
  return <Link href={'/shop/'+encodeURIComponent(design.id)} className={styles.product} data-home-design={design.id} data-home-reveal>
    <div className={styles.productImage}><GeneratedProductImage id={design.id} colour="Black"/><span className={styles.productArrow}><ArrowUpRight size={20} aria-hidden="true"/></span></div>
    <div className={styles.productInfo}><p><OriginalContent inline>{design.category}</OriginalContent></p><h3><OriginalContent inline>{design.name}</OriginalContent></h3><strong>{t('design.preview')}</strong></div>
  </Link>;
}

// Promotion is curated separately from the owner-managed purchase catalogue.
export const HomeMerch:FC<{products:LiveShopProduct[];current?:boolean}>=()=>{const t=useMessages(marketingMessages);
  return <section className={styles.shop} id="home-shop" aria-labelledby="home-shop-title"><div className="wrap">
    <div className={styles.heading} data-home-reveal><div><p className={styles.eyebrow}>{t('design.warning')}</p><h2 id="home-shop-title" lang="en-KE">Color Blast.</h2></div><Link className={styles.allLink} href="/shop/lookbook">{t('design.explore')} <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    <div className={styles.products}>{featuredDesigns.map(design=><HomeDesign key={design.id} design={design}/>)}</div>
    <div className={styles.shopFoot}><p>{t('design.stock')}</p><Link href="/shop">{t('design.shop')} <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
  </div></section>;
};
