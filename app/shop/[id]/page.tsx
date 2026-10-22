import {ProductReviewForm} from '@/app/_components/ProductReviewForm';
import {ensureOpsSchema} from '@/lib/server/ops';
import {ProductPurchase} from '@/app/_components/ProductPurchase';
import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';
import { ProductGallery } from '@/app/_components/ProductGallery';
import styles from '@/app/_components/Commerce.module.css';
import { hasDb, q } from '@/lib/server/db';
import {getMerchProduct,ARTWORK} from '@/data/color-blast';
import ColorBlastShop from '@/app/_components/merch/ColorBlastShop';
import {ShareActions} from '@/ui/components/ShareActions';
import {discoveryImageUrl} from '@/app/_lib/seo';

// A design can become a real, owner-approved product. Never bake the build's
// absent database/stock into a five-minute concept page for that same ID.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  name_on_back_enabled?:boolean|string;
};

const productForPage = cache(async (id: string): Promise<Product | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(id) || !hasDb()) return null;
  await ensureOpsSchema();
  const rows = await q<Product>(
    `SELECT p.id, p.name, p.price, p.image, p.category, p.description,
            to_jsonb(p)->'photos' AS photos, to_jsonb(p)->>'size_guide' AS size_guide,
            to_jsonb(p)->>'name_on_back_enabled' AS name_on_back_enabled,
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

function imageUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `${SITE.domain}${value}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const preview=getMerchProduct(id);
  const product = await productForPage(id).catch(error=>{if(preview)return null;throw error});
  if (!product && preview) {
    const title = preview.name + ' | Color Blast Design Preview';
    const description = preview.description + ' Proposed design; samples and stock unconfirmed.';
    const url = `${SITE.domain}/shop/${encodeURIComponent(id)}`;
    const image = discoveryImageUrl(ARTWORK) || SITE.defaultOg;
    return {
      title, description, alternates: {canonical: url},
      openGraph: {type: 'website', siteName: SITE.name, title, description, url, images: [{url: image, alt: preview.name}]},
      twitter: {card: 'summary_large_image', title, description, images: [image]},
    };
  }
  if (!product) return {};
  const path = `/shop/${product.id}`;
  const description = product.description || `Official Urban Gang Tour ${product.name}.`;
  const title = `${product.name} | Urban Gang Merch`;
  const image = discoveryImageUrl(product.image) || SITE.defaultOg;
  return {
    title,
    description,
    alternates: { canonical: SITE.domain + path },
    openGraph: {
      type: 'website', siteName: SITE.name, locale: 'en_KE',
      title,
      description,
      url: SITE.domain + path,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {card: 'summary_large_image', title, description, images: [image]},
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preview=getMerchProduct(id);
  const product = await productForPage(id).catch(error=>{if(preview)return null;throw error});
  if(!product&&preview)return <ColorBlastShop product={preview}/>;
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

  return <section className={`product-page ${styles.productPage}`}>
    <JsonLd data={productJsonLd} />
    <div className="wrap breadcrumbs"><a href="/shop">Shop</a><span>/</span><span>{product.name}</span></div>
    <section className={`product-detail wrap ${styles.productDetail}`}>
      <ProductGallery photos={photos} name={product.name}/>
      <div className={`product-info ${styles.productInformation}`}><p className="eyebrow">{product.category||'Official merchandise'}</p><h1>{product.name}</h1><ShareActions title={product.name} path={'/shop/'+product.id} label="Share this product"/>{product.description&&<p className={styles.description}>{product.description}</p>}<ProductPurchase id={product.id} price={Number(product.price)} variants={variants} stock={product.stock} nameOnBackEnabled={product.name_on_back_enabled===true||product.name_on_back_enabled==='true'}/>{product.size_guide&&<details><summary>Size guide</summary><p>{product.size_guide}</p></details>}</div>
    </section>
    {reviews.length>0&&<section className={`wrap product-reviews ${styles.reviewSection}`}><p className="eyebrow">From the community</p><h2>Customer reviews</h2><div className={styles.reviewGrid}>{reviews.map((review,i)=><article key={i}><h3>{review.author}</h3><p className={styles.rating}>{review.rating} / 5</p><p>{review.body}</p></article>)}</div></section>}
    <section className={`wrap product-reviews ${styles.reviewSection}`}><ProductReviewForm productId={product.id}/></section>
  </section>;
}
