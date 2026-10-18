import type {ShopCatalogueProduct} from '@/lib/shop-discovery';
import GeneratedProductImage from './GeneratedProductImage';
import styles from '../Commerce.module.css';
export default function DesignCatalogueCard({product}:{product:ShopCatalogueProduct}){
 const href='/shop/'+encodeURIComponent(product.id);
 return <article className={styles.productCard}>
  <a className={styles.productImage} href={href} aria-label={'View design: '+product.name}><GeneratedProductImage id={product.id}/><span className={styles.imageStatus}>Design · not on sale</span></a>
  <div className={styles.productMeta}><p className={styles.productCategory}>{product.category}</p><p className={styles.productPrice}>Proposed KES {product.price.toLocaleString('en-KE')}</p></div>
  <h2><a href={href}>{product.name}</a></h2>
  <p className={styles.productDescription}>{product.description}</p>
  <p className={styles.stockNote}>Samples, final price and stock not yet confirmed.</p>
  <div className={styles.cardActions}><a className="button secondary" href={href}>Explore design</a><a className={styles.detailLink} href="/shop/design-bag">Saved designs</a></div>
 </article>;
}
