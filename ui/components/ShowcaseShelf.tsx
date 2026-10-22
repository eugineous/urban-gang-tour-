'use client';

import {useEffect, useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, Play} from '@phosphor-icons/react';
import Link from './DocumentLink';
import {MediaImage} from './MediaLibrary';
import styles from './ShowcaseShelf.module.css';

export type ShowcaseItem = {
  id:string;
  title:string;
  href:string;
  label:string;
  action:string;
  description?:string;
  mediaId?:string;
  image?:string;
  imageAlt?:string;
  filmDuration?:string;
};

type ShelfMetrics = {scrollLeft:number; scrollWidth:number; clientWidth:number};

/** Wrap the existing row, without cloning cards or adding a second tab sequence. */
export function shelfScrollTarget({scrollLeft, scrollWidth, clientWidth}:ShelfMetrics, direction:1|-1) {
  const end=Math.max(0, scrollWidth-clientWidth);
  const current=Math.min(end, Math.max(0, scrollLeft));
  if (end<=2) return 0;
  if (direction===1 && current>=end-2) return 0;
  if (direction===-1 && current<=2) return end;
  return Math.min(end, Math.max(0, current+direction*Math.max(1, clientWidth*.85)));
}

export function shelfScrollBehavior(reducedMotion:boolean, wrapping=false):ScrollBehavior {
  return reducedMotion || wrapping ? 'instant' : 'smooth';
}

function ShowcaseCard({item}:{item:ShowcaseItem}) {
  const [failedImage, setFailedImage]=useState('');
  const imageAvailable=Boolean(item.mediaId || (item.image && failedImage!==item.image));
  return <Link href={item.href} className={styles.card} aria-label={item.action+': '+item.title}>
    <div className={styles.artwork} data-film={Boolean(item.filmDuration)}>
      {item.mediaId ? <MediaImage id={item.mediaId} alt={item.imageAlt || item.title}/> : imageAvailable ? <img src={item.image} alt={item.imageAlt || item.title} loading="lazy" decoding="async" onError={() => setFailedImage(item.image || '')}/> : <span className={styles.missingArtwork}>Event record<span>Artwork unavailable</span></span>}
      {item.filmDuration && <span className={styles.filmBadge}><Play size={15} weight="fill" aria-hidden="true"/>Film · {item.filmDuration}</span>}
    </div>
    <div className={styles.cardContent}>
      <p className={styles.cardLabel}>{item.label}</p>
      <h3>{item.title}</h3>
      {item.description && <p className={styles.cardDescription}>{item.description}</p>}
      <span className={styles.cardAction}>{item.action}<ArrowRight size={19} aria-hidden="true"/></span>
    </div>
  </Link>;
}

export function ShowcaseShelf({id, label, title, description, items, emptyMessage, footer}:{id:string;label:string;title:string;description:string;items:ShowcaseItem[];emptyMessage?:string;footer?:ReactNode}) {
  const row=useRef<HTMLDivElement>(null);
  const list=useRef<HTMLUListElement>(null);
  const [overflowing, setOverflowing]=useState(false);
  const [announcement, setAnnouncement]=useState('');
  const rowId=id+'-items';
  const titleId=id+'-title';
  const instructionsId=id+'-instructions';

  useEffect(() => {
    const element=row.current;
    if (!element) return;
    const update=() => setOverflowing(element.scrollWidth-element.clientWidth>2);
    update();
    const observer=typeof ResizeObserver==='undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    if (list.current) observer?.observe(list.current);
    window.addEventListener('resize', update);
    return () => {observer?.disconnect();window.removeEventListener('resize', update)};
  }, [items.length]);

  const move=(direction:1|-1) => {
    const element=row.current;
    if (!element || element.scrollWidth-element.clientWidth<=2) return;
    const target=shelfScrollTarget(element, direction);
    const wrapping=direction===1 ? target<element.scrollLeft : target>element.scrollLeft;
    element.scrollTo({left:target, behavior:shelfScrollBehavior(window.matchMedia('(prefers-reduced-motion: reduce)').matches, wrapping)});
    setAnnouncement(wrapping ? (direction===1 ? 'Back to the start of ' : 'At the end of ')+title : '');
  };

  const onKeyDown=(event:KeyboardEvent<HTMLDivElement>) => {
    // Links retain normal activation and Tab navigation; these keys act on the row itself.
    if (event.target!==event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault();
      move(event.key==='ArrowRight' ? 1 : -1);
    } else if (event.key==='Home' || event.key==='End') {
      event.preventDefault();
      const element=row.current;
      element?.scrollTo({left:event.key==='Home' ? 0 : element.scrollWidth-element.clientWidth, behavior:shelfScrollBehavior(window.matchMedia('(prefers-reduced-motion: reduce)').matches)});
    }
  };

  return <section id={id} className={'wrap '+styles.shelf} aria-labelledby={titleId} data-showcase-shelf="true">
    <div className={styles.shelfHeading}>
      <div><p className={styles.shelfLabel}>{label}</p><h2 id={titleId}>{title}</h2><p className={styles.shelfDescription}>{description}</p></div>
      {items.length>0 && <div className={styles.shelfControls}>
        <span className={styles.itemCount}>{items.length} {items.length===1?'item':'items'}</span>
        <button type="button" disabled={!overflowing} aria-controls={rowId} aria-label={'Previous items in '+title} onClick={() => move(-1)}><ArrowLeft size={19} aria-hidden="true"/><span>Previous</span></button>
        <button type="button" disabled={!overflowing} aria-controls={rowId} aria-label={'Next items in '+title} onClick={() => move(1)}><span>Next</span><ArrowRight size={19} aria-hidden="true"/></button>
      </div>}
    </div>
    {items.length>0 ? <>
      <p id={instructionsId} className={styles.srOnly}>Swipe to browse, or focus this shelf and use Left, Right, Home or End. Next returns to the start after the last item. Tab moves through each item once.</p>
      <div id={rowId} ref={row} className={styles.scroller} role="region" aria-labelledby={titleId} aria-describedby={instructionsId} tabIndex={0} onKeyDown={onKeyDown}>
        <ul ref={list} className={styles.items}>{items.map(item => <li key={item.id}><ShowcaseCard item={item}/></li>)}</ul>
      </div>
      <p role="status" aria-live="polite" className={styles.srOnly}>{announcement}</p>
    </> : <p className={styles.empty}>{emptyMessage || 'Published work records will appear here when available.'}</p>}
    {footer && <div className={styles.shelfFooter}>{footer}</div>}
  </section>;
}
