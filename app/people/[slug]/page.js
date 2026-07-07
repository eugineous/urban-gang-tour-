import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPerson, getBlogPosts, getAllEvents } from '@/lib/cms';
import JsonLd from '@/components/JsonLd';
import {
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiX,
} from 'react-icons/si';

const BASE_URL = 'https://urbangangtour.co.ke';

export async function generateMetadata({ params }) {
  const person = await getPerson(params.slug);
  if (!person) {
    return { title: 'Person Not Found | Urban Gang Tour' };
  }

  const title = `${person.name} | Urban Gang Tour`;
  const description = person.bio
    ? person.bio.slice(0, 160)
    : `${person.name} — ${person.role || 'Urban Gang Tour crew'}.`;
  const canonical = `${BASE_URL}/people/${params.slug}`;

  return {
    title,
    description,
    keywords: `${person.name}, Urban Gang Tour, ${person.role || ''}, Kenyan school events, youth talent Kenya, school concert Kenya, PPP TV Kenya`,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'profile',
      images: person.photo
        ? [{ url: person.photo.startsWith('http') ? person.photo : `${BASE_URL}${person.photo}` }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: person.photo
        ? [person.photo.startsWith('http') ? person.photo : `${BASE_URL}${person.photo}`]
        : [],
    },
  };
}

function SocialLinks({ person }) {
  const links = [
    {
      key: 'instagram',
      href: person.instagram,
      Icon: SiInstagram,
      label: `Follow ${person.name} on Instagram`,
    },
    {
      key: 'tiktok',
      href: person.tiktok,
      Icon: SiTiktok,
      label: `Follow ${person.name} on TikTok`,
    },
    {
      key: 'youtube',
      href: person.youtube,
      Icon: SiYoutube,
      label: `Watch ${person.name} on YouTube`,
    },
    {
      key: 'twitter',
      href: person.twitter,
      Icon: SiX,
      label: `Follow ${person.name} on X`,
    },
  ].filter(l => l.href);

  if (links.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      {links.map(({ key, href, Icon, label }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          style={{
            width: '44px',
            height: '44px',
            border: 'var(--border-bold)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ugt-ink)',
            background: 'var(--ugt-white)',
            boxShadow: 'var(--shadow-sticker-xs)',
            transition: 'transform var(--dur-base), box-shadow var(--dur-base)',
            fontSize: '18px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translate(-2px,-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sticker-ink)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = 'var(--shadow-sticker-xs)';
          }}
        >
          <Icon aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

export default async function PersonPage({ params }) {
  const [person, allPosts, allEvents] = await Promise.all([
    getPerson(params.slug),
    getBlogPosts('published'),
    getAllEvents(),
  ]);

  if (!person) {
    notFound();
  }

  // Related blog posts: posts where author === slug OR relatedPeople includes slug
  const relatedPosts = allPosts.filter(
    post =>
      post.author === params.slug ||
      (Array.isArray(post.relatedPeople) && post.relatedPeople.includes(params.slug))
  );

  // Associated stops/events
  const associatedEvents = allEvents.filter(ev =>
    Array.isArray(person.associatedStops) && person.associatedStops.includes(ev.slug)
  );

  // Build sameAs array for JSON-LD
  const sameAs = [
    person.instagram,
    person.tiktok,
    person.youtube,
    person.twitter,
    person.website,
  ].filter(Boolean);

  const personUrl = `${BASE_URL}/people/${params.slug}`;
  const photoUrl = person.photo
    ? person.photo.startsWith('http')
      ? person.photo
      : `${BASE_URL}${person.photo}`
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.role || undefined,
    image: photoUrl || undefined,
    url: personUrl,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    worksFor: { '@type': 'Organization', name: 'Urban Gang Tour' },
  };

  return (
    <>
      <JsonLd schema={jsonLd} />

      {/* Page Hero */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ marginBottom: '16px' }}>
            <Link
              href="/crew"
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ← The crew
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: person.photo ? '1fr auto' : '1fr',
              gap: '48px',
              alignItems: 'end',
            }}
          >
            <div>
              {person.role && (
                <div
                  className="eyebrow reveal"
                  style={{ color: 'var(--ugt-orange)', marginBottom: '12px' }}
                >
                  {person.role}
                </div>
              )}
              <h1
                className="h-display h-lg reveal reveal-delay-1"
                style={{ color: 'var(--ugt-white)', marginBottom: '16px' }}
              >
                {person.name}
              </h1>
              {person.bio && (
                <p
                  className="reveal reveal-delay-2"
                  style={{
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: 'var(--fs-body-lg)',
                    maxWidth: '620px',
                    lineHeight: 'var(--lh-loose)',
                  }}
                >
                  {person.bio}
                </p>
              )}
            </div>

            {person.photo && (
              <div
                className="reveal reveal-delay-3"
                style={{
                  width: '200px',
                  height: '240px',
                  borderRadius: 'var(--r-xl)',
                  overflow: 'hidden',
                  border: '3px solid rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }}
              >
                <img
                  src={person.photo}
                  alt={person.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Social Links */}
      {(person.instagram || person.tiktok || person.youtube || person.twitter) && (
        <div style={{ background: 'var(--ugt-bg)', borderBottom: 'var(--border-thin)' }}>
          <div
            className="container"
            style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ugt-ink-muted)',
              }}
            >
              Follow
            </span>
            <SocialLinks person={person} />
          </div>
        </div>
      )}

      {/* Video Embed */}
      {person.videoEmbedUrl && (
        <section className="section-sm" style={{ background: 'var(--ugt-bg-dark)' }}>
          <div className="container">
            <div className="eyebrow reveal" style={{ color: 'var(--ugt-orange)', marginBottom: '20px' }}>
              Watch
            </div>
            <div
              className="reveal reveal-delay-1"
              style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: 'var(--r-xl)',
                border: '3px solid rgba(255,255,255,0.1)',
                boxShadow: 'var(--shadow-sticker-ink)',
              }}
            >
              <iframe
                src={person.videoEmbedUrl}
                title={`${person.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Associated Stops */}
      {associatedEvents.length > 0 && (
        <section className="section" style={{ background: 'var(--ugt-magenta-soft)' }}>
          <div className="container">
            <div className="reveal" style={{ marginBottom: '32px' }}>
              <div className="eyebrow">Tour stops</div>
              <h2 className="h-display h-md" style={{ color: 'var(--ugt-ink)' }}>
                On the ground with {person.name.split(' ')[0]}.
              </h2>
            </div>
            <div
              className="reveal reveal-delay-1"
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {associatedEvents.map(ev => (
                <div
                  key={ev.slug}
                  style={{
                    background: 'var(--ugt-white)',
                    border: 'var(--border-bold)',
                    borderRadius: 'var(--r-xl)',
                    padding: '20px 24px',
                    boxShadow: 'var(--shadow-sticker-xs)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display-alt)',
                        fontSize: '18px',
                        textTransform: 'uppercase',
                        color: 'var(--ugt-ink)',
                        marginBottom: '4px',
                      }}
                    >
                      {ev.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ugt-ink-muted)', fontWeight: 600 }}>
                      {ev.date && `${ev.date} · `}{ev.location}
                    </div>
                  </div>
                  {ev.status && (
                    <span
                      className={`chip ${ev.status === 'confirmed' ? 'chip-confirmed' : 'chip-outline'}`}
                    >
                      {ev.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Blog Posts */}
      {relatedPosts.length > 0 && (
        <section className="section" style={{ background: 'var(--ugt-bg)' }}>
          <div className="container">
            <div className="reveal" style={{ marginBottom: '32px' }}>
              <div className="eyebrow">From the blog</div>
              <h2 className="h-display h-md" style={{ color: 'var(--ugt-ink)' }}>
                Stories featuring {person.name.split(' ')[0]}.
              </h2>
            </div>
            <div className="grid-3 reveal reveal-delay-1">
              {relatedPosts.map(post => (
                <Link
                  key={post.slug}
                  href={`/press/${post.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="crew-card"
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    {post.featuredImage && (
                      <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--ugt-magenta-soft)' }}>
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {post.category && (
                        <div className="crew-card-role">{post.category}</div>
                      )}
                      <div
                        style={{
                          fontFamily: 'var(--font-display-alt)',
                          fontSize: '18px',
                          textTransform: 'uppercase',
                          color: 'var(--ugt-ink)',
                          lineHeight: 1.2,
                        }}
                      >
                        {post.title}
                      </div>
                      {post.excerpt && (
                        <div style={{ fontSize: '14px', color: 'var(--ugt-ink-2)', lineHeight: 1.6 }}>
                          {post.excerpt}
                        </div>
                      )}
                      {post.datePublished && (
                        <div style={{ fontSize: '12px', color: 'var(--ugt-ink-muted)', marginTop: 'auto', paddingTop: '8px' }}>
                          {new Date(post.datePublished).toLocaleDateString('en-KE', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section section-dark">
        <div className="container">
          <div style={{ maxWidth: '560px' }} className="reveal">
            <div className="eyebrow" style={{ color: 'var(--ugt-orange)' }}>Urban Gang Tour</div>
            <h2
              className="h-display h-md"
              style={{ color: 'var(--ugt-white)', margin: '12px 0 16px' }}
            >
              Meet the full crew.
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: '16px',
                lineHeight: 1.7,
                marginBottom: '32px',
              }}
            >
              Every event day, a full professional team shows up ready. These are the people behind Urban Gang Tour.
            </p>
            <Link href="/crew" className="btn btn-magenta btn-lg">
              See the full crew
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
