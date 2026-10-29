'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages,useInterfaceLanguage} from '@/ui/i18n/LanguageProvider';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {formatKes} from '@/lib/i18n/format';

import type {LiveShopProduct, ShopCatalogueProduct} from '@/lib/shop-discovery';
import {PRINTABLE_NAME_MAX_LENGTH} from '@/lib/shared/merch-personalization';
import {ArrowDownRight, ArrowUpRight, Plus} from '@phosphor-icons/react';
import GeneratedProductImage from './merch/GeneratedProductImage';
import Link from '@/ui/components/DocumentLink';
import styles from './ShopCatalogue.module.css';

const productHref = (id: string) => '/shop/' + encodeURIComponent(id);

/** Presentation only: availability, cart quantities and prices stay in LiveCommerce. */
export function ShopIntro({cartCount = 0, selected = '', featuredProduct}: {
  cartCount?: number;
  selected?: string;
  featuredProduct?: LiveShopProduct;
}) {
 const t=useMessages(commerceMessages);
 const featured=featuredProduct?.made_to_order&&featuredProduct.id.startsWith('cb-')?featuredProduct:undefined;
  return <header className={styles.hero}>
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>{t('shop.brand')}</p>
      <h1>{t('shop.heading')}</h1>
      <p className={styles.heroLine}>Color Blast.</p>
      <p className={styles.heroNote}>{t('shop.explore')}</p>
      <nav className={styles.heroActions} aria-label={t('shop.navigation')}>
        <a className={styles.primaryLink} href="#merchandise-catalogue">{t('shop.shopAll')} <span aria-hidden="true"><ArrowDownRight size={16} weight="bold" /></span></a>
        <a className={styles.cartLink} href="/shop/lookbook#original-colourways">Original colourways</a>
        <a className={styles.cartLink} href="/cart">{t('cart.viewCount',{count:cartCount})}</a>
        {selected && <a className={styles.cartLink} href="/shop">{t('shop.viewAll')}</a>}
      </nav>
    </div>
    <Link className={styles.heroImage} href={featured?productHref(featured.id):'/shop/lookbook'} aria-label={featured?t('product.view',{name:featured.name}):t('design.exploreLabel')}>
      <div className={styles.heroArtwork}><GeneratedProductImage id={featured?.id||'cb-oversized-tee'} colour="Black" /></div>
      <span>{featured?t('stock.madeToOrder'):t('design.preview')} <span aria-hidden="true"><ArrowUpRight size={14} weight="bold" /></span></span>
    </Link>
  </header>;
}

export function ShopNoProductsNotice() {
 const t=useMessages(commerceMessages);
  return <><p className="eyebrow">{t('shop.merchandise')}</p><h2>{t('shop.noProducts')}</h2><p><MessageText catalogue={commerceMessages} message="design.emptyNote" values={{lookbook:<Link href="/shop/lookbook">{t('design.lookbook')}</Link>}}/></p><Link className="button" href="/contact-us">{t('shop.ask')}</Link></>;
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
 const t=useMessages(commerceMessages);const {locale}=useInterfaceLanguage();const money=(amount:number)=>formatKes(amount,locale)??'';
  const chosen = product.variants.find(variant => variant.label === variation);
  const soldOut = product.stock === 0 || chosen?.stock === 0;
  const href = productHref(product.id);
  const hasOptions = !!product.variants.length || product.name_on_back_enabled;
  return <article className={styles.productCard} data-shop-product={product.id}>
    <a className={styles.productImage} href={href} aria-label={t('product.view',{name:product.name})}>
      {product.made_to_order&&product.id.startsWith('cb-')?<GeneratedProductImage id={product.id} colour={variation?.split(' / ')[0]}/>:product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <span className={styles.imageEmpty}>{t('product.photoSoon')}</span>}
      {soldOut && <span className={styles.imageStatus}>{t('stock.out')}</span>}
    </a>
    <div className={styles.productInfo}>
      <p className={styles.productCategory}>{product.category?<span lang="en-KE">{product.category}</span>:t('shop.official')}</p>
      <h2><a href={href} lang="en-KE">{product.name}</a></h2>
      <p className={styles.productPrice}>{money(product.price + (chosen?.priceAdjustment ?? 0))}</p>
    </div>
    <div className={styles.productPurchase}>
      {hasOptions && <details className={styles.productOptions}>
        <summary>{t('product.options')} <span aria-hidden="true"><Plus size={14} weight="bold" /></span></summary>
        <div className={styles.optionsBody}>
          {!!product.variants.length && <label>{t('product.sizeColour')}
            <select aria-label={t('product.variation',{name:product.name})} value={variation} onChange={event => onVariation(event.target.value)}>
              {product.variants.map(variant => <option value={variant.label} key={variant.label} disabled={variant.stock === 0}>{variant.label}{variant.stock === 0 ? ' · '+t('stock.out') : ''}{variant.priceAdjustment ? ' · ' + (variant.priceAdjustment > 0 ? '+' : '') + money(variant.priceAdjustment) : ''}</option>)}
            </select>
          </label>}
          {product.name_on_back_enabled && <label>{t('personalization.freeLabel')}
            <input aria-label={t('personalization.for',{name:product.name})} maxLength={PRINTABLE_NAME_MAX_LENGTH} value={printableName} onChange={event => onName(event.target.value)} placeholder={t('personalization.placeholder')} />
          </label>}
          {product.description && <p className={styles.description} lang="en-KE">{product.description}</p>}
        </div>
      </details>}
      {variation && <p className={styles.selectedOption} lang="en-KE">{variation}</p>}
      <p className={styles.stockNote}>{product.made_to_order?t('stock.madeToOrder'):typeof product.stock === 'number' ? product.stock > 0 ? t('stock.available',{count:product.stock}) : t('stock.out') : ''}{full && !soldOut ? t('stock.cartFull') : ''}</p>
      <div className={styles.cardActions}>
        <button type="button" disabled={full} onClick={onAdd}>{soldOut ? t('stock.out') : full ? t('stock.inCart') : t('cart.add')}</button>
        <a href={href}>{t('product.details')} <span aria-hidden="true"><ArrowUpRight size={14} weight="bold" /></span></a>
      </div>
    </div>
  </article>;
}

export function ShopDesignCard({product}: {product: ShopCatalogueProduct}) {
 const t=useMessages(commerceMessages);const {locale}=useInterfaceLanguage();const money=(amount:number)=>formatKes(amount,locale)??'';
  const href = productHref(product.id);
  return <article className={styles.productCard} data-shop-design={product.id}>
    <a className={styles.productImage} href={href} aria-label={t('design.viewName',{name:product.name})}>
      <GeneratedProductImage id={product.id} />
      <span className={styles.imageStatus}>{t('design.notOnSale')}</span>
    </a>
    <div className={styles.productInfo}>
      <p className={styles.productCategory} lang="en-KE">{product.category}</p>
      <h2><a href={href} lang="en-KE">{product.name}</a></h2>
      <p className={styles.productPrice}>{t('design.proposed',{amount:money(product.price)})}</p>
    </div>
    <div className={styles.productPurchase}>
      <div className={styles.cardActions}>
        <a className={styles.designLink} href={href}>{t('design.explore')} <span aria-hidden="true"><ArrowUpRight size={14} weight="bold" /></span></a>
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
 const t=useMessages(commerceMessages);
  return <div className={styles.catalogue} id="merchandise-catalogue">
    <div className={styles.catalogueHeading}><h2>{t('shop.all')}</h2><p role="status">{t('items.count',{count:props.products.length})}</p></div>
    {props.products.some(product=>product.preview)&&<p className={styles.designNote} data-design-collection-note>{t('design.warning')} <a href="/shop/design-bag">{t('bag.saved')} <span aria-hidden="true"><ArrowUpRight size={14}/></span></a></p>}
    <div className={styles.catalogueTools}>
      <label className={styles.search}>{t('search')}<input type="search" value={props.search} onChange={event => props.onSearch(event.target.value)} placeholder={t('search.merch')} /></label>
      <label>{t('collection')}<select value={props.availability} onChange={event => props.onAvailability(event.target.value)}><option value="all">{t('collection.all')}</option><option value="available">{t('collection.products')}</option><option value="designs">{t('design.filter')}</option></select></label>
      <label>{t('sort')}<select value={props.sort} onChange={event => props.onSort(event.target.value)}><option value="featured">{t('sort.catalogue')}</option><option value="low">{t('sort.low')}</option><option value="high">{t('sort.high')}</option></select></label>
    </div>
    <div className={styles.categories} role="group" aria-label={t('categories')}>
      <button type="button" aria-pressed={!props.category} onClick={() => props.onCategory('')}>{t('shop.all')}</button>
      {props.categories.map(name => <button key={name} lang="en-KE" type="button" aria-pressed={props.category === name} onClick={() => props.onCategory(name)}>{name}</button>)}
    </div>
    <div className={styles.productGrid}>
      {props.products.map(product => product.preview ? <ShopDesignCard key={product.id} product={product} /> : <ShopLiveProductCard key={product.id} product={product} variation={props.variationFor(product)} full={props.selectionFull(product)} printableName={props.printableNames[product.id]} onVariation={value => props.onVariation(product.id, value)} onName={value => props.onName(product.id, value)} onAdd={() => props.onAdd(product)} />)}
    </div>
  </div>;
}
