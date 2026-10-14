'use client';
import {useState,useEffect} from 'react';
import {ARTWORK,type MerchProduct} from '@/data/color-blast';
import {getGalleryKinds,getGalleryTile,type GalleryKind} from '@/data/merch-gallery';
import GeneratedProductImage from './GeneratedProductImage';
import MerchZoom from './MerchZoom';
import styles from './ColorBlastShop.module.css';
type View=GalleryKind|'art'|'reference'|'original';
export default function MerchProductGallery({product:p,colour,onSelectColour}:{product:MerchProduct;colour:string;onSelectColour:(colour:string)=>void}){
 const [view,setView]=useState<View>('product'),[zoom,setZoom]=useState(false);
 const kinds=getGalleryKinds(p.id),active=kinds.includes(view as GalleryKind)?view as GalleryKind:'product',tile=getGalleryTile(p.id,colour,active);
 useEffect(()=>{if(view==='eugine'||view==='lucy'){const t=getGalleryTile(p.id,colour,view);if(t?.colour!==colour)setView('product');}},[colour,p.id]);
 function choose(v:View){if(v==='eugine'||v==='lucy'){const t=getGalleryTile(p.id,colour,v);if(t&&t.colour!==colour)onSelectColour(t.colour);}setView(v);}
 const labels:Record<View,string>={product:'Product image',eugine:'Eugine',lucy:'Lucy',detail:'Fabric & print',art:'Source artwork',reference:'Supplied tees',original:'Real team photo'};
 const views:View[]=[...kinds,'art',...(p.shape==='tee'?['reference' as View]:[]),...(p.shape==='hoodie'?['original' as View]:[])];
 let note=view==='art'?'Original Color Blast artwork.':view==='reference'?'Original T-shirt reference.':view==='original'?'Eugine & Lucy.':active==='detail'?'Fabric and print detail preview.':tile?.kind==='eugine'||tile?.kind==='lucy'?`${tile.kind==='eugine'?'Eugine':'Lucy'} styling preview. Sample fit pending.`:tile?.source==='supplied'?'Original product reference.':'Design preview. Sample pending.';
 if(!['art','reference','original','detail'].includes(view)&&tile)note+=' '+(tile.colour===colour?`Shown in ${colour}.`:`${tile.colour} styling example; selected colour: ${colour}.`);
 const render=()=>view==='art'?<img src={ARTWORK} alt="Original supplied Color Blast print artwork"/>:view==='reference'?<img src="/assets/color-blast/supplied-colourways.jpg" alt="Supplied original tee colourways"/>:view==='original'?<img src="/assets/color-blast/models/eugine-lucy-studio.webp" alt="Original supplied Eugine and Lucy photograph"/>:<GeneratedProductImage id={p.id} colour={colour} tile={tile}/>;
 return <section className={styles.gallery} aria-label="Product images"><button type="button" className={`${styles.detailImage} ${styles.zoomTrigger}`} aria-label={`Enlarge ${p.name} image`} onClick={()=>setZoom(true)}>{render()}<span>Tap to zoom ↗</span></button><div className={styles.views} role="group" aria-label="Choose a product view">{views.map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>choose(v)}>{labels[v]}{(v==='eugine'||v==='lucy')&&getGalleryTile(p.id,colour,v)?.colour!==colour?' · '+getGalleryTile(p.id,colour,v)?.colour:''}</button>)}</div><p className={styles.imageNote}>{note}</p>{zoom&&<MerchZoom title={`${p.name} · ${labels[view]}`} note={note} onClose={()=>setZoom(false)}>{render()}</MerchZoom>}</section>;
}
