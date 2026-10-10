import {ProductReviewForm} from '@/app/_components/ProductReviewForm';
import {ensureOpsSchema} from '@/lib/server/ops';
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

type Variant = { label: string; priceAdjustment: number; sku: string; stock?:number|null };
type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  variants: Variant[] | string;
  stock: number|null;
  photos?: unknown;
  size_guide?:string;
};

const productForPage = cache(async (id: string): Promise<Product | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(id) || !hasDb()) return null;
  await ensureOpsSchema();
  const rows = await q<Product>(
    `SELECT p.id, p.name, p.price, p.image, p.category, p.description,
            to_jsonb(p)->'photos' AS photos, to_jsonb(p)->>'size_guide' AS size_guide,
            CASE WHEN p.inventory_tracked THEN (SELECT COALESCE(SUM(quantity),0)::int FROM merch_inventory_moves WHERE product_id=p.id) ELSE NULL END AS stock,
            COALESCE(
              jsonb_agg(jsonb_build_object('label', v.label, 'priceAdjustment', v.price_adjustment, 'sku', v.sku,'stock',(SELECT CASE WHEN COUNT(*)>0 THEN COALESCE(SUM(quantity),0)::int ELSE NULL END FROM merch_inventory_moves WHERE variant_id=v.id))
                ORDER BY v.label) FILTER (WHERE v.id IS NOT NULL),
              '[]'::jsonb
            ) AS variants
     FROM products p
     LEFT JOIN merch_variants v ON v.product_id=p.id AND v.active=true
     WHERE p.id=$1 AND p.active
     GROUP BY p.id, p.name, p.price, p.image, p.category, p.description, p.inventory_tracked`,
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
        stock:variant.stock===null||variant.stock===undefined?null:Math.max(0,Number(variant.stock)),
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
  const extra=Array.isArray(product.photos)?product.photos.filter((x):x is string=>typeof x==='string'&&(/^(https?:\/\/|\/(?!\/))/.test(x))):[];
  const photos=[...new Set([product.image,...extra].filter(Boolean))].map((url,i)=>({id:product.id+'-'+i,url,altText:product.name+' · photograph '+(i+1)}));
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
      <div className="detail-image ugt-product-photo">{photos.length?<PhotoGallery photos={photos}/>:<p>Product photograph coming soon.</p>}</div>
      <div className="product-info"><p className="eyebrow">{product.category||'Official merchandise'}</p><h1>{product.name}</h1><p className="price">{money(Number(product.price))}</p>{product.description&&<p>{product.description}</p>}<ProductPurchase id={product.id} price={Number(product.price)} variants={variants} stock={product.stock}/>{product.size_guide&&<details><summary>Size guide</summary><p>{product.size_guide}</p></details>}</div>
    </section>
    {reviews.length>0&&<section className="wrap product-reviews"><h2>Customer reviews</h2>{reviews.map((review,i)=><article key={i}><h3>{review.author}</h3><p>{review.rating} / 5</p><p>{review.body}</p></article>)}</section>}
    <section className="wrap product-reviews"><ProductReviewForm productId={product.id}/></section>
  </main>;
}
