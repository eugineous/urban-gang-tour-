'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { FOUNDERS, MOBILE_NAV, resolvePublicPage } from './public-site-content';
import styles from './public-site.module.css';

type Props = { pathName: string };
type GalleryItem = { src: string; alt: string; title: string };
type LiveEvent = { id: string; slug?: string; kind?: string; name: string; eventDate?: string; eventTime?: string; venue?: string; city?: string; image?: string; description?: string; sellable?: boolean; status?: string };
type Product = { id: string; name: string; price: number; image?: string; category?: string; description?: string };

const gallery: GalleryItem[] = [
  { src: '/assets/light-v1/gal/campus-rave.jpg.960.webp', alt: 'Students enjoying an Urban Gang Tour event', title: 'The noise after the first beat' },
  { src: '/assets/light-v1/gal/g-runway.jpg.960.webp', alt: 'Students on a runway during an Urban Gang Tour stop', title: 'The runway belongs to them' },
  { src: '/assets/light-v1/gal/g-trees.jpg.960.webp', alt: 'Urban Gang Tour community activity', title: 'Culture leaves something behind' },
  { src: '/assets/light-v1/gal/xp-dance.jpg.960.webp', alt: 'Dance performance at a tour event', title: 'Talent gets its full frame' },
  { src: '/assets/light-v1/gal/festival-colours.jpg.960.webp', alt: 'Festival colours at a tour event', title: 'Every colour has a story' },
  { src: '/assets/light-v1/gal/g-winning.jpg.960.webp', alt: 'Winning moment at an Urban Gang Tour stop', title: 'Proof looks like this' },
];

function Mark({ name }: { name: string }) {
  const paths: Record<string, string> = {
    menu: 'M4 7h16M4 12h16M4 17h16', close: 'M6 6l12 12M18 6 6 18', arrow: 'M5 12h13M13 6l6 6-6 6',
    home: 'M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z', calendar: 'M5 5h14v14H5zM5 9h14M8 3v4m8-4v4',
    frames: 'M5 5h10v10H5zM10 10h9v9h-9z', bag: 'M6 8h12l1 12H5zm3 0V6a3 3 0 0 1 6 0v2', spark: 'm12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z',
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.arrow} /></svg>;
}

function BookingForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus('sending'); setMessage('');
    try {
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), phone: form.get('phone'), org: form.get('org'), type: 'School Booking', message: form.get('message'), schoolContactConfirmed: true, requestId: crypto.randomUUID() }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'Request was not accepted'); }
      setStatus('sent'); setMessage('We have your brief. Our team will reply using the email or phone you shared.');
      formElement.reset();
    } catch { setStatus('error'); setMessage('Your message did not send. Check the details and try again, or email admin@urbangangtour.co.ke.'); }
  }
  return <form id="booking-form" className={styles.form} onSubmit={submit}>
    <div className={styles.formIntro}><h2>Start the conversation.</h2><p>Tell us what you are planning. Clear details help us respond quickly.</p></div>
    <label>Your name<input name="name" required autoComplete="name" /></label>
    <label>Work email<input name="email" required type="email" autoComplete="email" /></label>
    <label>Phone number<input name="phone" required inputMode="tel" autoComplete="tel" /></label>
    <label>School, campus or organisation<input name="org" required autoComplete="organization" /></label>
    <label className={styles.wide}>What are you planning?<textarea name="message" required rows={4} placeholder="Date, audience, city and the kind of moment you want to create." /></label>
    {message ? <p className={status === 'error' ? styles.error : styles.success} role="alert">{message}</p> : null}
    <button className={styles.primary} disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send booking brief'} <Mark name="arrow" /></button>
  </form>;
}

function EventListing() {
  const [events, setEvents] = useState<LiveEvent[] | null>(null);
  useEffect(() => { let cancelled = false; void fetch('/api/site-data/events').then((response) => response.ok ? response.json() : { events: [] }).then((payload) => { if (!cancelled) setEvents(Array.isArray(payload.events) ? payload.events : []); }).catch(() => { if (!cancelled) setEvents([]); }); return () => { cancelled = true; }; }, []);
  return <section id="live-events" className={styles.events}><div className={styles.sectionHead}><h2>Published events.</h2><p>Availability is live. Ticket detail pages are the source of truth before payment.</p></div>{events === null ? <p className={styles.loading}>Loading the live calendar…</p> : events.length ? <div className={styles.eventGrid}>{events.map((event) => { const ticketed = event.kind === 'ticketed' && !!event.slug; const href = ticketed ? `/events/${event.slug}` : event.status === 'completed' ? '/gallery' : '/book'; const label = ticketed ? (event.sellable ? 'View tickets' : 'View event') : event.status === 'completed' ? 'View recap' : 'Bring the tour here'; return <a key={event.id} href={href} className={styles.eventCard}>{event.image ? <Image src={event.image} alt="" width={760} height={520} sizes="(max-width: 760px) 100vw, 33vw" /> : <span className={styles.eventFallback} /> }<div><p>{event.eventDate ? new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${event.eventDate}T12:00:00`)) : 'Date to be announced'}</p><h3>{event.name}</h3><span>{[event.venue, event.city].filter(Boolean).join(' · ') || 'Venue to be announced'}</span><b>{label} <Mark name="arrow" /></b></div></a>; })}</div> : <div className={styles.empty}><h3>The next date is being set.</h3><p>Bring Urban Gang Tour to your school, campus or city while the next public experience is loading.</p><a className={styles.primary} href="/book">Plan a stop <Mark name="arrow" /></a></div>}</section>;
}

function ProductListing() {
  const [products, setProducts] = useState<Product[] | null>(null); const [bag, setBag] = useState<Record<string, number>>({}); const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { let cancelled = false; void fetch('/api/site-data/products').then((response) => response.ok ? response.json() : { products: [] }).then((payload) => { if (!cancelled) setProducts(Array.isArray(payload.products) ? payload.products : []); }).catch(() => { if (!cancelled) setProducts([]); }); return () => { cancelled = true; }; }, []);
  const quantity = Object.values(bag).reduce((total, value) => total + value, 0);
  async function checkout() { if (!quantity) return; setBusy(true); setMessage(''); try { const response = await fetch('/api/paystack/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Object.entries(bag).map(([id, qty]) => ({ id, qty })), ...(email ? { email } : {}) }) }); const payload = await response.json(); if (!response.ok || !payload.authorizationUrl) throw new Error(payload.error || 'Checkout is unavailable'); window.location.assign(payload.authorizationUrl); } catch { setMessage('Checkout is unavailable right now. Your bag is still here—please try again shortly.'); setBusy(false); } }
  return <section id="collection" className={styles.collection}><div className={styles.sectionHead}><h2>The official collection.</h2><p>Server-validated products, stock and prices. Nothing is charged until the secure payment page.</p></div>{products === null ? <p className={styles.loading}>Loading the collection…</p> : products.length ? <><div className={styles.productGrid}>{products.map((product) => <article key={product.id} className={styles.productCard}><a href={`/shop/${product.id}`}>{product.image ? <Image src={product.image} alt={product.name} width={640} height={640} sizes="(max-width: 760px) 50vw, 25vw" /> : <span className={styles.eventFallback} />}</a><div><p>{product.category || 'Official merch'}</p><h3>{product.name}</h3><span>KES {Number(product.price).toLocaleString('en-KE')}</span><div><a href={`/shop/${product.id}`}>Details</a><button onClick={() => setBag((current) => ({ ...current, [product.id]: Math.min(20, (current[product.id] || 0) + 1) }))}>Add to bag</button></div></div></article>)}</div><div className={styles.cart} aria-live="polite"><strong>{quantity ? `${quantity} item${quantity === 1 ? '' : 's'} in your bag` : 'Your bag is empty'}</strong><label>Receipt email (optional)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><button className={styles.primary} disabled={!quantity || busy} onClick={checkout}>{busy ? 'Opening checkout…' : 'Secure checkout'} <Mark name="arrow" /></button>{message ? <p role="alert" className={styles.error}>{message}</p> : null}</div></> : <div className={styles.empty}><h3>The next drop is loading.</h3><p>Check back soon, or talk to us about an order.</p><a className={styles.primary} href="/contact-us">Contact the team <Mark name="arrow" /></a></div>}</section>;
}

export function PublicSite({ pathName }: Props) {
  const page = resolvePublicPage(pathName);
  const home = pathName === '/';
  const founders = pathName === '/about' || pathName === '/the-gang';
  const booking = pathName === '/book' || pathName === '/contact-us';
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathName]);
  return <div className={`public-site ${styles.site} ${styles[page.tone]}`}>
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label="Urban Gang Tour home"><span>URBAN</span><strong>GANG<br />TOUR</strong></a>
      <nav className={styles.desktopNav} aria-label="Primary navigation"><a href="/about">About</a><a href="/events">Events</a><a href="/gallery">Gallery</a><a href="/shop">Shop</a><a href="/partners">Partner</a></nav>
      <a className={styles.headerAction} href="/book">Book the tour <Mark name="arrow" /></a>
      <button className={styles.menuButton} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Close site menu' : 'Open site menu'}><Mark name={menuOpen ? 'close' : 'menu'} /></button>
    </header>
    {menuOpen ? <nav id="mobile-menu" className={styles.mobileMenu} aria-label="Mobile navigation"><a href="/about">About</a><a href="/events">Events</a><a href="/gallery">Gallery</a><a href="/shop">Shop</a><a href="/partners">Partner</a><a href="/book">Book the tour</a></nav> : null}
    <main id="main-content">
      <section className={`${styles.hero} ${home ? styles.homeHero : ''}`}>
        <div className={styles.heroCopy}><p className={styles.heroLine}>URBAN GANG TOUR · KENYA</p><h1>{page.title}</h1><p className={styles.standfirst}>{page.standfirst}</p><div className={styles.heroActions}><a className={styles.primary} href={page.action.href}>{page.action.label} <Mark name="arrow" /></a>{home ? <a className={styles.textAction} href="/events">See what’s next</a> : <a className={styles.textAction} href="/contact-us">Talk to us</a>}</div></div>
        <div className={styles.heroMedia}>
          {home ? <video className={styles.video} autoPlay muted loop playsInline preload="metadata" poster={page.image} onCanPlay={() => setVideoReady(true)} onLoadedMetadata={(event) => { const video = event.currentTarget; if (video.duration && video.currentTime < 1) video.currentTime = Math.max(0, video.duration * .42); }}><source src="/assets/light-v1/video/hero-main.mp4" type="video/mp4" /></video> : <Image src={page.image} alt="" fill priority sizes="(max-width: 760px) 100vw, 50vw" className={styles.cover} />}
          <span className={styles.mediaStamp}>{home && videoReady ? 'LIVE MOTION' : 'EST. 2019'}</span>
        </div>
      </section>
      {home ? <>
        <section className={styles.proof}><p>Made for schools. Built for stadium energy. Broadcast-ready by design.</p><a href="/experience">How a tour day feels <Mark name="arrow" /></a></section>
        <section className={styles.featureSplit}><div><h2>Not a local event. A cultural platform.</h2><p>We bring big-stage production to the places where the next talent, audience and story are already waiting.</p><a className={styles.secondary} href="/about">Why we exist <Mark name="arrow" /></a></div><Image src="/assets/light-v1/gal/g-winning.jpg.960.webp" alt="Urban Gang Tour crowd celebrating" width={960} height={640} sizes="(max-width: 760px) 100vw, 45vw" /></section>
        <section className={styles.galleryRail} aria-label="Selected tour moments"><div className={styles.sectionHead}><h2>Catch the feeling.</h2><a href="/gallery">Open the full gallery <Mark name="arrow" /></a></div><div className={styles.rail}>{gallery.slice(0, 4).map((item) => <figure key={item.src}><Image src={item.src} alt={item.alt} width={600} height={780} sizes="(max-width: 760px) 75vw, 26vw" /><figcaption>{item.title}</figcaption></figure>)}</div></section>
        <section className={styles.close}><div><p>One booking can become a headline.</p><h2>Bring the tour to your people.</h2></div><a className={styles.primary} href="/book">Book the tour <Mark name="arrow" /></a></section>
      </> : null}
      {founders ? <section className={styles.founders}><div className={styles.sectionHead}><h2>Two founders. One unmistakable energy.</h2><p>They are the faces and creative force publicly representing Urban Gang Tour.</p></div><div className={styles.founderGrid}>{FOUNDERS.map((founder) => <article key={founder.name}><div className={styles.founderPhoto}><Image src={founder.image} alt={founder.name} fill sizes="(max-width: 760px) 100vw, 50vw" /></div><p>{founder.role}</p><h3>{founder.name}</h3><span>{founder.bio}</span></article>)}</div></section> : null}
      {pathName === '/events' ? <EventListing /> : null}
      {pathName === '/gallery' ? <section className={styles.galleryGrid}>{gallery.map((item) => <figure key={item.src}><Image src={item.src} alt={item.alt} width={900} height={700} sizes="(max-width: 760px) 100vw, 33vw" /><figcaption>{item.title}</figcaption></figure>)}</section> : null}
      {pathName === '/shop' ? <ProductListing /> : null}
      {booking ? <BookingForm /> : null}
      {!home && !founders && !booking && pathName !== '/gallery' && pathName !== '/shop' && pathName !== '/events' ? <section className={styles.routeClose}><h2>Ready when your audience is.</h2><p>Urban Gang Tour creates a complete, memorable live experience—not just a date on a calendar.</p><a className={styles.primary} href="/book">Bring us in <Mark name="arrow" /></a></section> : null}
    </main>
    <footer className={styles.footer}><a className={styles.brand} href="/"><span>URBAN</span><strong>GANG<br />TOUR</strong></a><div><a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a><a href="/refund-policy">Refunds</a></div><a href="mailto:admin@urbangangtour.co.ke">admin@urbangangtour.co.ke</a></footer>
    <nav className={styles.bottomNav} aria-label="Mobile primary navigation">{MOBILE_NAV.map((item) => <a key={item.href} href={item.href} aria-current={item.href === pathName ? 'page' : undefined}><Mark name={item.icon} /><span>{item.label}</span></a>)}</nav>
  </div>;
}
