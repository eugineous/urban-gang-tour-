'use client';

import type {LiveShopProduct, ShopCatalogueProduct} from '@/lib/shop-discovery';
import {PRINTABLE_NAME_MAX_LENGTH} from '@/lib/shared/merch-personalization';
import {ArrowDownRight, ArrowUpRight, Plus} from '@phosphor-icons/react';
import GeneratedProductImage from './merch/GeneratedProductImage';
import styles from './ShopCatalogue.module.css';

const money = (amount: number) => 'KES ' + amount.toLocaleString('en-KE');
const productHref = (id: string) => '/shop/' + encodeURIComponent(id);

/** Presentation only: availability, cart quantities and prices stay in LiveCommerce. */
export function ShopIntro({cartCount = 0, selected = '', heroProduct}: {
  cartCount?: number;
  selected?: string;
  heroProduct?: LiveShopProduct;
}) {
  return <header className={styles.hero}>
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>Urban Gang Tour · Official merchandise</p>
      <h1>Shop.</h1>
      <p className={styles.heroLine}>Wear the tour.</p>
      <p className={styles.heroNote}>Merchandise and Color Blast designs.</p>
      <nav className={styles.heroActions} aria-label="Shopping navigation">
        <a className={styles.primaryLink} href="#merchandise-catalogue">Shop all <span aria-hidden="true"><ArrowDownRight size={16} weight="bold" /></span></a>
        <a className={styles.cartLink} href="/cart">View cart ({cartCount})</a>
        {selected && <a className={styles.cartLink} href="/shop">View all merchandise</a>}
      </nav>
    </div>
    {heroProduct?.image && <a className={styles.heroImage} href={productHref(heroProduct.id)} aria-label={'View ' + heroProduct.name}>
      <img src={heroProduct.image} alt={heroProduct.name} decoding="async" fetchPriority="high" />
      <span>{heroProduct.name} <span aria-hidden="true"><ArrowUpRight size={14} weight="bold" /></span></span>
    </a>}
  </header>;
}

export function ShopLiveProductCard({product, variation, full, printableName = '', onVariation, onName, onAdd}: {
  product: LiveShopProduct;
  variation?: string;
  full: boolean;
  printableName?: string;
  onVariation: (value: string) => void;
  onName: (value: string) => void;
  onAdd: () => void;
}) {
  const chosen = product.variants.find(variant => variant.label === variation);
  const soldOut = product.stock === 0 || chosen?.stock === 0;
  const href = productHref(product.id);
  const hasOptions = !!product.variants.length || product.name_on_back_enabled;
  return <article className={styles.productCard} data-shop-product={product.id}>
    <a className={styles.productImage} href={href} aria-label={'View ' + product.name}>
      {product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <span className={styles.imageEmpty}>Product photograph coming soon.</span>}
      {soldOut && <span className={styles.imageStatus}>Out of stock</span>}
    </a>
    <div className={styles.productInfo}>
      <p className={styles.productCategory}>{product.category || 'Official merchandise'}</p>
      <h2><a href={href}>{product.name}</a></h2>
      <p className={styles.productPrice}>{money(product.price + (chosen?.priceAdjustment ?? 0))}</p>
    </div>
    <div className={styles.productPurchase}>
      {hasOptions && <details className={styles.productOptions}>
        <summary>Choose options <span aria-hidden="true"><Plus size={14} weight="bold" /></span></summary>
        <div className={styles.optionsBody}>
          {!!product.variants.length && <label>Size / colour
            <select aria-label={'Variation for ' + product.name} value={variation} onChange={event => onVariation(event.target.value)}>
              {product.variants.map(variant => <option value={variant.label} key={variant.label} disabled={variant.stock === 0}>{variant.label}{variant.stock === 0 ? ' · Out of stock' : ''}{variant.priceAdjustment ? ' · ' + (variant.priceAdjustment > 0 ? '+' : '') + money(variant.priceAdjustment) : ''}</option>)}
            </select>
          </label>}
          {product.name_on_back_enabled && <label>Name on the back · free
            <input aria-label={'Printed name for ' + product.name} maxLength={PRINTABLE_NAME_MAX_LENGTH} value={printableName} onChange={event => onName(event.target.value)} placeholder="Your name (optional)" />
          </label>}
          {product.description && <p className={styles.description}>{product.description}</p>}
        </div>
      </details>}
      {variation && <p className={styles.selectedOption}>{variation}</p>}
      <p className={styles.stockNote}>{typeof product.stock === 'number' ? product.stock > 0 ? product.stock + ' available' : 'Out of stock' : ''}{full && !soldOut ? ' · Your cart has the available quantity' : ''}</p>
      <div className={styles.cardActions}>
        <button type="button" disabled={full} onClick={onAdd}>{soldOut ? 'Out of stock' : full ? 'In your cart' : 'Add to cart'}</button>
        <a href={href}>View details <span aria-hidden="true"><ArrowUpRight size={14} weight="bold" /></span></a>
      </div>
    </div>
  </article>;
}

export function ShopDesignCard({product}: {product: ShopCatalogueProduct}) {
  const href = productHref(product.id);
  return <article className={styles.productCard} data-shop-design={product.id}>
    <a className={styles.productImage} href={href} aria-label={'View design: ' + product.name}>
      <GeneratedProductImage id={product.id} />
      <span className={styles.imageStatus}>Design · not on sale</span>
    </a>
    <div className={styles.productInfo}>
      <p className={styles.productCategory}>{product.category}</p>
      <h2><a href={href}>{product.name}</a></h2>
      <p className={styles.productPrice}>Proposed {money(product.price)}</p>
    </div>
    <div className={styles.productPurchase}>
      <div className={styles.cardActions}>
        <a className={styles.designLink} href={href}>Explore design <span aria-hidden="true"><ArrowUpRight size={14} weight="bold" /></span></a>
      </div>
    </div>
  </article>;
}

type ShopCatalogueProps = {
  products: ShopCatalogueProduct[];
  categories: string[];
  availability: string;
  search: string;
  sort: string;
  category: string;
  printableNames: Record<string, string>;
  onAvailability: (value: string) => void;
  onSearch: (value: string) => void;
  onSort: (value: string) => void;
  onCategory: (value: string) => void;
  variationFor: (product: LiveShopProduct) => string | undefined;
  selectionFull: (product: LiveShopProduct) => boolean;
  onVariation: (id: string, value: string) => void;
  onName: (id: string, value: string) => void;
  onAdd: (product: LiveShopProduct) => void;
};

export default function ShopCatalogueView(props: ShopCatalogueProps) {
  return <div className={styles.catalogue} id="merchandise-catalogue">
    <div className={styles.catalogueHeading}><h2>All merchandise</h2><p role="status">{props.products.length} {props.products.length === 1 ? 'product' : 'products'}</p></div>
    {props.products.some(product=>product.preview)&&<p className={styles.designNote} data-design-collection-note>Designs are not on sale. Samples, final prices and stock are unconfirmed. <a href="/shop/design-bag">Saved designs <span aria-hidden="true"><ArrowUpRight size={14}/></span></a></p>}
    <div className={styles.catalogueTools}>
      <label className={styles.search}>Search<input type="search" value={props.search} onChange={event => props.onSearch(event.target.value)} placeholder="Search merchandise" /></label>
      <label>Collection<select value={props.availability} onChange={event => props.onAvailability(event.target.value)}><option value="all">All merchandise & designs</option><option value="available">Products</option><option value="designs">Designs · not on sale</option></select></label>
      <label>Sort<select value={props.sort} onChange={event => props.onSort(event.target.value)}><option value="featured">Catalogue order</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
    </div>
    <div className={styles.categories} role="group" aria-label="Merchandise categories">
      <button type="button" aria-pressed={!props.category} onClick={() => props.onCategory('')}>All merchandise</button>
      {props.categories.map(name => <button key={name} type="button" aria-pressed={props.category === name} onClick={() => props.onCategory(name)}>{name}</button>)}
    </div>
    <div className={styles.productGrid}>
      {props.products.map(product => product.preview ? <ShopDesignCard key={product.id} product={product} /> : <ShopLiveProductCard key={product.id} product={product} variation={props.variationFor(product)} full={props.selectionFull(product)} printableName={props.printableNames[product.id]} onVariation={value => props.onVariation(product.id, value)} onName={value => props.onName(product.id, value)} onAdd={() => props.onAdd(product)} />)}
    </div>
  </div>;
}
