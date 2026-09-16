'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Tier = { name: string; price: number };
type Event = { id: string; name: string; kind?: string; venue?: string; city?: string; eventDate?: string; eventTime?: string; image?: string; accent?: string; description?: string; tiers?: Tier[] };
type Product = { id: string; name: string; price: number; image?: string; category?: string };
type Photo = { id: string; url: string; category?: string; caption?: string };

const eventsFallback: Event[] = [
  { id: 'xp-dance', name: 'The Experience Hub Dance Event', eventDate: '2026-08-16', eventTime: '2:00 PM', venue: 'KICC Grounds', image: '/assets/gal/xp-dance.jpg', accent: '#e6218c', tiers: [{ name: 'Regular', price: 500 }, { name: 'VIP', price: 1500 }] },
  { id: 'festival-colours', name: 'Urban Festival of Colours', eventDate: '2026-09-20', eventTime: '11:00 AM', venue: 'Uhuru Gardens', image: '/assets/gal/festival-colours.jpg', accent: '#21c7e6', tiers: [{ name: 'Early Bird', price: 800 }, { name: 'VIP', price: 3000 }] },
  { id: 'campus-rave', name: 'Campus Rave — Nairobi Edition', eventDate: '2026-10-03', eventTime: '4:00 PM', venue: 'Carnivore Grounds', image: '/assets/gal/campus-rave.jpg', accent: '#ffd400', tiers: [{ name: 'Regular', price: 1000 }, { name: 'VIP', price: 2500 }] },
];
const productsFallback: Product[] = [
  { id: 'p1', name: 'Magenta Oversized Tee', price: 2500, image: '/assets/merch/magenta-tee.png', category: 'Apparel' }, { id: 'p2', name: 'Black Crewneck', price: 3800, image: '/assets/merch/crewneck.png', category: 'Apparel' }, { id: 'p3', name: 'Structured Snapback', price: 1800, image: '/assets/merch/snapback.png', category: 'Headwear' }, { id: 'p4', name: 'Bucket Hat', price: 1600, image: '/assets/merch/bucket-hat.png', category: 'Headwear' },
];
const photosFallback: Photo[] = [
  { id: '1', url: '/assets/gal/g-crowning.jpg', category: 'Crowns' }, { id: '2', url: '/assets/gal/g-runway.jpg', category: 'Runway' }, { id: '3', url: '/assets/gal/g-street.jpg', category: 'Street' }, { id: '4', url: '/assets/gal/g-winning.jpg', category: 'Winners' }, { id: '5', url: '/assets/gal/g-trees.jpg', category: 'On tour' }, { id: '6', url: '/assets/gal/loreto.jpg', category: 'Campus' },
];
const routes: Record<string, 'home' | 'events' | 'gallery' | 'shop' | 'book'> = { '/': 'home', '/events': 'events', '/gallery': 'gallery', '/shop': 'shop', '/book': 'book', '/contact-us': 'book' };
const price = (n: number) => `KES ${n.toLocaleString('en-KE')}`;
const showDate = (d?: string) => d ? new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`)) : 'Coming soon';

export function MobileApp() {
  const page = routes[usePathname() || '/'];
  const [events, setEvents] = useState(eventsFallback);
  const [products, setProducts] = useState(productsFallback);
  const [photos, setPhotos] = useState(photosFallback);
  const [ticket, setTicket] = useState<Event | null>(null);
  const [bag, setBag] = useState<Product[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagEmail, setBagEmail] = useState('');
  const [bagBusy, setBagBusy] = useState(false);
  const [bagError, setBagError] = useState('');
  const [booking, setBooking] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const total = useMemo(() => bag.reduce((n, item) => n + item.price, 0), [bag]);
  useEffect(() => {
    if (!page) return;
    Promise.allSettled([fetch('/api/site-data/events').then(r => r.json()), fetch('/api/site-data/products').then(r => r.json()), fetch('/api/site-data/gallery').then(r => r.json())]).then(([a, b, c]) => {
      if (a.status === 'fulfilled' && a.value.events?.length) setEvents(a.value.events.filter((x: Event) => x.kind !== 'past'));
      if (b.status === 'fulfilled' && b.value.products?.length) setProducts(b.value.products);
      if (c.status === 'fulfilled' && c.value.photos?.length) setPhotos(c.value.photos);
    });
  }, [page]);
  useEffect(() => { try { localStorage.setItem('ugt_cart', JSON.stringify(bag.map(item => ({ id: item.id, qty: 1 })))); } catch {} }, [bag]);
  if (!page) return null;
  const add = (item: Product) => { setBag(old => [...old, item]); setBagOpen(true); };
  const checkoutBag = async () => {
    setBagError(''); setBagBusy(true);
    try {
      const payload = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: bag.map(item => ({ id: item.id, qty: 1 })), ...(bagEmail ? { email: bagEmail } : {}) }) };
      let response = await fetch('/api/paystack/checkout', payload);
      if (response.status === 502 || response.status === 503) response = await fetch('/api/stripe/checkout', payload);
      const data = await response.json().catch(() => ({}));
      if (data.url) location.href = data.url;
      else setBagError('Secure card payment is not available right now.');
    } catch { setBagError('Check your connection and try again.'); } finally { setBagBusy(false); }
  };
  const sendBooking = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setBooking('sending'); const f = new FormData(e.currentTarget); try { const r = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.get('name'), org: f.get('org'), email: f.get('email'), phone: f.get('phone'), type: 'School Booking', message: f.get('message') }) }); setBooking(r.ok ? 'sent' : 'error'); } catch { setBooking('error'); } };
  return <main className="ugt-mobile-app">
    <header className="ugt-mobile-top"><Link href="/" aria-label="Urban Gang Tour"><img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" /></Link><button className="ugt-mobile-bag" onClick={() => setBagOpen(true)}>Bag <b>{bag.length}</b></button></header>
    {page === 'home' && <><section className="ugt-mobile-hero"><p>THE TOUR THAT PUTS YOU ON</p><h1>Make the<br />moment.</h1><span>Live shows, talent and culture moving across Kenya.</span><Link className="ugt-mobile-primary" href="/events">Find an event <b>→</b></Link></section><section className="ugt-mobile-section"><div className="ugt-mobile-heading"><h2>Next up</h2><Link href="/events">All events</Link></div><EventCard event={events[0]} onPick={setTicket} featured /></section><section className="ugt-mobile-section"><div className="ugt-mobile-heading"><h2>On the road</h2><Link href="/gallery">Open gallery</Link></div><PhotoStrip photos={photos.slice(0, 4)} /></section><section className="ugt-mobile-cta"><p>Bring the tour to your school</p><Link href="/book">Start a booking <b>→</b></Link></section></>}
    {page === 'events' && <><section className="ugt-mobile-intro pink"><p>LIVE EVENTS</p><h1>Plan your<br />next night.</h1><span>Choose a date, pick a ticket, and get in.</span></section><section className="ugt-mobile-section ugt-mobile-stack">{events.map(event => <EventCard event={event} onPick={setTicket} key={event.id} />)}</section></>}
    {page === 'gallery' && <><section className="ugt-mobile-intro blue"><p>PHOTO WALL</p><h1>You had to<br />be there.</h1><span>The faces, fits and full-volume moments from the road.</span></section><section className="ugt-mobile-gallery">{photos.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.caption || photo.category || 'Urban Gang Tour'} /><figcaption>{photo.category || 'On the road'}</figcaption></figure>)}</section></>}
    {page === 'shop' && <><section className="ugt-mobile-intro yellow"><p>THE DROP</p><h1>Wear the<br />movement.</h1><span>Tour pieces made for the way you show up.</span></section><section className="ugt-mobile-products-grid">{products.map(item => <article key={item.id}><div className="ugt-mobile-product-art">{item.image && <img src={item.image} alt={item.name} />}</div><p>{item.category || 'Urban Gang'}</p><h2>{item.name}</h2><div><strong>{price(item.price)}</strong><button onClick={() => add(item)}>Add +</button></div></article>)}</section></>}
    {page === 'book' && <><section className="ugt-mobile-intro dark"><p>BRING THE TOUR</p><h1>Let’s make<br />your stop.</h1><span>Tell us where the culture needs to land next.</span></section><form className="ugt-mobile-form" onSubmit={sendBooking}><label>Your name<input name="name" required minLength={2} /></label><label>School or organisation<input name="org" /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" type="tel" /></label><label>What are you planning?<textarea name="message" rows={4} /></label><button disabled={booking === 'sending'}>{booking === 'sending' ? 'Sending…' : 'Send booking request →'}</button>{booking === 'sent' && <p className="ugt-mobile-success">Request received. The team will get back to you.</p>}{booking === 'error' && <p className="ugt-mobile-error">Could not send that yet. Please try again.</p>}</form></>}
    <nav className="ugt-mobile-nav"><Tab href="/" text="Home" glyph="⌂" active={page === 'home'} /><Tab href="/events" text="Events" glyph="◉" active={page === 'events'} /><Tab href="/book" text="Book" glyph="＋" active={page === 'book'} cta /><Tab href="/gallery" text="Gallery" glyph="▧" active={page === 'gallery'} /><Tab href="/shop" text="Shop" glyph="□" active={page === 'shop'} /></nav>
    {ticket && <Ticket event={ticket} close={() => setTicket(null)} />}
    {bagOpen && <aside className="ugt-mobile-overlay"><button className="ugt-mobile-close" onClick={() => setBagOpen(false)}>×</button><p>YOUR BAG</p><h2>{bag.length ? `${bag.length} piece${bag.length === 1 ? '' : 's'} ready` : 'Your bag is empty'}</h2>{bag.map((item, i) => <div className="ugt-mobile-bag-line" key={`${item.id}-${i}`}><span>{item.name}</span><b>{price(item.price)}</b><button onClick={() => setBag(old => old.filter((_, index) => index !== i))}>Remove</button></div>)}{bag.length > 0 && <><div className="ugt-mobile-total"><span>Total</span><b>{price(total)}</b></div><label>Email for your receipt<input type="email" value={bagEmail} onChange={e => setBagEmail(e.target.value)} /></label>{bagError && <p className="ugt-mobile-error">{bagError}</p>}<button className="ugt-mobile-pay" onClick={checkoutBag} disabled={bagBusy}>{bagBusy ? 'Opening payment…' : 'Pay securely by card →'}</button><p className="ugt-mobile-muted">Secure payment opens through our payment provider.</p></>}</aside>}
  </main>;
}

function Tab({ href, text, glyph, active, cta = false }: { href: string; text: string; glyph: string; active: boolean; cta?: boolean }) { return <Link href={href} className={`${active ? 'active ' : ''}${cta ? 'ugt-mobile-nav-main' : ''}`}><b>{glyph}</b><span>{text}</span></Link>; }
function PhotoStrip({ photos }: { photos: Photo[] }) { return <div className="ugt-mobile-photo-strip">{photos.map(photo => <img key={photo.id} src={photo.url} alt={photo.category || 'Urban Gang Tour'} />)}</div>; }
function EventCard({ event, onPick, featured = false }: { event?: Event; onPick: (event: Event) => void; featured?: boolean }) { if (!event) return null; return <article className={`ugt-mobile-event-card ${featured ? 'featured' : ''}`}><img src={event.image || '/assets/gal/xp-dance.jpg'} alt="" /><div><p>{showDate(event.eventDate)} · {event.eventTime || 'TBA'}</p><h3>{event.name}</h3><span>{event.venue || event.city || 'Kenya'}</span><button onClick={() => onPick(event)}>Get tickets <b>→</b></button></div></article>; }
function Ticket({ event, close }: { event: Event; close: () => void }) { const [tier, setTier] = useState(0); const [qty, setQty] = useState(1); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const tiers = event.tiers?.length ? event.tiers : [{ name: 'Regular', price: 0 }]; const buy = async () => { if (name.trim().length < 2) return setError('Enter the ticket holder name.'); if (!event.id.startsWith('mkt-')) return setError('Tickets for this event will be available here shortly.'); setBusy(true); try { const r = await fetch('/api/marketplace/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: event.id, tier, qty, name, email: email || undefined }) }); const data = await r.json(); if (data.url) location.href = data.url; else setError('Checkout is not available yet.'); } catch { setError('Check your connection and try again.'); } finally { setBusy(false); } }; return <aside className="ugt-mobile-overlay"><button className="ugt-mobile-close" onClick={close}>×</button><p>GET TICKETS</p><h2>{event.name}</h2><label>Ticket type<select value={tier} onChange={e => setTier(Number(e.target.value))}>{tiers.map((item, i) => <option key={item.name} value={i}>{item.name} — {price(item.price)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="20" value={qty} onChange={e => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label><label>Ticket holder name<input value={name} onChange={e => setName(e.target.value)} /></label><label>Email for receipt<input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><div className="ugt-mobile-total"><span>Total</span><b>{price(tiers[tier].price * qty)}</b></div>{error && <p className="ugt-mobile-error">{error}</p>}<button className="ugt-mobile-pay" onClick={buy} disabled={busy}>{busy ? 'Opening payment…' : 'Continue to secure payment →'}</button></aside>; }
