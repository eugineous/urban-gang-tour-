/* eslint-disable @next/next/no-img-element -- public uploads use existing edge media paths. */
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { StatusStamp } from '@/app/_components/ugt/StatusStampChip';
import {
  eventDateLabel,
  getHomepageView,
  type HomepageEvent,
  type HomepagePhoto,
  type HomepageProduct,
  type HomepageStop,
  stopDateLabel,
} from '@/lib/server/homepage';

const money = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);

const doors = [
  {
    number: '01',
    title: 'Catch the live culture.',
    body: 'Find the next public event and show up when the doors open.',
    href: '/events',
    label: 'Explore events',
  },
  {
    number: '02',
    title: 'Bring the tour to your school.',
    body: 'A full-day school or campus experience made for your community.',
    href: '/book',
    label: 'Book an experience',
  },
  {
    number: '03',
    title: 'Make an event bigger.',
    body: 'Production, talent, media and activations for the moment that matters.',
    href: '/work-with-us',
    label: 'Work with UGT',
  },
  {
    number: '04',
    title: 'Wear the signal.',
    body: 'Current UGT pieces, only when they are actually in the shop.',
    href: '/shop',
    label: 'Shop the drop',
  },
] as const;

function LiveLine({ events, stops }: { events: HomepageEvent[]; stops: HomepageStop[] }) {
  const next = events[0];
  if (next) {
    return (
      <span className="takeover-live-line">
        <i /> Next event: {next.name} · {eventDateLabel(next)}
      </span>
    );
  }
  const nextStop = stops[0];
  if (nextStop) {
    return (
      <span className="takeover-live-line">
        <i /> Next school stop: {nextStop.name} · {stopDateLabel(nextStop)}
      </span>
    );
  }
  return <span className="takeover-live-line"><i /> No public event is live right now.</span>;
}

function EventCard({ event, featured = false }: { event: HomepageEvent; featured?: boolean }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`takeover-event-card${featured ? ' takeover-event-card--featured' : ''}`}
      style={{ '--event-accent': event.accent || '#e6218c' } as CSSProperties & { '--event-accent': string }}
    >
      <div className="takeover-event-card__media">
        {event.image ? <img src={event.image} alt="" loading={featured ? 'eager' : 'lazy'} /> : null}
        <span className="takeover-event-card__index">{featured ? 'NEXT UP' : 'UGT / EVENT'}</span>
        <StatusStamp truth={event.truth} status={event.status} />
      </div>
      <div className="takeover-event-card__body">
        <div className="takeover-event-card__meta">
          <span>{eventDateLabel(event)}</span>
          <span>{event.city || event.venue || 'Location to be announced'}</span>
        </div>
        <h3>{event.name}</h3>
        <p>{event.venue || 'Venue details follow the published event record.'}</p>
        <span className="takeover-event-card__link">See event <b>↗</b></span>
      </div>
    </Link>
  );
}

function SchoolStopCard({ stop }: { stop: HomepageStop }) {
  return (
    <Link href="/experience" className="takeover-event-card takeover-event-card--featured takeover-stop-card">
      <div className="takeover-event-card__media">
        {stop.image ? <img src={stop.image} alt="" loading="lazy" /> : (
          <div className="takeover-stop-art">
            <span>URBAN GANG TOUR / SCHOOL RUN</span>
            <b>{stop.name}</b>
            <span>FROM POTENTIAL TO PURPOSE</span>
          </div>
        )}
        <span className="ugt-sticker ugt-sticker--cyan">School tour stop</span>
      </div>
      <div className="takeover-event-card__body">
        <div className="takeover-event-card__meta">
          <span>{stopDateLabel(stop)}</span>
          <span>{stop.city || stop.venue || 'Kenya'}</span>
        </div>
        <h3>{stop.name}</h3>
        <p>{stop.venue || 'School experience'}</p>
        <span className="takeover-event-card__link">Discover the tour <b>↗</b></span>
      </div>
    </Link>
  );
}

function GalleryMosaic({ photos }: { photos: HomepagePhoto[] }) {
  return (
    <div className="takeover-gallery-grid">
      {photos.slice(0, 5).map((photo, index) => (
        <figure key={photo.id} className={`takeover-gallery-grid__item takeover-gallery-grid__item--${index + 1}`}>
          <img src={photo.url} alt={photo.alt_text || photo.caption || 'Urban Gang Tour moment'} loading="lazy" />
          {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

function MerchStrip({ products }: { products: HomepageProduct[] }) {
  return (
    <div className="takeover-merch-grid">
      {products.map((product) => (
        <Link href={`/shop?item=${encodeURIComponent(product.id)}`} key={product.id} className="takeover-merch-card">
          <div className="takeover-merch-card__image">
            {product.image ? <img src={product.image} alt="" loading="lazy" /> : <span>UGT</span>}
          </div>
          <p>{product.category || 'Urban Gang'}</p>
          <h3>{product.name}</h3>
          <strong>{money(Number(product.price))}</strong>
        </Link>
      ))}
    </div>
  );
}

export async function HomePage() {
  const view = await getHomepageView();
  const events = view.events.items;
  const featured = events[0];

  return (
    <main className="takeover-home">
      <section className="takeover-hero" aria-labelledby="takeover-title">
        <div className="takeover-hero__texture" aria-hidden="true" />
        <div className="takeover-hero__copy">
          <p className="takeover-kicker">Urban Gang Tour / Kenya</p>
          <p className="takeover-hero__side-note">From potential<br />to purpose.</p>
          <h1 id="takeover-title">
            We bring
            <br />
            <em>the culture.</em>
          </h1>
          <p className="takeover-hero__lede">
            Music, talent and unforgettable moments — from school grounds to campus crowds.
          </p>
          <div className="takeover-actions">
            <Link href="/events" className="takeover-button takeover-button--solid">Explore events <span>↗</span></Link>
            <Link href="/book" className="takeover-button takeover-button--outline">Book the tour</Link>
          </div>
          <LiveLine events={events} stops={view.stops.items} />
        </div>
        <div className="takeover-hero__visual">
          <div className="takeover-hero__poster">
            <div className="takeover-hero__poster-top"><span>UGT / 001</span><span>Live signal</span></div>
            <video autoPlay muted loop playsInline preload="metadata" poster="/assets/poster.png" aria-label="Urban Gang Tour event atmosphere">
              <source src="/assets/video/hero-main.mp4" type="video/mp4" />
            </video>
            <div className="takeover-hero__poster-stamp">THE<br />CULTURE<br /><b>GETS MADE</b></div>
            <div className="takeover-hero__poster-bottom"><span>Nairobi → Kenya → Everywhere</span><span>Est. 2019</span></div>
          </div>
          <div className="takeover-hero__orbit takeover-hero__orbit--one">COLOR<br />BLAST</div>
          <div className="takeover-hero__orbit takeover-hero__orbit--two">TURN<br />IT UP</div>
        </div>
        <div className="takeover-hero__scroll">Scroll to enter <span>↓</span></div>
      </section>

      <div className="takeover-marquee" aria-label="Urban Gang Tour experiences">
        <div>
          <span>Events</span><b>✳</b><span>School tours</span><b>✳</b><span>Campus energy</span><b>✳</b>
          <span>Color Blast</span><b>✳</b><span>Urban News</span><b>✳</b><span>Merch</span><b>✳</b>
        </div>
      </div>

      <section className="takeover-section takeover-doors" aria-labelledby="takeover-doors-title">
        <div className="takeover-section__head">
          <p className="takeover-kicker">Pick a door</p>
          <h2 id="takeover-doors-title">Start where<br /><em>you are.</em></h2>
        </div>
        <div className="takeover-doors__grid">
          {doors.map((door) => (
            <Link href={door.href} className="takeover-door" key={door.number}>
              <span className="takeover-door__number">{door.number}</span>
              <h3>{door.title}</h3>
              <p>{door.body}</p>
              <span className="takeover-door__link">{door.label} <b>↗</b></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="takeover-section takeover-events" aria-labelledby="takeover-events-title">
        <div className="takeover-section__head takeover-section__head--split">
          <div>
            <p className="takeover-kicker">What&apos;s moving</p>
            <h2 id="takeover-events-title">Next up.<br /><em>When it&apos;s real.</em></h2>
          </div>
          <Link href="/events" className="takeover-text-link">Open the events board ↗</Link>
        </div>
        {view.events.status === 'degraded' ? (
          <div className="takeover-state takeover-state--degraded">
            <b>Event updates are temporarily unavailable.</b>
            <span>Try the events board again shortly.</span>
            <Link href="/events">Open events ↗</Link>
          </div>
        ) : featured ? (
          <div className="takeover-events__grid">
            <EventCard event={featured} featured />
            <div className="takeover-events__rail">
              {events.slice(1).map((event) => <EventCard event={event} key={event.slug} />)}
            </div>
          </div>
        ) : (
          <div className="takeover-state">
            <b>No public ticket date right now.</b>
            <span>{view.stops.items.length ? 'Upcoming school tour stops are listed below.' : 'Watch this board for the next public ticket release.'}</span>
            <Link href="/book">Bring the tour to you ↗</Link>
          </div>
        )}
      </section>

      {view.stops.status === 'ready' ? (
        <section className="takeover-section takeover-school-stops" aria-labelledby="takeover-school-stops-title">
          <div className="takeover-section__head takeover-section__head--split">
            <div><p className="takeover-kicker">The school run</p><h2 id="takeover-school-stops-title">Coming up<br /><em>on tour.</em></h2></div>
            <Link href="/experience" className="takeover-text-link">Explore the tour ↗</Link>
          </div>
          <div className="takeover-events__grid">
            {view.stops.items.map((stop) => <SchoolStopCard stop={stop} key={stop.id} />)}
          </div>
        </section>
      ) : view.stops.status === 'degraded' ? (
        <section className="takeover-section takeover-school-stops" aria-label="School tour dates">
          <div className="takeover-state takeover-state--degraded"><b>School tour dates are temporarily unavailable.</b></div>
        </section>
      ) : null}

      <section className="takeover-section takeover-proof" aria-labelledby="takeover-proof-title">
        <div className="takeover-proof__intro">
          <p className="takeover-kicker">This is what it feels like</p>
          <h2 id="takeover-proof-title">The room<br /><em>remembers.</em></h2>
          <p>Real moments from the road. Real young people taking the mic, the stage and the next step.</p>
          <Link href="/gallery" className="takeover-text-link">See the gallery ↗</Link>
        </div>
        {view.photos.status === 'ready' ? (
          <GalleryMosaic photos={view.photos.items} />
        ) : (
          <div className="takeover-proof__placeholder">
            <span>MEDIA DROP / NEXT SET</span>
            <b>The next set is still being edited.</b>
          </div>
        )}
      </section>

      <section className="takeover-section takeover-booking" aria-labelledby="takeover-booking-title">
        <div className="takeover-section__head">
          <p className="takeover-kicker">Bring the tour to you</p>
          <h2 id="takeover-booking-title">Your place.<br /><em>Our energy.</em></h2>
        </div>
        <div className="takeover-booking__grid">
          <Link href="/book" className="takeover-booking-card takeover-booking-card--pink">
            <span>Schools</span><h3>A day they will talk about.</h3><p>Mentorship, talent, production and a stage built for your institution.</p><b>Start a school enquiry ↗</b>
          </Link>
          <Link href="/book" className="takeover-booking-card takeover-booking-card--yellow">
            <span>Campuses</span><h3>Turn the crowd up.</h3><p>Student culture, performance and experiences that belong on campus.</p><b>Plan a campus stop ↗</b>
          </Link>
          <Link href="/work-with-us" className="takeover-booking-card takeover-booking-card--ink">
            <span>Events + brands</span><h3>Make the moment bigger.</h3><p>Production, talent, media and activations shaped around your brief.</p><b>Talk to the team ↗</b>
          </Link>
        </div>
      </section>

      <section className="takeover-colorblast" aria-labelledby="takeover-colorblast-title">
        <div className="takeover-colorblast__art" aria-hidden="true">
          <img src="/assets/doc-art/urban-gang-event-master-v2.png" alt="" loading="lazy" />
        </div>
        <div className="takeover-colorblast__copy">
          <p className="takeover-kicker">The signature experience</p>
          <h2 id="takeover-colorblast-title">Color<br /><em>Blast.</em></h2>
          <p>The colour, music and crowd experience built for a big moment. Bring it to your campus or watch for the next public date.</p>
          <Link href="/book" className="takeover-button takeover-button--light">Bring Color Blast ↗</Link>
        </div>
      </section>

      <section className="takeover-section takeover-news" aria-labelledby="takeover-news-title">
        <div className="takeover-section__head takeover-section__head--split">
          <div><p className="takeover-kicker">Urban News</p><h2 id="takeover-news-title">Keep the<br /><em>signal.</em></h2></div>
          <Link href="/blog" className="takeover-text-link">Read Urban News ↗</Link>
        </div>
        {view.posts.status === 'degraded' ? (
          <div className="takeover-state takeover-state--degraded"><b>The newsroom is temporarily unavailable.</b></div>
        ) : view.posts.items.length ? (
          <div className="takeover-news__grid">
            {view.posts.items.slice(0, 3).map((post) => (
              <Link href={`/blog/${post.slug}`} className="takeover-news-card" key={post.slug}>
                <span>{post.section} / {post.datePublished}</span>
                <h3>{post.headline}</h3>
                <p>{post.description}</p>
                <b>Read story ↗</b>
              </Link>
            ))}
          </div>
        ) : (
          <div className="takeover-state"><b>The next story is being put together.</b><span>Check back for the latest from the road.</span></div>
        )}
      </section>

      {view.products.status === 'ready' ? (
        <section className="takeover-section takeover-shop" aria-labelledby="takeover-shop-title">
          <div className="takeover-section__head takeover-section__head--split">
            <div><p className="takeover-kicker">Wear the signal</p><h2 id="takeover-shop-title">Fresh from<br /><em>the shop.</em></h2></div>
            <Link href="/shop" className="takeover-text-link">Shop all ↗</Link>
          </div>
          <MerchStrip products={view.products.items} />
        </section>
      ) : null}

      <section className="takeover-founders" aria-labelledby="takeover-founders-title">
        <div><p className="takeover-kicker">The voices behind the room</p><h2 id="takeover-founders-title">Eugine +<br /><em>Lucy.</em></h2></div>
        <div className="takeover-founders__copy"><p>Two public faces. One growing platform for Kenyan youth culture, opportunity and expression.</p><Link href="/about" className="takeover-button takeover-button--outline">Meet the story ↗</Link></div>
        <div className="takeover-founders__mark">UGT<br /><span>EST. 2019</span></div>
      </section>

      <section className="takeover-final" aria-labelledby="takeover-final-title">
        <p className="takeover-kicker">Make room for the moment</p>
        <h2 id="takeover-final-title">Your venue.<br /><em>Our energy.</em></h2>
        <div className="takeover-actions">
          <Link href="/book" className="takeover-button takeover-button--solid">Book the tour <span>↗</span></Link>
          <Link href="/work-with-us" className="takeover-button takeover-button--outline">Sponsor an experience</Link>
        </div>
      </section>
    </main>
  );
}