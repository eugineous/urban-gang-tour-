import {ProductPurchase} from '@/app/_components/ProductPurchase';
import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';
import { PhotoGallery } from '@/app/_components/PhotoGallery';
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

  return <main className="product-page">
    <JsonLd data={productJsonLd} />
    <div className="wrap breadcrumbs"><a href="/shop">Shop</a><span>/</span><span>{product.name}</span></div>
    <section className="product-detail wrap">
      <div className="detail-image ugt-product-photo">{product.image?<PhotoGallery photos={[{id:product.id,url:product.image,altText:product.name}]}/>:<p>Product photograph coming soon.</p>}</div>
      <div className="product-info"><p className="eyebrow">{product.category||'Official merchandise'}</p><h1>{product.name}</h1><p className="price">{money(Number(product.price))}</p>{product.description&&<p>{product.description}</p>}<ProductPurchase id={product.id} price={Number(product.price)} variants={variants}/></div>
    </section>
    {reviews.length>0&&<section className="wrap product-reviews"><h2>Customer reviews</h2>{reviews.map((review,i)=><article key={i}><h3>{review.author}</h3><p>{review.rating} / 5</p><p>{review.body}</p></article>)}</section>}
  </main>;
}
