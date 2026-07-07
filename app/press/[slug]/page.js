import { notFound } from 'next/navigation';
import { getBlogPosts } from '@/lib/cms';
import JsonLd from '@/components/JsonLd';
import AdUnit from '@/components/AdUnit';
import { SiX, SiWhatsapp, SiFacebook } from 'react-icons/si';

const BASE_URL = 'https://urbangangtour.co.ke';

export async function generateMetadata({ params }) {
  const posts = await getBlogPosts('published');
  const post = posts.find((p) => p.slug === params.slug);

  if (!post) {
    return { title: 'Article Not Found | Urban Gang Tour' };
  }

  const title = `${post.title} | Urban Gang Tour`;
  const description = post.excerpt || post.title;
  const canonical = `${BASE_URL}/press/${post.slug}`;
  const imageUrl = post.featuredImage
    ? post.featuredImage.startsWith('http')
      ? post.featuredImage
      : `${BASE_URL}${post.featuredImage}`
    : `${BASE_URL}/assets/logos/ugt-logo-full.png`;

  return {
    title,
    description,
    keywords: post.tags
      ? `${post.tags}, Urban Gang Tour, Urban News Kenya, Kenyan school events, youth talent Kenya, school concert Kenya`
      : `Urban Gang Tour, Urban News Kenya, Kenyan school events, youth talent Kenya, ${post.category || ''}`,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      article: {
        publishedTime: post.datePublished,
        authors: [post.author || 'Urban News'],
        tags: post.tags ? post.tags.split(',').map((t) => t.trim()) : [],
      },
      images: [{ url: imageUrl, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
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

function ShareButtons({ title, url }) {
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} ${url}`);

  const buttons = [
    {
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      Icon: SiX,
      label: `Share "${title}" on X`,
      color: '#000',
    },
    {
      href: `https://wa.me/?text=${encodedText}`,
      Icon: SiWhatsapp,
      label: `Share "${title}" on WhatsApp`,
      color: '#25D366',
    },
    {
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: SiFacebook,
      label: `Share "${title}" on Facebook`,
      color: '#1877F2',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
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
        Share
      </span>
      {buttons.map(({ href, Icon, label, color }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          style={{
            width: '40px',
            height: '40px',
            border: 'var(--border-bold)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ugt-ink)',
            background: 'var(--ugt-white)',
            boxShadow: 'var(--shadow-sticker-xs)',
            fontSize: '16px',
            textDecoration: 'none',
            transition: 'transform var(--dur-base), box-shadow var(--dur-base)',
          }}
        >
          <Icon aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

export default async function PressPostPage({ params }) {
  const posts = await getBlogPosts('published');
  const post = posts.find((p) => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  const postUrl = `${BASE_URL}/press/${post.slug}`;
  const imageUrl = post.featuredImage
    ? post.featuredImage.startsWith('http')
      ? post.featuredImage
      : `${BASE_URL}${post.featuredImage}`
    : `${BASE_URL}/assets/logos/ugt-logo-full.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Article', 'NewsArticle'],
    headline: post.title,
    author: { '@type': 'Person', name: post.author || 'Urban News' },
    datePublished: post.datePublished,
    image: imageUrl,
    publisher: {
      '@type': 'Organization',
      name: 'Urban News',
      logo: {
        '@type': 'ImageObject',
        url: 'https://urbangangtour.co.ke/assets/logos/ugt-logo-full.png',
      },
      url: 'https://urbangangtour.co.ke/press',
    },
    articleSection: post.category || 'News',
    keywords: post.tags || '',
    inLanguage: 'en',
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
            <a
              href="/press"
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              ← Press &amp; Blog
            </a>
          </div>

          {post.category && (
            <div className="reveal" style={{ marginBottom: '12px' }}>
              <span className="chip chip-magenta">{post.category}</span>
            </div>
          )}

          <h1
            className="h-display reveal reveal-delay-1"
            style={{
              color: 'var(--ugt-white)',
              fontSize: 'clamp(32px, 5vw, 64px)',
              maxWidth: '860px',
              marginBottom: '16px',
            }}
          >
            {post.title}
          </h1>

          <div
            className="reveal reveal-delay-2"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <span>{post.author || 'Urban News'}</span>
            {post.datePublished && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {post.featuredImage && (
        <div
          style={{
            background: 'var(--ugt-ink)',
            borderBottom: 'var(--border-bold)',
          }}
        >
          <div className="container" style={{ padding: '0 40px' }}>
            <div
              style={{
                maxWidth: '860px',
                margin: '0 auto',
                transform: 'translateY(-32px)',
              }}
            >
              <img
                src={post.featuredImage}
                alt={post.title}
                style={{
                  width: '100%',
                  borderRadius: 'var(--r-xl)',
                  border: 'var(--border-bold)',
                  boxShadow: 'var(--shadow-sticker-ink)',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Article Body */}
      <section className="section-sm" style={{ background: 'var(--ugt-bg)' }}>
        <div className="container">
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {/* AdUnit — leaderboard above body */}
            <AdUnit slot="leaderboard-above-body" format="leaderboard" className="press-ad-top" />

            {/* Body text */}
            {post.body && (
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.75,
                  fontSize: 'var(--fs-body)',
                  color: 'var(--ugt-ink)',
                  margin: '0 0 40px',
                }}
              >
                {post.body}
              </div>
            )}

            {/* AdUnit — rectangle mid-body */}
            <AdUnit slot="rectangle-mid-body" format="rectangle" className="press-ad-mid" />

            {/* Share buttons */}
            <div
              style={{
                borderTop: 'var(--border-thin)',
                paddingTop: '32px',
                marginTop: '40px',
              }}
            >
              <ShareButtons title={post.title} url={postUrl} />
            </div>

            {/* Tags */}
            {post.tags && (
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
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
                  Tags:
                </span>
                {post.tags.split(',').map((tag) => (
                  <span
                    key={tag.trim()}
                    className="chip chip-outline"
                    style={{ fontSize: '11px' }}
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section-dark">
        <div className="container">
          <div style={{ maxWidth: '560px' }} className="reveal">
            <div className="eyebrow" style={{ color: 'var(--ugt-orange)' }}>Urban Gang Tour</div>
            <h2
              className="h-display h-md"
              style={{ color: 'var(--ugt-white)', margin: '12px 0 16px' }}
            >
              More stories from the UGT.
            </h2>
            <a href="/press" className="btn btn-magenta btn-lg">
              Back to Press &amp; Blog
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
