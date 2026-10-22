import {normalizePosterUrl, posterUrl} from '../../lib/partner-events';
import type {LiveShopProduct} from '../../lib/shop-discovery';
import {ownedEventPresentation, type OwnedEvent} from './owned-event-presentation';
import promotionHolds from '../data/home-promotion-holds.json';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const limitTo = (value: number, maximum: number) => Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : 0;

/** Promotion uses public, dated records only; the event page still owns ticket availability. */
export function homepageUpcomingEvents(events: OwnedEvent[], now: number, limit = 3): OwnedEvent[] {
  if (!Number.isFinite(now) || now <= 0) return [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  return events.filter(event => {
    if (!event || typeof event !== 'object') return false;
    const view = ownedEventPresentation(event, now);
    const slug = text(event.slug);
    // Bind a known contradictory promotion to its exact immutable artwork,
    // never to the event permanently. The public event record stays intact.
    if (promotionHolds.some(hold => hold.slug === slug && hold.image === text(event.image))) return false;
    if (!view.publicEvent || view.past || !view.dateTime || !text(event.name) ||
      !/^[a-z0-9-]{1,80}$/.test(slug) ||
      !['announced', 'published', 'ongoing', 'sales_paused', 'sold_out', 'rescheduled'].includes(text(event.status))) return false;
    return true;
  }).sort((a, b) => Number(b.status === 'ongoing') - Number(a.status === 'ongoing') ||
    text(a.eventDate).localeCompare(text(b.eventDate)) ||
    (Number(b.priority) || 0) - (Number(a.priority) || 0)
  ).filter(event => {
    const id = text(event.id);
    const slug = text(event.slug);
    if (seenSlugs.has(slug) || (id && seenIds.has(id))) return false;
    seenSlugs.add(slug);
    if (id) seenIds.add(id);
    return true;
  }).slice(0, limitTo(limit, 12));
}

/** A display-only selection from the public live catalogue, never proposed designs. */
export function homepageProducts(products: Array<LiveShopProduct | Record<string, unknown>>, limit = 4): LiveShopProduct[] {
  const seen = new Set<string>();
  const valid: LiveShopProduct[] = [];
  for (const candidate of products) {
    if (!candidate || typeof candidate !== 'object') continue;
    const product = candidate as LiveShopProduct & {preview?: boolean; active?: boolean};
    const id = text(product.id);
    const image = normalizePosterUrl(text(product.image));
    if (!id || !text(product.name) || seen.has(id) || product.preview === true || product.active === false ||
      typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0 || !image || !posterUrl(image)) continue;
    seen.add(id);
    valid.push(product);
  }
  // Give different collections room before repeating a category. Within each
  // category, retain the CMS/public catalogue order rather than inventing rank.
  const categories = new Set<string>();
  const first: LiveShopProduct[] = [];
  const rest: LiveShopProduct[] = [];
  for (const product of valid) {
    const category = text(product.category).toLocaleLowerCase('en-KE');
    if (categories.has(category)) rest.push(product);
    else { categories.add(category); first.push(product); }
  }
  return [...first, ...rest].slice(0, limitTo(limit, 12));
}

function validProductVariants(product: LiveShopProduct) {
  return (Array.isArray(product.variants) ? product.variants : [])
    .filter(variant => variant && typeof variant === 'object' && text(variant.label) &&
      typeof variant.priceAdjustment === 'number' && Number.isFinite(variant.priceAdjustment) &&
      Number.isFinite(product.price + variant.priceAdjustment) && product.price + variant.priceAdjustment >= 0);
}

/** Unknown inventory is not a claim of being either available or sold out. */
export function homepageProductSoldOut(product: LiveShopProduct): boolean {
  if (product.stock === 0) return true;
  const variants = validProductVariants(product);
  return variants.length > 0 && variants.every(variant => variant.stock === 0);
}

/** Show the actual option floor, not a base price no selectable option can buy. */
export function homepageProductPrice(product: LiveShopProduct): string {
  if (!Number.isFinite(product.price) || product.price < 0) return 'View price';
  const variants = validProductVariants(product);
  const available = variants.filter(variant => variant.stock !== 0);
  // Keep an out-of-stock item's list price for its paired stock badge. When
  // alternatives exist, an unavailable cheaper option must not set the floor.
  const prices = (available.length ? available : variants).map(variant => product.price + variant.priceAdjustment);
  const minimum = prices.length ? Math.min(...prices) : product.price;
  const varies = prices.length > 0 && Math.max(...prices) !== minimum;
  return (varies ? 'From ' : '') + 'KES ' + minimum.toLocaleString('en-KE', {maximumFractionDigits: 2});
}
