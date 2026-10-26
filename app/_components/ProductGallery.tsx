'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';

import {useEffect,useRef,useState} from 'react';
import styles from './Commerce.module.css';

type Photo={id:string;url:string;altText:string};

export function ProductGallery({photos,name}:{photos:Photo[];name:string}){
 const t=useMessages(commerceMessages);
 const [active,setActive]=useState(0),[open,setOpen]=useState(false),[zoom,setZoom]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const touch=useRef<{x:number;y:number}|null>(null);
 const photo=photos[active]||photos[0];
 function move(offset:number){setActive(index=>(index+offset+photos.length)%photos.length);setZoom(false)}
 useEffect(()=>{
  if(!open||!dialog.current)return;
  const viewer=dialog.current;
  viewer.showModal();
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;viewer.close()};
 },[open]);
 if(!photo)return <div className={styles.galleryStage}><p className={styles.imageEmpty}>{t('product.photoSoon')}</p></div>;
 return <div className={styles.gallery}>
  <div className={styles.galleryStage} onTouchStart={event=>{touch.current={x:event.touches[0].clientX,y:event.touches[0].clientY}}} onTouchEnd={event=>{const start=touch.current;if(start){const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)&&photos.length>1)move(dx<0?1:-1)}touch.current=null}}>
   <button type="button" aria-label={t('gallery.enlarge',{name:photo.altText})} onClick={()=>{setZoom(false);setOpen(true)}}><img src={photo.url} alt={photo.altText} loading={active===0?'eager':'lazy'} decoding="async"/></button>
   {photos.length>1&&<span className={styles.galleryCounter}>{active+1} / {photos.length}</span>}
  </div>
  {photos.length>1&&<div className={styles.thumbnails} role="group" aria-label={t('gallery.photos',{name})}>{photos.map((item,index)=><button type="button" key={item.id} aria-label={t('gallery.show',{name:item.altText})} aria-pressed={active===index} onClick={()=>{setActive(index);setZoom(false)}}><img src={item.url} alt="" loading="lazy" decoding="async"/></button>)}</div>}
  <p className={styles.galleryHint}>{t('gallery.hint')}{photos.length>1?t('gallery.swipe'):''}</p>
  <dialog ref={dialog} className="ugt-photo-viewer" aria-label={t('gallery.title',{name})} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onKeyDown={event=>{if(photos.length<2)return;if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}if(event.key==='ArrowRight'){event.preventDefault();move(1)}}}>
   {open&&<><div className="ugt-photo-toolbar"><span>{active+1} / {photos.length}</span><button type="button" onClick={()=>setZoom(value=>!value)} aria-pressed={zoom}>{zoom?t('gallery.fit'):t('gallery.zoom')}</button><button type="button" autoFocus onClick={()=>setOpen(false)} aria-label={t('gallery.closePhoto')}>{t('close')}</button></div><div className={`ugt-photo-stage ${zoom?'zoomed':''}`}><img src={photo.url} alt={photo.altText}/></div><div className="ugt-photo-caption"><button type="button" disabled={photos.length<2} onClick={()=>move(-1)}>{t('previous')}</button><p lang="en-KE">{photo.altText}</p><button type="button" disabled={photos.length<2} onClick={()=>move(1)}>{t('next')}</button></div></>}
  </dialog>
 </div>;
}
