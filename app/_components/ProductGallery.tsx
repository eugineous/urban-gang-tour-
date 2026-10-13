'use client';

import {useEffect,useRef,useState} from 'react';
import styles from './Commerce.module.css';

type Photo={id:string;url:string;altText:string};

export function ProductGallery({photos,name}:{photos:Photo[];name:string}){
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
 if(!photo)return <div className={styles.galleryStage}><p className={styles.imageEmpty}>Product photograph coming soon.</p></div>;
 return <div className={styles.gallery}>
  <div className={styles.galleryStage} onTouchStart={event=>{touch.current={x:event.touches[0].clientX,y:event.touches[0].clientY}}} onTouchEnd={event=>{const start=touch.current;if(start){const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)&&photos.length>1)move(dx<0?1:-1)}touch.current=null}}>
   <button type="button" aria-label={'Enlarge '+photo.altText} onClick={()=>{setZoom(false);setOpen(true)}}><img src={photo.url} alt={photo.altText} loading={active===0?'eager':'lazy'} decoding="async"/></button>
   {photos.length>1&&<span className={styles.galleryCounter}>{active+1} / {photos.length}</span>}
  </div>
  {photos.length>1&&<div className={styles.thumbnails} role="group" aria-label={'Photographs of '+name}>{photos.map((item,index)=><button type="button" key={item.id} aria-label={'Show '+item.altText} aria-pressed={active===index} onClick={()=>{setActive(index);setZoom(false)}}><img src={item.url} alt="" loading="lazy" decoding="async"/></button>)}</div>}
  <p className={styles.galleryHint}>Tap the photograph to take a closer look.{photos.length>1?' Swipe or choose a thumbnail to change the view.':''}</p>
  <dialog ref={dialog} className="ugt-photo-viewer" aria-label={name+' photographs'} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onKeyDown={event=>{if(photos.length<2)return;if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}if(event.key==='ArrowRight'){event.preventDefault();move(1)}}}>
   {open&&<><div className="ugt-photo-toolbar"><span>{active+1} / {photos.length}</span><button type="button" onClick={()=>setZoom(value=>!value)} aria-pressed={zoom}>{zoom?'Fit image':'Zoom image'}</button><button type="button" autoFocus onClick={()=>setOpen(false)} aria-label="Close product photograph">Close</button></div><div className={`ugt-photo-stage ${zoom?'zoomed':''}`}><img src={photo.url} alt={photo.altText}/></div><div className="ugt-photo-caption"><button type="button" disabled={photos.length<2} onClick={()=>move(-1)}>Previous</button><p>{photo.altText}</p><button type="button" disabled={photos.length<2} onClick={()=>move(1)}>Next</button></div></>}
  </dialog>
 </div>;
}
