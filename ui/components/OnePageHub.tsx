'use client';
import {ArrowUpRight,ShoppingCart} from '@phosphor-icons/react';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {onePageMessages} from '@/ui/i18n/catalogues/onepage';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {OriginalContent} from '@/ui/i18n/OriginalContent';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
import type {LiveShopProduct} from '@/lib/shop-discovery';
import {homepageProducts} from '@/ui/lib/home-discovery';
import {LiveCommerce} from '@/app/_components/LiveCommerce';
import {PublicationDate} from './PublicationDate';
import library from '@/ui/data/media-library.json';
import styles from './OnePageHub.module.css';

const modules=[
 {key:'events',href:'/events',image:'M083'},
 {key:'gallery',href:'/gallery',image:'M082'},
 {key:'clients',href:'/clients',image:'M207'},
 {key:'book',href:'/book',image:'M234'},
 {key:'vendors',href:'/vendors',image:'M120'},
 {key:'about',href:'/about',image:'M230'},
] as const;

/** Module links use owned archive images, never a competitor's assets. */
export function HomeMicrocards(){
 const t=useMessages(onePageMessages);
 return <section id="explore" className={styles.section} aria-labelledby="explore-title">
  <div className={styles.sectionHead}>
   <div><p className={styles.eyebrow}>{t('explore.eyebrow')}</p><h2 id="explore-title">{t('explore.title')}</h2></div>
   <p className={styles.intro}>{t('explore.summary')}</p>
  </div>
  <div className={styles.moduleGrid}>{modules.map(module=>{
   const media=library.assets.find(image=>image.id===module.image);
   return <a className={styles.microcard} href={module.href} key={module.key} data-module-card={module.key}>
    {media&&<div className={styles.moduleImage}><img src={media.src} alt="" loading="lazy" decoding="async"/></div>}
    <div className={styles.moduleBody}><h3>{t(`modules.${module.key}.title`)}</h3><p>{t(`modules.${module.key}.summary`)}</p><span className={styles.cardAction}>{t('module.action')}<ArrowUpRight size={17} aria-hidden="true"/></span></div>
   </a>;
  })}</div>
 </section>;
}

export function HomeCollection({products,current=true}:{products:LiveShopProduct[];current?:boolean}){
 const t=useMessages(onePageMessages),commerce=useMessages(commerceMessages);
 // Preserve the retirement and public-record boundary while keeping all24
 // genuine products, rather than applying the old twelve-item promotion cap.
 const live=products.filter(product=>!/^p(?:[1-9]|1[0-4])$/.test(product.id)&&homepageProducts([product],1).length===1);
 return <section className={styles.collection} aria-labelledby="collection-title">
  <div className={`${styles.section} ${styles.collectionHead}`}>
   <div className={styles.sectionHead}>
    <div><p className={styles.eyebrow}>{t('shop.eyebrow')}</p><h2 id="collection-title">{t('shop.title')}</h2><p className={styles.collectionNote}>{t('shop.summary')}</p></div>
    <a className={styles.outlineAction} href="/cart"><ShoppingCart size={19} aria-hidden="true"/>{t('shop.viewCart')}<ArrowUpRight size={17} aria-hidden="true"/></a>
   </div>
  </div>
  {current?<LiveCommerce embedded initialProducts={live}/>:<div className={styles.section} role="status"><p>{commerce('catalogue.loadFailed')}</p><a className={styles.outlineAction} href="/shop">{commerce('shop.viewAll')}</a></div>}
 </section>;
}

export type HubPost={id?:string;headline?:string;date?:string;img?:string;section?:string;dek?:string;status?:string};
export function StoryMicrocards({posts}:{posts:ReadonlyArray<HubPost>}){
 const t=useMessages(onePageMessages);
 const visible=newestPublishedFirst(posts.filter((post):post is HubPost&{id:string;headline:string}=>
  typeof post.id==='string'&&/^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/.test(post.id)
  &&typeof post.headline==='string'&&!!post.headline.trim()
  &&(!post.status||post.status==='published'))).slice(0,3);
 if(!visible.length)return null;
 return <section id="stories" className={styles.section} aria-labelledby="stories-title">
  <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{t('stories.eyebrow')}</p><h2 id="stories-title">{t('stories.title')}</h2></div><a className={styles.outlineAction} href="/blog">{t('stories.all')}<ArrowUpRight size={17} aria-hidden="true"/></a></div>
  <div className={styles.storyGrid}>{visible.map(post=><article className={styles.storyCard} key={post.id} data-story-card={post.id}>
   <a href={'/blog/'+encodeURIComponent(post.id)} className={styles.storyLink}>
    {post.img&&<div className={styles.storyImage}><img src={post.img} alt="" loading="lazy" decoding="async"/></div>}
    <div className={styles.storyBody}><div className={styles.storyMeta}>{post.section&&<OriginalContent inline>{post.section}</OriginalContent>}{post.date&&<PublicationDate value={post.date}/>}</div><h3><OriginalContent inline>{post.headline}</OriginalContent></h3>{post.dek&&<p><OriginalContent inline>{post.dek}</OriginalContent></p>}<span className={styles.cardAction}>{t('stories.read')}<ArrowUpRight size={17} aria-hidden="true"/></span></div>
   </a>
  </article>)}</div>
 </section>;
}
