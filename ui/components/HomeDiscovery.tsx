'use client';

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

export function HomeEvents({events, now, current=true}:{events:OwnedEvent[];now:number;current?:boolean}) {
  const upcoming=homepageUpcomingEvents(events, now, 3);
  return <section className={`wrap ${styles.section}`} id="home-events" aria-labelledby="home-events-title">
    <div className={styles.heading} data-home-reveal>
      <div><p className={styles.eyebrow}>Make a plan</p><h2 id="home-events-title">Coming up.</h2></div>
      <div className={styles.links}><Link href="/tour-stops"><CalendarBlank size={18} aria-hidden="true"/>Calendar</Link><Link className={styles.allLink} href="/events">All events <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </div>
    {upcoming.length ? <div className={styles.events} data-count={upcoming.length} aria-label="Upcoming events">
      {upcoming.map(event=><div className={styles.event} key={String(event.id||event.slug)} data-home-event={String(event.slug)} data-home-reveal><EventPosterCard event={event} now={now} availabilityCurrent={current} featured/></div>)}
      {upcoming.length<3 && <div className={styles.organiser} data-home-reveal><p className={styles.eyebrow}>Your next event</p><h3>Bring your<br/>people together.</h3><p>Hosting, school experiences and brand activations.</p><Link href="/book">Book the team <ArrowUpRight size={20} aria-hidden="true"/></Link><Link className={styles.listEvent} href="/ticketing">Advertise or ticket an event <ArrowUpRight size={16} aria-hidden="true"/></Link></div>}
    </div> : <div className={styles.empty}><h3>The next date starts here.</h3><p>{current?'Explore our events or bring Urban Gang Tour to your audience.':'Event updates are temporarily unavailable. Open the events page for the latest.'}</p><Link className="button" href="/events">Explore events <ArrowUpRight size={18} aria-hidden="true"/></Link><Link className={styles.emptyBook} href="/book">Book the team</Link></div>}
    {!current&&upcoming.length>0&&<p className={styles.notice} role="status">Showing the last loaded events. Open an event for the latest details.</p>}
  </section>;
}

const featuredDesigns=merchProducts.filter(design=>['cb-oversized-tee','cb-hoodie','cb-bucket-hat','cb-tote'].includes(design.id));

function HomeDesign({design}:{design:MerchProduct}) {
  return <Link href={'/shop/'+encodeURIComponent(design.id)} className={styles.product} data-home-design={design.id} data-home-reveal>
    <div className={styles.productImage}><GeneratedProductImage id={design.id} colour="Black"/><span className={styles.productArrow}><ArrowUpRight size={20} aria-hidden="true"/></span></div>
    <div className={styles.productInfo}><p>{design.category}</p><h3>{design.name}</h3><strong>Design preview</strong></div>
  </Link>;
}

// Promotion is curated separately from the owner-managed purchase catalogue.
export const HomeMerch:FC<{products:LiveShopProduct[];current?:boolean}>=()=>{
  return <section className={styles.shop} id="home-shop" aria-labelledby="home-shop-title"><div className="wrap">
    <div className={styles.heading} data-home-reveal><div><p className={styles.eyebrow}>Design previews · not on sale</p><h2 id="home-shop-title">Color Blast.</h2></div><Link className={styles.allLink} href="/shop/lookbook">Explore all designs <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    <div className={styles.products}>{featuredDesigns.map(design=><HomeDesign key={design.id} design={design}/>)}</div>
    <div className={styles.shopFoot}><p>Samples and stock unconfirmed.</p><Link href="/shop">Shop products <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
  </div></section>;
};
