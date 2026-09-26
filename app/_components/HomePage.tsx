/* eslint-disable @next/next/no-img-element -- dynamic admin media uses the existing edge-resizer fallback. */
import Link from 'next/link';
import { hasDb, q } from '@/lib/server/db';
import { formatEventDate } from '@/lib/server/catalog';
import { INDEXABLE_EVENT_STATUSES } from '@/lib/server/event-lifecycle';
import { resolveManyEventTruths, type EventTruth } from '@/lib/server/event-truth';
import { getBlogPosts } from '@/app/_lib/blog';

type HomeEvent = { slug: string; name: string; event_date: string; event_time: string; venue: string; city: string; accent: string; image: string; status: string; truth: EventTruth };
type Product = { id: string; name: string; price: number; image: string; category: string };
type Photo = { id: number; url: string; caption: string; alt_text: string };
const money = (value: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);

function eventState(event: HomeEvent) {
  if (event.truth.isSellable) return event.truth.minPrice === null ? 'Ticket details' : `From ${money(event.truth.minPrice)}`;
  if (event.truth.isSoldOut) return 'Sold out';
  if (event.status === 'sales_paused') return 'Sales paused';
  if (event.status === 'postponed') return 'Postponed';
  if (event.status === 'rescheduled') return 'Rescheduled';
  return 'Event update';
}

async function homeEvents(): Promise<HomeEvent[]> {
  if (!hasDb()) return [];
  try {
    const rows = await q<Omit<HomeEvent, 'truth'>>(
      `SELECT slug, name, event_date::text, event_time, venue, city, accent, image, status FROM tour_events WHERE status = ANY($1) AND slug != '' AND (event_date >= CURRENT_DATE OR status IN ('postponed','rescheduled')) ORDER BY priority DESC, event_date ASC NULLS LAST LIMIT 3`,
      [[...INDEXABLE_EVENT_STATUSES]],
    );
    const truths = await resolveManyEventTruths(rows.map((row) => row.slug));
    const bySlug = new Map(truths.map((truth) => [truth.slug, truth]));
    return rows.flatMap((row) => {
      const truth = bySlug.get(row.slug);
      return truth ? [{ ...row, truth }] : [];
    });
  } catch { return []; }
}

async function homeProducts(): Promise<Product[]> {
  if (!hasDb()) return [];
  try { return await q<Product>(`SELECT id, name, price, image, category FROM products WHERE active ORDER BY id LIMIT 3`); } catch { return []; }
}

async function homePhotos(): Promise<Photo[]> {
  if (!hasDb()) return [];
  try { return await q<Photo>(`SELECT id, url, caption, alt_text FROM gallery_photos WHERE published=true ORDER BY sort_order ASC, id ASC LIMIT 4`); } catch { return []; }
}

export async function HomePage() {
  const [events, products, photos, posts] = await Promise.all([homeEvents(), homeProducts(), homePhotos(), getBlogPosts()]);
  const ticketed = events.filter((event) => event.truth.isSellable);
  return <main className="home-page">
    <section className="home-hero" aria-labelledby="home-title"><div className="home-frame home-hero__grid">
      <div><p className="home-kicker">Urban Gang Tour · Kenya</p><h1 id="home-title">The culture<br />doesn&apos;t wait.</h1><p className="home-hero__copy">Live events, stories, merch and school experiences built with the young people moving Kenya forward.</p><div className="home-actions"><Link href="/events" className="home-button home-button--pink">Explore events</Link><Link href="/book" className="home-button home-button--line">Book the tour</Link></div></div>
      <aside className="home-hero__signal" aria-label="Live event status"><p>Right now</p><strong>{events.length ? `${events.length} public event${events.length === 1 ? '' : 's'} to explore` : 'The next chapter is loading'}</strong><span>{ticketed.length ? `${ticketed.length} event${ticketed.length === 1 ? '' : 's'} with tickets available` : 'Follow Urban Gang for the next live announcement.'}</span></aside>
    </div></section>

    <section className="home-section home-events" aria-labelledby="home-events-title"><div className="home-frame"><SectionHeading kicker="Live culture" id="home-events-title" title="What&apos;s moving" link="/events" label="See all events" />
      {events.length ? <div className="home-event-grid">{events.map((event) => <Link key={event.slug} href={`/events/${event.slug}`} className="home-event-card"><div className="home-event-card__image" style={{ backgroundColor: event.accent || '#e6218c' }}>{event.image ? <img src={event.image} alt="" loading="lazy" /> : null}<span>{eventState(event)}</span></div><div className="home-event-card__body"><h3>{event.name}</h3><p>{formatEventDate(event.event_date)}{event.event_time ? ` · ${event.event_time}` : ''}</p>{(event.venue || event.city) ? <p>{[event.venue, event.city].filter(Boolean).join(', ')}</p> : null}</div></Link>)}</div> : <div className="home-empty"><p>There are no public events to show right now.</p><Link href="/events">Visit the events board</Link></div>}
    </div></section>

    <section className="home-section home-paths" aria-label="Ways to connect with Urban Gang Tour"><div className="home-frame home-paths__grid"><Path href="/book" tone="yellow" number="01" title="Bring the tour to your school." copy="Book a campus or school experience made for your community." label="Book the tour" /><Path href="/work-with-us" tone="blue" number="02" title="Build something with UGT." copy="Take your idea, service or story to the people in the culture." label="Work with us" /><Path href="/blog" tone="dark" number="03" title="Catch the story behind the noise." copy="Urban News follows the people and moments shaping the scene." label="Read Urban News" /></div></section>

    {photos.length ? <section className="home-section home-gallery" aria-labelledby="home-gallery-title"><div className="home-frame"><SectionHeading kicker="The evidence" id="home-gallery-title" title="Out in the world" link="/gallery" label="Open gallery" /><div className="home-gallery-grid">{photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.alt_text || photo.caption || 'Urban Gang Tour moment'} loading="lazy" />{photo.caption ? <figcaption>{photo.caption}</figcaption> : null}</figure>)}</div></div></section> : null}
    {products.length ? <section className="home-section home-merch" aria-labelledby="home-merch-title"><div className="home-frame"><SectionHeading kicker="Wear the signal" id="home-merch-title" title="Fresh from the shop" link="/shop" label="Shop merch" /><div className="home-product-grid">{products.map((product) => <Link key={product.id} href={`/shop/${product.id}`} className="home-product-card"><div>{product.image ? <img src={product.image} alt="" loading="lazy" /> : <span>UGT</span>}</div><p>{product.category || 'Urban Gang'}</p><h3>{product.name}</h3><strong>{money(Number(product.price))}</strong></Link>)}</div></div></section> : null}
    {posts.length ? <section className="home-section home-news" aria-labelledby="home-news-title"><div className="home-frame"><SectionHeading kicker="Urban News" id="home-news-title" title="The story travels" link="/blog" label="All stories" /><div className="home-news-grid">{posts.slice(0, 3).map((post) => <Link href={`/blog/${post.slug}`} key={post.slug} className="home-news-card"><p>{post.section} · {post.datePublished}</p><h3>{post.headline}</h3>{post.description ? <span>{post.description}</span> : null}</Link>)}</div></div></section> : null}
    <section className="home-founders"><div className="home-frame"><p className="home-kicker">The people behind it</p><h2>Built by Eugine Micah<br />&amp; Lucy Ogunde.</h2><p>Two public faces. One growing platform for Kenyan youth culture, opportunity and expression.</p><Link href="/the-gang" className="home-button home-button--line">Meet the gang</Link></div></section>
  </main>;
}

function SectionHeading({ kicker, id, title, link, label }: { kicker: string; id: string; title: string; link: string; label: string }) { return <div className="home-section__heading"><div><p className="home-kicker">{kicker}</p><h2 id={id}>{title}</h2></div><Link href={link} className="home-text-link">{label} <span aria-hidden="true">→</span></Link></div>; }
function Path({ href, tone, number, title, copy, label }: { href: string; tone: string; number: string; title: string; copy: string; label: string }) { return <Link href={href} className={`home-path home-path--${tone}`}><span>{number}</span><h2>{title}</h2><p>{copy}</p><b>{label} →</b></Link>; }
