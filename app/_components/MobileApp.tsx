'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Event = { id: string; name: string; kind?: string; venue?: string; city?: string; eventDate?: string; image?: string; accent?: string };
type Product = { id: string; name: string; price?: number; image?: string; category?: string };
type Photo = { id: string; url: string; category?: string };

const pages: Record<string, { title: string; kicker: string }> = {
  home: { title: 'Your culture\nstarts here.', kicker: 'URBAN GANG TOUR' },
  events: { title: 'What’s\ncoming up.', kicker: 'LIVE EVENTS' },
  gallery: { title: 'The tour\nin frames.', kicker: 'PHOTO WALL' },
  shop: { title: 'Wear the\nmovement.', kicker: 'THE DROP' },
  contact: { title: 'Bring us\nto your school.', kicker: 'BOOK THE TOUR' },
};

function fmtDate(value?: string) {
  if (!value) return 'Dates coming soon';
  return new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`));
}

export function MobileApp({ page }: { page: string }) {
  const copy = pages[page] || pages.home;
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    const load = async () => {
      const [eventResult, productResult, photoResult] = await Promise.allSettled([
        fetch('/api/site-data/events').then((r) => r.json()),
        fetch('/api/site-data/products').then((r) => r.json()),
        fetch('/api/site-data/gallery').then((r) => r.json()),
      ]);
      if (eventResult.status === 'fulfilled') setEvents((eventResult.value.events || []).filter((e: Event) => e.kind !== 'past').slice(0, 3));
      if (productResult.status === 'fulfilled') setProducts((productResult.value.products || []).slice(0, 4));
      if (photoResult.status === 'fulfilled') setPhotos((photoResult.value.photos || []).slice(0, 6));
    };
    void load();
  }, []);

  const showEvents = page === 'home' || page === 'events';
  const showGallery = page === 'home' || page === 'gallery';
  const showShop = page === 'home' || page === 'shop';
  const isBooking = page === 'contact';

  return <main className="ugt-mobile-app">
    <header className="ugt-mobile-top">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" />
      <Link href="/account" aria-label="Open account" className="ugt-mobile-account">◎</Link>
    </header>

    <section className={`ugt-mobile-hero ${page === 'events' ? 'yellow' : page === 'gallery' ? 'blue' : ''}`}>
      <span>{copy.kicker}</span>
      <h1>{copy.title.split('\n').map((line) => <>{line}<br /></>)}</h1>
      {isBooking ? <Link className="ugt-mobile-primary" href="/book">Start a booking <b>→</b></Link> : <Link className="ugt-mobile-primary" href={page === 'events' ? '/events' : '/book'}>{page === 'events' ? 'Get tickets' : 'Book the tour'} <b>→</b></Link>}
    </section>

    {showEvents && <section className="ugt-mobile-section">
      <div className="ugt-mobile-heading"><h2>{page === 'events' ? 'Next up' : 'Don’t miss'}</h2><Link href="/events">See all</Link></div>
      <div className="ugt-mobile-event-list">
        {events.length ? events.map((event) => <Link className="ugt-mobile-event" href="/events" key={event.id}>
          <div className="ugt-mobile-date"><b>{fmtDate(event.eventDate).split(' ')[0]}</b><span>{fmtDate(event.eventDate).split(' ')[1] || 'TBA'}</span></div>
          <div><strong>{event.name}</strong><small>{event.venue || event.city || 'Urban Gang Tour'}</small></div><i>→</i>
        </Link>) : <Link className="ugt-mobile-event" href="/events"><div className="ugt-mobile-date"><b>UGT</b></div><div><strong>Tour dates landing soon</strong><small>Tap to view events</small></div><i>→</i></Link>}
      </div>
    </section>}

    {showGallery && <section className="ugt-mobile-section">
      <div className="ugt-mobile-heading"><h2>From the road</h2><Link href="/gallery">Gallery</Link></div>
      <div className="ugt-mobile-photo-grid">
        {photos.length ? photos.map((photo) => <Link href="/gallery" key={photo.id}><img src={photo.url} alt={photo.category || 'Urban Gang Tour'} /></Link>) : <Link href="/gallery" className="ugt-mobile-photo-empty">Open the photo wall →</Link>}
      </div>
    </section>}

    {showShop && <section className="ugt-mobile-section ugt-mobile-shop">
      <div className="ugt-mobile-heading"><h2>Fresh drop</h2><Link href="/shop">Shop all</Link></div>
      <div className="ugt-mobile-products">
        {products.length ? products.map((product) => <Link href="/shop" key={product.id}>
          {product.image && <img src={product.image} alt="" />}<strong>{product.name}</strong><small>{product.price ? `KES ${product.price.toLocaleString()}` : 'View item'}</small>
        </Link>) : <Link href="/shop">Shop Urban Gang merch →</Link>}
      </div>
    </section>}

    <nav className="ugt-mobile-nav" aria-label="Mobile navigation">
      <Link href="/" className={page === 'home' ? 'active' : ''}>⌂<span>Home</span></Link>
      <Link href="/events" className={page === 'events' ? 'active' : ''}>⌑<span>Events</span></Link>
      <Link href="/book" className="ugt-mobile-nav-book">＋<span>Book</span></Link>
      <Link href="/gallery" className={page === 'gallery' ? 'active' : ''}>▧<span>Gallery</span></Link>
      <Link href="/shop" className={page === 'shop' ? 'active' : ''}>□<span>Shop</span></Link>
    </nav>
  </main>;
}
