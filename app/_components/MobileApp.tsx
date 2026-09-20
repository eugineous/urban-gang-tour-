'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Tier = { name: string; price: number };
type Event = { id: string; name: string; kind?: string; venue?: string; city?: string; eventDate?: string; eventTime?: string; image?: string; accent?: string; description?: string; tiers?: Tier[] };
type Variant = { label: string; priceAdjustment?: number; sku?: string };
type Product = { id: string; name: string; price: number; image?: string; category?: string; description?: string; variants?: Variant[] };
type BagLine = { id: string; name: string; price: number; qty: number; variant?: string };
type Photo = { id: string; url: string; category?: string; caption?: string };

const routes: Record<string, 'home' | 'events' | 'gallery' | 'shop' | 'book'> = { '/': 'home', '/events': 'events', '/gallery': 'gallery', '/shop': 'shop', '/book': 'book', '/contact-us': 'book' };
const price = (n: number) => `KES ${n.toLocaleString('en-KE')}`;
const showDate = (d?: string) => d ? new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`)) : 'Coming soon';

export function MobileApp() {
  const page = routes[usePathname() || '/'];
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ticket, setTicket] = useState<Event | null>(null);
  const [bag, setBag] = useState<BagLine[]>([]);
  const [picking, setPicking] = useState<Product | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagEmail, setBagEmail] = useState('');
  const [bagBusy, setBagBusy] = useState(false);
  const [bagError, setBagError] = useState('');
  const [booking, setBooking] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const total = useMemo(() => bag.reduce((n, item) => n + item.price * item.qty, 0), [bag]);
  useEffect(() => {
    if (!page) return;
    Promise.allSettled([fetch('/api/site-data/events').then(r => r.json()), fetch('/api/site-data/products').then(r => r.json()), fetch('/api/site-data/gallery').then(r => r.json())]).then(([a, b, c]) => {
      if (a.status === 'fulfilled') setEvents(Array.isArray(a.value.events) ? a.value.events : []);
      setProducts(b.status === 'fulfilled' && Array.isArray(b.value.products) ? b.value.products : []);
      setProductsLoaded(true);
      setPhotos(c.status === 'fulfilled' && Array.isArray(c.value.photos) ? c.value.photos : []);
    });
  }, [page]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('item');
    if (page !== 'shop' || !id || !productsLoaded) return;
    const product = products.find((row) => row.id === id);
    if (product) setPicking(product);
  }, [page, products, productsLoaded]);
  useEffect(() => { try { localStorage.setItem('ugt_cart', JSON.stringify(bag.map(item => ({ id: item.id, qty: item.qty, ...(item.variant ? { size: item.variant } : {}) })))); } catch {} }, [bag]);
  if (!page) return null;
  const today = new Date().toISOString().slice(0, 10);
  const ticketedEvents = events.filter((event) => event.kind === 'ticketed' && !!event.eventDate && event.eventDate >= today);
  const upcomingStops = events.filter((event) => event.kind === 'school' && !!event.eventDate && event.eventDate >= today);
  const add = (item: Product, variant: string | undefined, qty: number) => {
    const option = item.variants?.find((row) => row.label === variant);
    const unit = item.price + Number(option?.priceAdjustment || 0);
    setBag((old) => {
      const index = old.findIndex((line) => line.id === item.id && line.variant === variant);
      if (index < 0) return [...old, { id: item.id, name: item.name, price: unit, qty, variant }];
      return old.map((line, i) => i === index ? { ...line, qty: Math.min(20, line.qty + qty) } : line);
    });
    setPicking(null); setBagOpen(true);
  };
  const checkoutBag = async () => {
    setBagError(''); setBagBusy(true);
    try {
      const payload = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: bag.map(item => ({ id: item.id, qty: item.qty, ...(item.variant ? { variant: item.variant } : {}) })), ...(bagEmail ? { email: bagEmail } : {}) }) };
      let response = await fetch('/api/paystack/checkout', payload);
      if (response.status === 502 || response.status === 503) response = await fetch('/api/stripe/checkout', payload);
      const data = await response.json().catch(() => ({}));
      if (data.url) location.href = data.url;
      else setBagError('Secure card payment is not available right now.');
    } catch { setBagError('Check your connection and try again.'); } finally { setBagBusy(false); }
  };
  const sendBooking = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setBooking('sending'); const f = new FormData(e.currentTarget); try { const r = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.get('name'), org: f.get('org'), email: f.get('email'), phone: f.get('phone'), type: 'School Booking', message: f.get('message') }) }); setBooking(r.ok ? 'sent' : 'error'); } catch { setBooking('error'); } };
  return <main className="ugt-mobile-app">
    <header className="ugt-mobile-top"><Link href="/" aria-label="Urban Gang Tour"><img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" /></Link><button className="ugt-mobile-bag" onClick={() => setBagOpen(true)}>Bag <b>{bag.reduce((sum, item) => sum + item.qty, 0)}</b></button></header>
    {page === 'home' && <><section className="ugt-mobile-hero"><p>THE TOUR THAT PUTS YOU ON</p><h1>Make the<br />moment.</h1><span>Live shows, talent and culture moving across Kenya.</span><Link className="ugt-mobile-primary" href="/events">Find an event <b>→</b></Link></section><section className="ugt-mobile-section"><div className="ugt-mobile-heading"><h2>Next up</h2><Link href="/events">What’s next</Link></div>{ticketedEvents[0] ? <EventCard event={ticketedEvents[0]} onPick={setTicket} featured /> : upcomingStops[0] ? <SchoolStopCard event={upcomingStops[0]} featured /> : <EmptyEvents />}</section><section className="ugt-mobile-section"><div className="ugt-mobile-heading"><h2>On the road</h2><Link href="/gallery">Open gallery</Link></div>{photos.length ? <PhotoStrip photos={photos.slice(0, 4)} /> : <EmptyGallery />}</section><section className="ugt-mobile-cta"><p>Bring the tour to your school</p><Link href="/book">Start a booking <b>→</b></Link></section></>}
    {page === 'events' && <><section className="ugt-mobile-intro pink"><p>WHAT’S NEXT</p><h1>Find your<br />moment.</h1><span>Public tickets appear here when they are released. School stops are listed separately.</span></section>{ticketedEvents.length ? <section className="ugt-mobile-section ugt-mobile-stack">{ticketedEvents.map(event => <EventCard event={event} onPick={setTicket} key={event.id} />)}</section> : <section className="ugt-mobile-section"><EmptyEvents /></section>}{upcomingStops.length ? <section className="ugt-mobile-section ugt-mobile-stack"><div className="ugt-mobile-heading"><h2>On the school run</h2></div>{upcomingStops.map(event => <SchoolStopCard event={event} key={event.id} />)}</section> : null}</>}
    {page === 'gallery' && <><section className="ugt-mobile-intro blue"><p>PHOTO WALL</p><h1>You had to<br />be there.</h1><span>The faces, fits and full-volume moments from the road.</span></section>{photos.length ? <section className="ugt-mobile-gallery">{photos.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.caption || photo.category || 'Urban Gang Tour'} /><figcaption>{photo.category || 'On the road'}</figcaption></figure>)}</section> : <section className="ugt-mobile-section"><EmptyGallery /></section>}</>}
    {page === 'shop' && <><section className="ugt-mobile-intro yellow"><p>THE DROP</p><h1>Wear the<br />movement.</h1><span>Tour pieces made for the way you show up.</span></section>{products.length ? <section className="ugt-mobile-products-grid">{products.map(item => <article key={item.id}><div className="ugt-mobile-product-art">{item.image && <img src={item.image} alt={item.name} />}</div><p>{item.category || 'Urban Gang'}</p><h2>{item.name}</h2><div><strong>{price(item.price)}</strong><button onClick={() => setPicking(item)}>Choose +</button></div><Link href={`/shop/${encodeURIComponent(item.id)}`}>Details</Link></article>)}</section> : <section className="ugt-mobile-section"><EmptyShop /></section>}</>}
    {page === 'book' && <><section className="ugt-mobile-intro dark"><p>BRING THE TOUR</p><h1>Let’s make<br />your stop.</h1><span>Tell us where the culture needs to land next.</span></section><form className="ugt-mobile-form" onSubmit={sendBooking}><label>Your name<input name="name" required minLength={2} /></label><label>School or organisation<input name="org" /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" type="tel" /></label><label>What are you planning?<textarea name="message" rows={4} /></label><button disabled={booking === 'sending'}>{booking === 'sending' ? 'Sending…' : 'Send booking request →'}</button>{booking === 'sent' && <p className="ugt-mobile-success">Request received. The team will get back to you.</p>}{booking === 'error' && <p className="ugt-mobile-error">Could not send that yet. Please try again.</p>}</form></>}
    <nav className="ugt-mobile-nav"><Tab href="/" text="Home" glyph="⌂" active={page === 'home'} /><Tab href="/events" text="Events" glyph="◉" active={page === 'events'} /><Tab href="/book" text="Book" glyph="＋" active={page === 'book'} cta /><Tab href="/gallery" text="Gallery" glyph="▧" active={page === 'gallery'} /><Tab href="/shop" text="Shop" glyph="□" active={page === 'shop'} /></nav>
    {ticket && <Ticket event={ticket} close={() => setTicket(null)} />}
    {picking && <ProductPicker product={picking} close={() => setPicking(null)} add={add} />}
    {bagOpen && <aside className="ugt-mobile-overlay"><button className="ugt-mobile-close" onClick={() => setBagOpen(false)}>×</button><p>YOUR BAG</p><h2>{bag.length ? `${bag.reduce((sum, item) => sum + item.qty, 0)} piece${bag.reduce((sum, item) => sum + item.qty, 0) === 1 ? '' : 's'} ready` : 'Your bag is empty'}</h2>{bag.map((item, i) => <div className="ugt-mobile-bag-line" key={`${item.id}-${item.variant || 'standard'}`}><span>{item.name}{item.variant ? ` · ${item.variant}` : ''} × {item.qty}</span><b>{price(item.price * item.qty)}</b><button onClick={() => setBag(old => old.filter((_, index) => index !== i))}>Remove</button></div>)}{bag.length > 0 && <><div className="ugt-mobile-total"><span>Total</span><b>{price(total)}</b></div><label>Email for your receipt<input type="email" value={bagEmail} onChange={e => setBagEmail(e.target.value)} /></label>{bagError && <p className="ugt-mobile-error">{bagError}</p>}<button className="ugt-mobile-pay" onClick={checkoutBag} disabled={bagBusy}>{bagBusy ? 'Opening payment…' : 'Pay securely by card →'}</button><p className="ugt-mobile-muted">Secure payment opens through our payment provider.</p></>}</aside>}
  </main>;
}

function Tab({ href, text, glyph, active, cta = false }: { href: string; text: string; glyph: string; active: boolean; cta?: boolean }) { return <Link href={href} className={`${active ? 'active ' : ''}${cta ? 'ugt-mobile-nav-main' : ''}`}><b>{glyph}</b><span>{text}</span></Link>; }
function PhotoStrip({ photos }: { photos: Photo[] }) { return <div className="ugt-mobile-photo-strip">{photos.map(photo => <img key={photo.id} src={photo.url} alt={photo.category || 'Urban Gang Tour'} />)}</div>; }
function EventCard({ event, onPick, featured = false }: { event?: Event; onPick: (event: Event) => void; featured?: boolean }) { if (!event) return null; return <article className={`ugt-mobile-event-card ${featured ? 'featured' : ''}`}><img src={event.image || '/assets/gal/xp-dance.jpg'} alt="" /><div><p>{showDate(event.eventDate)} · {event.eventTime || 'TBA'}</p><h3>{event.name}</h3><span>{event.venue || event.city || 'Kenya'}</span><button onClick={() => onPick(event)}>Get tickets <b>→</b></button></div></article>; }
function SchoolStopCard({ event, featured = false }: { event: Event; featured?: boolean }) { return <article className={`ugt-mobile-event-card ${featured ? 'featured' : ''}`}><img src={event.image || '/assets/gal/g-street.jpg'} alt="" /><div><p>Institutional stop · {showDate(event.eventDate)}</p><h3>{event.name}</h3><span>{event.venue || event.city || 'Kenya'}</span><Link href="/book">Bring the tour here <b>→</b></Link></div></article>; }
function EmptyEvents() { return <div className="ugt-mobile-empty"><p>PUBLIC TICKETS</p><h3>Nothing public is on sale right now.</h3><span>When a ticketed Urban Gang event is released, the real date, venue and ticket options will appear here.</span><Link href="/book">Book the tour <b>→</b></Link></div>; }
function EmptyGallery() { return <div className="ugt-mobile-empty"><p>PHOTO WALL</p><h3>The gallery is being prepared.</h3><span>Verified event images will appear here once the content desk publishes them.</span></div>; }
function EmptyShop() { return <div className="ugt-mobile-empty"><p>URBAN GANG MERCH</p><h3>The next drop is not published yet.</h3><span>When the merch desk publishes an active product, its real price and options will appear here.</span></div>; }
function ProductPicker({ product, close, add }: { product: Product; close: () => void; add: (product: Product, variant: string | undefined, qty: number) => void }) {
  const variants = product.variants || [];
  const [variant, setVariant] = useState<string | undefined>(variants[0]?.label);
  const [qty, setQty] = useState(1);
  const adjustment = Number(variants.find((row) => row.label === variant)?.priceAdjustment || 0);
  return <aside className="ugt-mobile-overlay"><button className="ugt-mobile-close" onClick={close}>×</button><p>CHOOSE YOUR PIECE</p><h2>{product.name}</h2>{product.image && <img src={product.image} alt="" style={{ display: 'block', width: '100%', maxHeight: 210, objectFit: 'contain', margin: '0 0 16px' }} />}{variants.length > 0 && <label>Option<select value={variant || ''} onChange={(event) => setVariant(event.target.value || undefined)}>{variants.map((row) => <option key={row.label} value={row.label}>{row.label}{row.priceAdjustment ? ` · ${row.priceAdjustment > 0 ? '+' : ''}${price(Number(row.priceAdjustment))}` : ''}</option>)}</select></label>}<label>Quantity<input type="number" min="1" max="20" value={qty} onChange={(event) => setQty(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></label><div className="ugt-mobile-total"><span>Total</span><b>{price((product.price + adjustment) * qty)}</b></div><button className="ugt-mobile-pay" onClick={() => add(product, variant, qty)}>Add to bag →</button></aside>;
}
function Ticket({ event, close }: { event: Event; close: () => void }) { const [tier, setTier] = useState(0); const [qty, setQty] = useState(1); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const tiers = event.tiers?.length ? event.tiers : [{ name: 'Regular', price: 0 }]; const buy = async () => { if (name.trim().length < 2) return setError('Enter the ticket holder name.'); if (!event.id.startsWith('mkt-')) return setError('Tickets for this event will be available here shortly.'); setBusy(true); try { const r = await fetch('/api/marketplace/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: event.id, tier, qty, name, email: email || undefined }) }); const data = await r.json(); if (data.url) location.href = data.url; else setError('Checkout is not available yet.'); } catch { setError('Check your connection and try again.'); } finally { setBusy(false); } }; return <aside className="ugt-mobile-overlay"><button className="ugt-mobile-close" onClick={close}>×</button><p>GET TICKETS</p><h2>{event.name}</h2><label>Ticket type<select value={tier} onChange={e => setTier(Number(e.target.value))}>{tiers.map((item, i) => <option key={item.name} value={i}>{item.name} — {price(item.price)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="20" value={qty} onChange={e => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label><label>Ticket holder name<input value={name} onChange={e => setName(e.target.value)} /></label><label>Email for receipt<input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><div className="ugt-mobile-total"><span>Total</span><b>{price(tiers[tier].price * qty)}</b></div>{error && <p className="ugt-mobile-error">{error}</p>}<button className="ugt-mobile-pay" onClick={buy} disabled={busy}>{busy ? 'Opening payment…' : 'Continue to secure payment →'}</button></aside>; }
