import Link from 'next/link';
import { getBlogPosts } from '@/lib/cms';

const BASE_URL = 'https://urbangangtour.co.ke';

export async function generateMetadata() {
  return {
    title: 'Press & Blog | Urban Gang Tour',
    description:
      "Stories, news, and updates from the Urban Gang Tour — Kenya's biggest school talent search, mentorship, and awards concert programme.",
    keywords:
      'Urban Gang Tour news, UGT press, Urban News Kenya, Kenyan school events, youth talent Kenya, school concert Kenya, PPP TV Kenya, Urban Gang Tour blog',
    alternates: {
      canonical: `${BASE_URL}/press`,
      types: {
        'application/rss+xml': `${BASE_URL}/press/feed.xml`,
      },
    },
    openGraph: {
      title: 'Press & Blog | Urban Gang Tour',
      description:
        "Stories, news, and updates from the Urban Gang Tour — Kenya's biggest school talent search.",
      url: `${BASE_URL}/press`,
      type: 'website',
      images: [
        {
          url: `${BASE_URL}/assets/logos/ugt-logo-full.png`,
          width: 800,
          height: 600,
          alt: 'Urban Gang Tour Logo',
        },
      ],
    },
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default async function PressPage() {
  const posts = await getBlogPosts('published');

  // Sort by datePublished descending (newest first)
  const sorted = [...posts].sort(
    (a, b) => new Date(b.datePublished ?? 0) - new Date(a.datePublished ?? 0)
  );

  return (
    <>
      {/* Page Hero */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <div className="page-hero-dots" />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="eyebrow reveal" style={{ color: 'var(--ugt-orange)' }}>
            Urban News
          </div>
          <h1
            className="h-display h-lg reveal reveal-delay-1"
            style={{ color: 'var(--ugt-white)', maxWidth: '800px' }}
          >
            Press &amp; Blog
          </h1>
          <p
            className="reveal reveal-delay-2"
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 'var(--fs-body-lg)',
              maxWidth: '560px',
              lineHeight: 'var(--lh-loose)',
              marginTop: '16px',
            }}
          >
            Stories, recaps, and breaking news from the Urban Gang Tour universe.
          </p>
          <div className="reveal reveal-delay-3" style={{ marginTop: '24px' }}>
            <a
              href="/press/feed.xml"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ugt-orange)',
                textDecoration: 'none',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
              </svg>
              RSS Feed
            </a>
          </div>
        </div>
      </section>

      {/* Featured in the News */}
      <section
        className="section-sm"
        style={{ background: 'var(--ugt-magenta-soft)', borderBottom: 'var(--border-thin)' }}
      >
        <div className="container">
          <div className="reveal" style={{ marginBottom: '24px' }}>
            <div className="eyebrow">In the spotlight</div>
            <h2 className="h-display" style={{ fontSize: 'var(--fs-h2)', color: 'var(--ugt-ink)' }}>
              Featured in the news
            </h2>
          </div>
          <div
            className="reveal reveal-delay-1"
            style={{
              background: 'var(--ugt-white)',
              border: 'var(--border-bold)',
              borderRadius: 'var(--r-xl)',
              padding: '32px',
              boxShadow: 'var(--shadow-sticker-xs)',
              textAlign: 'center',
              color: 'var(--ugt-ink-muted)',
              fontSize: '15px',
            }}
          >
            External press mentions will appear here. Manage them from the admin blog panel.
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="section" style={{ background: 'var(--ugt-bg)' }}>
        <div className="container">
          {sorted.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 0',
                color: 'var(--ugt-ink-muted)',
                fontSize: '17px',
              }}
            >
              No posts published yet. Check back soon.
            </div>
          ) : (
            <>
              <div className="reveal" style={{ marginBottom: '40px' }}>
                <div className="eyebrow">Latest stories</div>
                <h2
                  className="h-display"
                  style={{ fontSize: 'var(--fs-h2)', color: 'var(--ugt-ink)' }}
                >
                  From the blog
                </h2>
              </div>

              <div
                className="reveal reveal-delay-1"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '24px',
                }}
              >
                {sorted.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/press/${post.slug}`}
                    style={{ textDecoration: 'none', display: 'flex' }}
                  >
                    <article
                      style={{
                        background: 'var(--ugt-white)',
                        border: 'var(--border-bold)',
                        borderRadius: 'var(--r-xl)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sticker-xs)',
                        transition: 'transform var(--dur-base), box-shadow var(--dur-base)',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translate(-3px,-3px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sticker-ink)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = '';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sticker-xs)';
                      }}
                    >
                      {/* Featured Image */}
                      {post.featuredImage && (
                        <div
                          style={{
                            aspectRatio: '16/9',
                            overflow: 'hidden',
                            background: 'var(--ugt-magenta-soft)',
                            borderBottom: 'var(--border-bold)',
                          }}
                        >
                          <img
                            src={post.featuredImage}
                            alt={post.title || 'Blog post'}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      {/* Card Body */}
                      <div
                        style={{
                          padding: '20px 24px 24px',
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {/* Category chip */}
                        {post.category && (
                          <span className="chip chip-magenta" style={{ alignSelf: 'flex-start' }}>
                            {post.category}
                          </span>
                        )}

                        {/* Title */}
                        <h3
                          style={{
                            fontFamily: 'var(--font-display-alt)',
                            fontSize: '20px',
                            textTransform: 'uppercase',
                            color: 'var(--ugt-ink)',
                            lineHeight: 1.15,
                            letterSpacing: 'var(--tracking-tight)',
                            margin: 0,
                          }}
                        >
                          {post.title}
                        </h3>

                        {/* Excerpt */}
                        {post.excerpt && (
                          <p
                            style={{
                              fontSize: '14px',
                              color: 'var(--ugt-ink-2)',
                              lineHeight: 1.65,
                              margin: 0,
                              flex: 1,
                            }}
                          >
                            {post.excerpt}
                          </p>
                        )}

                        {/* Author + Date */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginTop: 'auto',
                            paddingTop: '12px',
                            borderTop: '1px solid var(--ugt-border)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--ugt-ink-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {post.author || 'Urban News'}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--ugt-ink-muted)' }}>
                            {formatDate(post.datePublished)}
                          </span>
                        </div>

                        {/* Read more */}
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: 'var(--ugt-magenta)',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Read more →
                        </span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
