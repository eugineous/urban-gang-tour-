'use client';

import {useState} from 'react';
import {ArrowUpRight, CalendarBlank} from '@phosphor-icons/react';
import type {LiveShopProduct} from '@/lib/shop-discovery';
import {homepageUpcomingEvents, homepageProducts, homepageProductPrice, homepageProductSoldOut} from '../lib/home-discovery';
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

function HomeProduct({product,current}:{product:LiveShopProduct;current:boolean}) {
  const [failed,setFailed]=useState('');
  return <Link href={'/shop/'+encodeURIComponent(product.id)} className={styles.product} data-home-product={product.id} data-home-reveal>
    <div className={styles.productImage}>{product.image&&failed!==product.image?<img src={product.image} alt={product.name} loading="lazy" decoding="async" width="600" height="700" onError={()=>setFailed(product.image||'')}/>:<span>View product</span>}<span className={styles.productArrow}><ArrowUpRight size={20} aria-hidden="true"/></span>{homepageProductSoldOut(product)&&<span className={styles.soldOut}>Out of stock</span>}</div>
    <div className={styles.productInfo}><p>{product.category||'Official merchandise'}</p><h3>{product.name}</h3><strong>{current?homepageProductPrice(product):'View latest price'}</strong></div>
  </Link>;
}

export function HomeMerch({products,current=true}:{products:LiveShopProduct[];current?:boolean}) {
  const selected=homepageProducts(products,4);
  return <section className={styles.shop} id="home-shop" aria-labelledby="home-shop-title"><div className="wrap">
    <div className={styles.heading} data-home-reveal><div><p className={styles.eyebrow}>Official merchandise</p><h2 id="home-shop-title">Wear the tour.</h2></div><Link className={styles.allLink} href="/shop">Shop all merchandise <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    {selected.length?<div className={styles.products}>{selected.map(product=><HomeProduct key={product.id} product={product} current={current}/>)}</div>:<div className={styles.empty}><h3>Find your tour essentials.</h3><p>Open the shop to explore the full collection and current prices.</p><Link className="button" href="/shop">Explore the shop <ArrowUpRight size={18} aria-hidden="true"/></Link></div>}
    <div className={styles.shopFoot}><p>Tees, headwear and everyday essentials.</p><Link href="/shop">Find your favourite <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    {!current&&selected.length>0&&<p className={styles.notice} role="status">Open a product to check its latest price and options.</p>}
  </div></section>;
}
