'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Lang, t } from './i18n';
import { Icon } from './BottomTabBar';

type Tier = { name: string; price: number };
type Event = { id: string; name: string; kind?: string; venue?: string; city?: string; eventDate?: string; eventTime?: string; image?: string; accent?: string; description?: string; tiers?: Tier[] };
type Variant = { label: string; priceAdjustment?: number; sku?: string };
type Product = { id: string; name: string; price: number; image?: string; category?: string; description?: string; variants?: Variant[] };
type BagLine = { id: string; name: string; price: number; qty: number; variant?: string };
type Photo = { id: string; url: string; category?: string; caption?: string; altText?: string };

const routes: Record<string, 'home' | 'events' | 'gallery' | 'shop' | 'book'> = { '/': 'home', '/events': 'events', '/gallery': 'gallery', '/shop': 'shop', '/book': 'book', '/contact-us': 'book' };
const price = (n: number) => `KES ${n.toLocaleString('en-KE')}`;
const showDate = (d?: string) => d ? new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`)) : 'Coming soon';

function focusableIn(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((item) => item.getAttribute('aria-hidden') !== 'true');
}

// Bottom sheets and the full-screen Explore panel are real modal workflows on
// a phone. Keep focus inside them, restore it on close and let Escape work so
// keyboard and switch users never end up behind an open sheet.
function useOverlayDialog(open: boolean, close: () => void) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => (focusableIn(ref.current)[0] || ref.current)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = focusableIn(ref.current);
      if (!items.length) { event.preventDefault(); ref.current?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, close]);
  return ref;
}

export function MobileApp() {
  const pathname = usePathname() || '/';
  const page = routes[pathname];
  const [lang, setLang] = useState<Lang>('en');
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ticket, setTicket] = useState<Event | null>(null);
  const [bag, setBag] = useState<BagLine[]>([]);
  const [picking, setPicking] = useState<Product | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [bagEmail, setBagEmail] = useState('');
  const [bagBusy, setBagBusy] = useState(false);
  const [bagError, setBagError] = useState('');
  const [booking, setBooking] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const bookingRequestId = useRef('');
  const [cartRestored, setCartRestored] = useState(false);
  const closeBag = useCallback(() => setBagOpen(false), []);
  const bagDialogRef = useOverlayDialog(bagOpen, closeBag);
  const total = useMemo(() => bag.reduce((n, item) => n + item.price * item.qty, 0), [bag]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ugt_lang');
      if (stored === 'sw' || stored === 'en') setLang(stored);
    } catch {}
  }, []);
  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'en' ? 'sw' : 'en';
      try { localStorage.setItem('ugt_lang', next); } catch {}
      return next;
    });
  }, []);
  useEffect(() => {
    if (!page) return;
    if (!window.matchMedia('(max-width:1024px)').matches) return;
    let cancelled = false;
    // These are intentionally independent. A slow gallery should never hold
    // the shop hostage on a low-bandwidth phone, and vice versa.
    void fetch('/api/site-data/events')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setEvents(Array.isArray(data?.events) ? data.events : []); })
      .catch(() => { if (!cancelled) setEvents([]); });
    void fetch('/api/site-data/products')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setProducts(Array.isArray(data?.products) ? data.products : []); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setProductsLoaded(true); });
    void fetch('/api/site-data/gallery')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPhotos(Array.isArray(data?.photos) ? data.photos : []); })
      .catch(() => { if (!cancelled) setPhotos([]); });
    return () => { cancelled = true; };
  }, [page]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('item');
    if (page !== 'shop' || !id || !productsLoaded) return;
    const product = products.find((row) => row.id === id);
    if (product) setPicking(product);
  }, [page, products, productsLoaded]);
  useEffect(() => {
    if (!productsLoaded || cartRestored) return;
    try {
      const saved = JSON.parse(localStorage.getItem('ugt_cart') || '[]');
      if (Array.isArray(saved)) {
        const restored = saved.flatMap((row): BagLine[] => {
          const product = products.find((item) => item.id === row?.id);
          if (!product) return [];
          const variant = typeof row.variant === 'string' ? row.variant : typeof row.size === 'string' ? row.size : undefined;
          const option = product.variants?.find((item) => item.label === variant);
          // Never revive an option which is no longer published with the product.
          if (variant && !option) return [];
          const qty = Math.max(1, Math.min(20, Number(row?.qty) || 1));
          return [{ id: product.id, name: product.name, price: product.price + Number(option?.priceAdjustment || 0), qty, variant }];
        });
        setBag(restored);
      }
    } catch {
      // A bad local browser value should never block the live catalogue.
    } finally {
      setCartRestored(true);
    }
  }, [products, productsLoaded, cartRestored]);
  useEffect(() => { if (!cartRestored) return; try { localStorage.setItem('ugt_cart', JSON.stringify(bag.map(item => ({ id: item.id, qty: item.qty, ...(item.variant ? { size: item.variant } : {}) })))); } catch {} }, [bag, cartRestored]);
  if (!page) {
    if (/^\/(admin|organizer|offline)(\/|$)/.test(pathname)) return null;
    return <div className="ugt-mobile-secondary"><header className="ugt-mobile-top"><Link href="/" aria-label="Urban Gang Tour home"><img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" /></Link><button className="ugt-mobile-menu-icon" aria-label="Open site menu" onClick={() => setExploreOpen(true)}><Icon name="menu" /></button></header>{exploreOpen && <ExplorePanel close={() => setExploreOpen(false)} />}</div>;
  }
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
  const sendBooking = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBooking('sending');
    const f = new FormData(e.currentTarget);
    if (!bookingRequestId.current) {
      try { bookingRequestId.current = crypto.randomUUID(); }
      catch { bookingRequestId.current = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`; }
    }
    try {
      const r = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.get('name'),
          org: f.get('org'),
          email: f.get('email'),
          phone: f.get('phone'),
          type: 'School Booking',
          preferredDate: f.get('preferredDate'),
          expectedAttendance: f.get('expectedAttendance'),
          eventBrief: f.get('eventBrief'),
          message: f.get('message'),
          schoolContactConfirmed: f.get('schoolContactConfirmed') === 'on',
          requestId: bookingRequestId.current,
        }),
      });
      setBooking(r.ok ? 'sent' : 'error');
    } catch {
      setBooking('error');
    }
  };
  return <main className="ugt-mobile-app">
    <header className="ugt-mobile-top"><Link href="/" aria-label="Urban Gang Tour home"><img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" /></Link><div className="ugt-mobile-top-actions"><button className="ugt-mobile-explore" aria-expanded={exploreOpen} aria-controls="ugt-mobile-explore" onClick={() => setExploreOpen(true)} aria-label="Open site menu"><Icon name="menu" /></button><button className="ugt-mobile-lang" aria-label={lang === 'en' ? 'Switch to Swahili' : 'Switch to English'} onClick={toggleLang} style={{ background: 'transparent', border: '2px solid currentColor', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>{lang === 'en' ? 'SW' : 'EN'}</button><button className="ugt-mobile-bag" aria-label={`Open bag, ${bag.reduce((sum, item) => sum + item.qty, 0)} items`} onClick={() => setBagOpen(true)}>Bag <b>{bag.reduce((sum, item) => sum + item.qty, 0)}</b></button></div></header>
    {page === 'home' && <><section className="ugt-mobile-hero"><video className="ugt-mobile-hero-video" src="/assets/light-v1/video/hero-main.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden="true" /><p>URBAN GANG TOUR · KENYA</p><h1>Make the<br />moment.</h1><span>Live shows, talent and culture moving across Kenya.</span><Link className="ugt-mobile-primary" href="/events">Find an event <b>→</b></Link></section><section className="ugt-mobile-section"><div className="ugt-mobile-heading"><h2>Next up</h2><Link href="/events">See all</Link></div>{ticketedEvents[0] ? <EventCard event={ticketedEvents[0]} onPick={setTicket} featured lang={lang} /> : upcomingStops[0] ? <SchoolStopCard event={upcomingStops[0]} featured lang={lang} /> : <EmptyEvents lang={lang} />}</section><section className="ugt-mobile-section"><div className="ugt-mobile-heading"><h2>{t('Choose your lane', lang)}</h2><button className="ugt-mobile-text-button" onClick={() => setExploreOpen(true)}>{t('Explore', lang)}</button></div><div className="ugt-mobile-paths"><Link href="/book"><span>01</span><strong>Bring the tour</strong><small>Schools and institutions</small><b>→</b></Link><Link href="/partners"><span>02</span><strong>Build with us</strong><small>Brands and partners</small><b>→</b></Link><Link href="/blog"><span>03</span><strong>Read the road</strong><small>{t('Urban News', lang)} and recaps</small><b>→</b></Link></div></section><section className="ugt-mobile-section"><div className="ugt-mobile-heading"><h2>On the road</h2><Link href="/gallery">{t('Gallery', lang)}</Link></div>{photos.length ? <PhotoStrip photos={photos.slice(0, 4)} /> : <EmptyGallery />}</section><section className="ugt-mobile-cta"><p>Bring the tour to your school</p><Link href="/book">{t('Book now', lang)} <b>→</b></Link></section></>}
    {page === 'events' && <><section className="ugt-mobile-intro pink"><p>WHAT’S NEXT</p><h1>Find your<br />moment.</h1><span>Public tickets appear here when they are released. School stops are listed separately.</span></section>{ticketedEvents.length ? <section className="ugt-mobile-section ugt-mobile-stack">{ticketedEvents.map(event => <EventCard event={event} onPick={setTicket} key={event.id} lang={lang} />)}</section> : <section className="ugt-mobile-section"><EmptyEvents lang={lang} /></section>}{upcomingStops.length ? <section className="ugt-mobile-section ugt-mobile-stack"><div className="ugt-mobile-heading"><h2>On the school run</h2></div>{upcomingStops.map(event => <SchoolStopCard event={event} key={event.id} lang={lang} />)}</section> : null}</>}
    {page === 'gallery' && <><section className="ugt-mobile-intro blue"><p>PHOTO WALL</p><h1>You had to<br />be there.</h1><span>The faces, fits and full-volume moments from the road.</span></section>{photos.length ? <section className="ugt-mobile-gallery">{photos.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.altText || photo.caption || photo.category || 'Urban Gang Tour'} /><figcaption>{photo.category || 'On the road'}</figcaption></figure>)}</section> : <section className="ugt-mobile-section"><EmptyGallery /></section>}</>}
    {page === 'shop' && <><section className="ugt-mobile-intro yellow"><p>THE DROP</p><h1>Wear the<br />movement.</h1><span>Tour pieces made for the way you show up.</span></section>{products.length ? <section className="ugt-mobile-products-grid">{products.map(item => <article key={item.id}><div className="ugt-mobile-product-art">{item.image && <img src={item.image} alt={item.name} />}</div><p>{item.category || 'Urban Gang'}</p><h2>{item.name}</h2><div><strong>{price(item.price)}</strong><button type="button" aria-label={`Choose options for ${item.name}`} onClick={() => setPicking(item)}>Choose +</button></div><Link aria-label={`View details for ${item.name}`} href={`/shop/${encodeURIComponent(item.id)}`}>Details</Link></article>)}</section> : <section className="ugt-mobile-section"><EmptyShop /></section>}</>}
    {page === 'book' && <><section className="ugt-mobile-intro dark"><p>BRING THE TOUR</p><h1>Let’s make<br />your stop.</h1><span>Tell us where the culture needs to land next.</span></section><form className="ugt-mobile-form" onSubmit={sendBooking}><label>Your name<input name="name" autoComplete="name" required minLength={2} /></label><label>School or organisation<input name="org" autoComplete="organization" required /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" /></label><label>Preferred date<input name="preferredDate" type="date" /></label><label>Expected attendance<input name="expectedAttendance" type="number" min="1" max="500000" inputMode="numeric" placeholder="e.g. 900" /></label><label>Event brief<textarea name="eventBrief" rows={3} placeholder="Talent show, mentorship pods, runway, sponsor activation..." /></label><label>What are you planning?<textarea name="message" rows={4} required minLength={10} /></label><label><input name="schoolContactConfirmed" type="checkbox" required /> I am an authorised adult or school contact. I will not submit student names, health information or other sensitive personal details here.</label><button disabled={booking === 'sending'}>{booking === 'sending' ? 'Sending…' : `${t('Submit', lang)} booking request →`}</button>{booking === 'sent' && <p className="ugt-mobile-success" role="status">Request received. We will review the details before confirming anything in writing.</p>}{booking === 'error' && <p className="ugt-mobile-error" role="alert">Could not send that yet. Please try again.</p>}</form></>}
    <nav className="ugt-mobile-nav" aria-label="Primary navigation"><Tab href="/" text={t('Home', lang)} glyph="⌂" active={page === 'home'} /><Tab href="/events" text={t('Events', lang)} glyph="◉" active={page === 'events'} /><Tab href="/book" text={t('Book Us', lang)} glyph="＋" active={page === 'book'} cta /><Tab href="/gallery" text={t('Gallery', lang)} glyph="▧" active={page === 'gallery'} /><Tab href="/shop" text={t('Shop', lang)} glyph="□" active={page === 'shop'} /></nav>
    {ticket && <Ticket event={ticket} close={() => setTicket(null)} />}
    {picking && <ProductPicker product={picking} close={() => setPicking(null)} add={add} />}
    {exploreOpen && <ExplorePanel close={() => setExploreOpen(false)} />}
    {bagOpen && <aside ref={bagDialogRef} className="ugt-mobile-overlay" role="dialog" aria-modal="true" aria-labelledby="ugt-bag-title" tabIndex={-1}><button type="button" className="ugt-mobile-close" aria-label="Close bag" onClick={closeBag}>×</button><p>YOUR BAG</p><h2 id="ugt-bag-title">{bag.length ? `${bag.reduce((sum, item) => sum + item.qty, 0)} piece${bag.reduce((sum, item) => sum + item.qty, 0) === 1 ? '' : 's'} ready` : 'Your bag is empty'}</h2>{bag.map((item, i) => <div className="ugt-mobile-bag-line" key={`${item.id}-${item.variant || 'standard'}`}><span>{item.name}{item.variant ? ` · ${item.variant}` : ''} × {item.qty}</span><b>{price(item.price * item.qty)}</b><button type="button" aria-label={`Remove ${item.name} from bag`} onClick={() => setBag(old => old.filter((_, index) => index !== i))}>Remove</button></div>)}{bag.length > 0 && <><div className="ugt-mobile-total"><span>Total</span><b>{price(total)}</b></div><label>Email for your receipt<input type="email" autoComplete="email" value={bagEmail} onChange={e => setBagEmail(e.target.value)} /></label>{bagError && <p className="ugt-mobile-error" role="alert">{bagError}</p>}<button type="button" className="ugt-mobile-pay" onClick={checkoutBag} disabled={bagBusy}>{bagBusy ? 'Opening payment…' : 'Pay securely by card →'}</button><p className="ugt-mobile-muted">Secure payment opens through our payment provider.</p></>}</aside>}
  </main>;
}

function Tab({ href, text, glyph, active, cta = false }: { href: string; text: string; glyph: string; active: boolean; cta?: boolean }) { return <Link href={href} aria-current={active ? 'page' : undefined} className={`${active ? 'active ' : ''}${cta ? 'ugt-mobile-nav-main' : ''}`}><Icon name={href === '/' ? 'home' : href === '/events' ? 'ticket' : href === '/book' ? 'book' : href === '/gallery' ? 'gallery' : 'bag'} /><span>{text}</span></Link>; }
function PhotoStrip({ photos }: { photos: Photo[] }) { return <div className="ugt-mobile-photo-strip">{photos.map(photo => <img key={photo.id} src={photo.url} alt={photo.altText || photo.caption || photo.category || 'Urban Gang Tour'} />)}</div>; }
function EventCard({ event, onPick, featured = false, lang = 'en' }: { event?: Event; onPick: (event: Event) => void; featured?: boolean; lang?: Lang }) { if (!event) return null; return <article className={`ugt-mobile-event-card ${featured ? 'featured' : ''}`}><img src={event.image || '/assets/gal/xp-dance.jpg'} alt="" /><div><p>{showDate(event.eventDate)} · {event.eventTime || 'TBA'}</p><h3>{event.name}</h3><span>{event.venue || event.city || 'Kenya'}</span><button type="button" aria-label={`Get tickets for ${event.name}`} onClick={() => onPick(event)}>{t('Get tickets', lang)} <b>→</b></button></div></article>; }
function SchoolStopCard({ event, featured = false, lang = 'en' }: { event: Event; featured?: boolean; lang?: Lang }) { return <article className={`ugt-mobile-event-card ${featured ? 'featured' : ''}`}><img src={event.image || '/assets/gal/g-street.jpg'} alt="" /><div><p>Institutional stop · {showDate(event.eventDate)}</p><h3>{event.name}</h3><span>{event.venue || event.city || 'Kenya'}</span><Link href="/book">{t('Book now', lang)} <b>→</b></Link></div></article>; }
function EmptyEvents({ lang = 'en' }: { lang?: Lang }) { return <div className="ugt-mobile-empty"><p>PUBLIC TICKETS</p><h3>Private stops still move.</h3><span>Ticketed shows appear here when they are released. School and campus stops are confirmed through the booking desk.</span><Link href="/book">{t('Book now', lang)} <b>→</b></Link></div>; }
function EmptyGallery() { return <div className="ugt-mobile-empty"><p>PHOTO WALL</p><h3>The gallery is being prepared.</h3><span>Verified event images will appear here once the content desk publishes them.</span></div>; }
function EmptyShop() { return <div className="ugt-mobile-empty"><p>URBAN GANG MERCH</p><h3>The next drop is not published yet.</h3><span>When the merch desk publishes an active product, its real price and options will appear here.</span></div>; }
function ExplorePanel({ close }: { close: () => void }) {
  const dialogRef = useOverlayDialog(true, close);
  return <aside ref={dialogRef} className="ugt-mobile-explore-panel" id="ugt-mobile-explore" role="dialog" aria-modal="true" aria-labelledby="ugt-explore-title" tabIndex={-1}>
    <div className="ugt-mobile-explore-head"><p>EXPLORE URBAN GANG</p><button type="button" className="ugt-mobile-close" aria-label="Close explore menu" onClick={close}>×</button></div>
    <h2 id="ugt-explore-title">Pick your<br />next move.</h2>
    <nav aria-label="Explore Urban Gang Tour">
      <Link href="/" onClick={close}><strong>Home</strong></Link><Link href="/events" onClick={close}><strong>Events and tickets</strong></Link><Link href="/shop" onClick={close}><strong>Shop</strong></Link><Link href="/gallery" onClick={close}><strong>Gallery</strong></Link><Link href="/work-with-us" onClick={close}><strong>Work with us</strong></Link><Link href="/account" onClick={close}><strong>My account</strong></Link><Link href="/about" onClick={close}><span>01</span><strong>Our story</strong><b>→</b></Link>
      <Link href="/the-gang" onClick={close}><span>02</span><strong>Meet the gang</strong><b>→</b></Link>
      <Link href="/experience" onClick={close}><span>03</span><strong>The tour experience</strong><b>→</b></Link>
      <Link href="/blog" onClick={close}><span>04</span><strong>Urban News</strong><b>→</b></Link>
      <Link href="/partners" onClick={close}><span>05</span><strong>Partners and investors</strong><b>→</b></Link>
      <Link href="/contact-us" onClick={close}><span>06</span><strong>Contact the team</strong><b>→</b></Link>
      <Link href="/press" onClick={close}><span>07</span><strong>Press room</strong><b>→</b></Link>
    </nav>
    <Link className="ugt-mobile-explore-cta" href="/book" onClick={close}>Book the tour <b>→</b></Link>
  </aside>;
}
function ProductPicker({ product, close, add }: { product: Product; close: () => void; add: (product: Product, variant: string | undefined, qty: number) => void }) {
  const variants = product.variants || [];
  const [variant, setVariant] = useState<string | undefined>(variants[0]?.label);
  const [qty, setQty] = useState(1);
  const adjustment = Number(variants.find((row) => row.label === variant)?.priceAdjustment || 0);
  const dialogRef = useOverlayDialog(true, close);
  return <aside ref={dialogRef} className="ugt-mobile-overlay" role="dialog" aria-modal="true" aria-labelledby="ugt-product-title" tabIndex={-1}><button type="button" className="ugt-mobile-close" aria-label="Close product options" onClick={close}>×</button><p>CHOOSE YOUR PIECE</p><h2 id="ugt-product-title">{product.name}</h2>{product.image && <img src={product.image} alt="" style={{ display: 'block', width: '100%', maxHeight: 210, objectFit: 'contain', margin: '0 0 16px' }} />}{variants.length > 0 && <label>Option<select value={variant || ''} onChange={(event) => setVariant(event.target.value || undefined)}>{variants.map((row) => <option key={row.label} value={row.label}>{row.label}{row.priceAdjustment ? ` · ${row.priceAdjustment > 0 ? '+' : ''}${price(Number(row.priceAdjustment))}` : ''}</option>)}</select></label>}<label>Quantity<input type="number" min="1" max="20" value={qty} onChange={(event) => setQty(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></label><div className="ugt-mobile-total"><span>Total</span><b>{price((product.price + adjustment) * qty)}</b></div><button type="button" className="ugt-mobile-pay" onClick={() => add(product, variant, qty)}>Add to bag →</button></aside>;
}
function Ticket({ event, close }: { event: Event; close: () => void }) { const [tier, setTier] = useState(0); const [qty, setQty] = useState(1); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const dialogRef = useOverlayDialog(true, close); const tiers = event.tiers?.length ? event.tiers : [{ name: 'Regular', price: 0 }]; const buy = async () => { if (name.trim().length < 2) return setError('Enter the ticket holder name.'); if (!event.id.startsWith('mkt-')) return setError('Tickets for this event will be available here shortly.'); setBusy(true); try { const r = await fetch('/api/marketplace/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: event.id, tier, qty, name, email: email || undefined }) }); const data = await r.json(); if (data.url) location.href = data.url; else setError('Checkout is not available yet.'); } catch { setError('Check your connection and try again.'); } finally { setBusy(false); } }; return <aside ref={dialogRef} className="ugt-mobile-overlay" role="dialog" aria-modal="true" aria-labelledby="ugt-ticket-title" tabIndex={-1}><button type="button" className="ugt-mobile-close" aria-label="Close ticket options" onClick={close}>×</button><p>GET TICKETS</p><h2 id="ugt-ticket-title">{event.name}</h2><label>Ticket type<select value={tier} onChange={e => setTier(Number(e.target.value))}>{tiers.map((item, i) => <option key={item.name} value={i}>{item.name} — {price(item.price)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="20" value={qty} onChange={e => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label><label>Ticket holder name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label><label>Email for receipt<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><div className="ugt-mobile-total"><span>Total</span><b>{price(tiers[tier].price * qty)}</b></div>{error && <p className="ugt-mobile-error" role="alert">{error}</p>}<button type="button" className="ugt-mobile-pay" onClick={buy} disabled={busy}>{busy ? 'Opening payment…' : 'Continue to secure payment →'}</button></aside>; }
