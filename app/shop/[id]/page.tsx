import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';
import { hasDb, q } from '@/lib/server/db';

export const revalidate = 300;

// Pre-generate active products for ISR. An unavailable database at build time
// yields no pre-generated pages (honest empty list); pages are then rendered
// on demand and cached for the revalidate window.
export async function generateStaticParams() {
  if (!hasDb()) return [];
  try {
    const rows = await q<{ id: string }>(`SELECT id FROM products WHERE active`);
    return rows.map((r) => ({ id: r.id }));
  } catch {
    return [];
  }
}

type Variant = { label: string; priceAdjustment: number; sku: string };
type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  variants: Variant[] | string;
};

const productForPage = cache(async (id: string): Promise<Product | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(id) || !hasDb()) return null;
  const rows = await q<Product>(
    `SELECT p.id, p.name, p.price, p.image, p.category, p.description,
            COALESCE(
              jsonb_agg(jsonb_build_object('label', v.label, 'priceAdjustment', v.price_adjustment, 'sku', v.sku)
                ORDER BY v.label) FILTER (WHERE v.id IS NOT NULL),
              '[]'::jsonb
            ) AS variants
     FROM products p
     LEFT JOIN merch_variants v ON v.product_id=p.id AND v.active=true
     WHERE p.id=$1 AND p.active
     GROUP BY p.id, p.name, p.price, p.image, p.category, p.description`,
    [id],
  );
  return rows[0] || null;
});

function safeVariants(value: Product['variants']): Variant[] {
  try {
    const rows = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(rows)
      ? rows.filter((variant) => typeof variant?.label === 'string').map((variant) => ({
        label: String(variant.label),
        priceAdjustment: Number(variant.priceAdjustment || 0),
        sku: String(variant.sku || ''),
      }))
      : [];
  } catch {
    return [];
  }
}

function money(value: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

function imageUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `${SITE.domain}${value}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await productForPage(id);
  if (!product) return {};
  const path = `/shop/${product.id}`;
  const description = product.description || `Official Urban Gang Tour ${product.name}.`;
  return {
    title: `${product.name} | Urban Gang Merch`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${product.name} | Urban Gang Merch`,
      description,
      url: path,
      images: product.image ? [{ url: product.image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await productForPage(id);
  if (!product) notFound();
  const variants = safeVariants(product.variants);
  const path = `/shop/${product.id}`;
  const reviewRows = await q<{ author: string; rating: number; body: string; created_at: string }>(
    `SELECT author, rating, body, created_at::text AS created_at
     FROM product_reviews WHERE product_id=$1 AND approved ORDER BY created_at DESC LIMIT 3`,
    [product.id],
  ).catch(() => []);
  const reviews = reviewRows.filter((review) => review.author && review.body && Number.isFinite(Number(review.rating)));
  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE.domain}${path}#product`,
    name: product.name,
    sku: product.id,
    url: `${SITE.domain}${path}`,
    image: product.image ? [imageUrl(product.image)] : undefined,
    description: product.description || undefined,
    category: product.category || undefined,
    brand: { '@id': `${SITE.domain}/#org` },
    offers: {
      '@type': 'Offer',
      url: `${SITE.domain}${path}`,
      price: String(Math.round(Number(product.price))),
      priceCurrency: 'KES',
    },
  };
  if (reviews.length) {
    productJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round((reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    productJsonLd.review = reviews.map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.author },
      reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      reviewBody: review.body,
      datePublished: String(review.created_at).slice(0, 10),
    }));
  }

  return <main style={{ minHeight: '100vh', background: '#fffafc', color: '#111', fontFamily: 'var(--font-space-grotesk), Arial, sans-serif' }}>
    <JsonLd data={productJsonLd} />
    <header style={{ background: '#111', borderBottom: '4px solid #111', padding: '14px 20px' }}>
      <a href="/" aria-label="Urban Gang Tour home" style={{ display: 'inline-flex' }}>
        <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" style={{ display: 'block', height: 46, maxWidth: 'min(260px, 70vw)', objectFit: 'contain' }} />
      </a>
    </header>
    <section style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(28px,6vw,72px) 20px 84px' }}>
      <a href="/shop" style={{ color: '#111', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em' }}>← Back to merch</a>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(290px,440px)', gap: 'clamp(28px,6vw,72px)', marginTop: 26, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '3px solid #111', borderRadius: 24, minHeight: 360, padding: 'clamp(18px,4vw,42px)', boxShadow: '8px 8px 0 #21C7E6', display: 'grid', placeItems: 'center' }}>
          {product.image ? <img src={product.image} alt={product.name} style={{ display: 'block', width: '100%', maxHeight: 570, objectFit: 'contain' }} /> : <div style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 48, textTransform: 'uppercase' }}>Urban<br />Gang</div>}
        </div>
        <div>
          <p style={{ display: 'inline-block', margin: 0, padding: '5px 9px', background: '#FFD400', border: '2px solid #111', borderRadius: 7, fontWeight: 900, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>{product.category || 'Official merch'}</p>
          <h1 style={{ margin: '17px 0 10px', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 'clamp(42px,6vw,68px)', lineHeight: .92, textTransform: 'uppercase' }}>{product.name}</h1>
          <p style={{ margin: '0 0 20px', color: '#E6218C', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 30 }}>{money(Number(product.price))}</p>
          {product.description ? <p style={{ margin: '0 0 24px', color: '#383238', fontSize: 17, fontWeight: 600, lineHeight: 1.6 }}>{product.description}</p> : null}
          {variants.length ? <div style={{ margin: '0 0 26px', borderTop: '2px solid #111', borderBottom: '2px solid #111', padding: '15px 0' }}><p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Available options</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{variants.map((variant) => <span key={variant.label} style={{ border: '2px solid #111', borderRadius: 999, padding: '7px 11px', fontSize: 13, fontWeight: 800 }}>{variant.label}{variant.priceAdjustment ? ` · ${variant.priceAdjustment > 0 ? '+' : ''}${money(variant.priceAdjustment)}` : ''}</span>)}</div></div> : null}
          <a href={`/shop?item=${encodeURIComponent(product.id)}`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: '#E6218C', color: '#fff', border: '3px solid #111', borderRadius: 13, padding: '15px 18px', boxShadow: '5px 5px 0 #111', fontFamily: 'var(--font-anton), Impact, sans-serif', fontSize: 20, textTransform: 'uppercase' }}>Choose options and add to bag</a>
          <p style={{ margin: '17px 0 0', color: '#555', fontSize: 13, lineHeight: 1.5 }}>Checkout shows the available payment options. Product price is confirmed securely by the server at checkout.</p>
        </div>
      </div>
    </section>
  </main>;
}
