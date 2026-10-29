'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {useState,useEffect} from 'react';
import {ARTWORK,type MerchProduct} from '@/data/color-blast';
import {getGalleryKinds,getGalleryTile,type GalleryKind} from '@/data/merch-gallery';
import GeneratedProductImage from './GeneratedProductImage';
import MerchZoom from './MerchZoom';
import styles from './ColorBlastShop.module.css';
type View=GalleryKind|'art'|'reference'|'original';
export default function MerchProductGallery({product:p,colour,onSelectColour}:{product:MerchProduct;colour:string;onSelectColour:(colour:string)=>void}){
 const t=useMessages(commerceMessages);
 const [view,setView]=useState<View>('product'),[zoom,setZoom]=useState(false);
 const kinds=getGalleryKinds(p.id),active=kinds.includes(view as GalleryKind)?view as GalleryKind:'product',tile=getGalleryTile(p.id,colour,active);
 useEffect(()=>{if(view==='eugine'||view==='lucy'){const t=getGalleryTile(p.id,colour,view);if(t?.colour!==colour)setView('product');}},[colour,p.id]);
 function choose(v:View){if(v==='eugine'||v==='lucy'){const t=getGalleryTile(p.id,colour,v);if(t&&t.colour!==colour)onSelectColour(t.colour);}setView(v);}
 const labels:Record<View,string>={product:t('gallery.product'),eugine:'Eugine',lucy:'Lucy',detail:t('gallery.detail'),art:t('gallery.art'),reference:t('gallery.reference'),original:t('gallery.original')};
 const views:View[]=[...kinds,'art',...(p.shape==='tee'?['reference' as View]:[])];
 let note=view==='art'?t('gallery.artNote'):view==='reference'?t('gallery.referenceNote'):view==='original'?'Eugine & Lucy.':active==='detail'?t('gallery.detailNote'):tile?.kind==='eugine'||tile?.kind==='lucy'?t('gallery.modelNote',{name:tile.kind==='eugine'?'Eugine':'Lucy'}):tile?.source==='supplied'?t('gallery.productNote'):t('gallery.previewNote');
 if(!['art','reference','original','detail'].includes(view)&&tile)note+=' '+(tile.colour===colour?t('gallery.shown',{colour}):t('gallery.example',{example:tile.colour,colour}));
 const render=()=>view==='art'?<img src={ARTWORK} alt={t('image.print')}/>:view==='reference'?<img src="/assets/color-blast/supplied-colourways.jpg" alt={t('image.tees')}/>:view==='original'?<img src="/assets/color-blast/models/eugine-lucy-studio.webp" alt={t('image.team')}/>:<GeneratedProductImage id={p.id} colour={colour} tile={tile}/>;
 return <section className={styles.gallery} aria-label={t('gallery.images')}><button type="button" className={`${styles.detailImage} ${styles.zoomTrigger}`} aria-label={t('gallery.enlarge',{name:p.name})} onClick={()=>setZoom(true)}>{render()}<span>{t('gallery.tap')}</span></button><div className={styles.views} role="group" aria-label={t('gallery.chooseView')}>{views.map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>choose(v)}>{labels[v]}{(v==='eugine'||v==='lucy')&&getGalleryTile(p.id,colour,v)?.colour!==colour?' · '+getGalleryTile(p.id,colour,v)?.colour:''}</button>)}</div><p className={styles.imageNote}>{note}</p>{zoom&&<MerchZoom title={`${p.name} · ${labels[view]}`} note={note} onClose={()=>setZoom(false)}>{render()}</MerchZoom>}</section>;
}
