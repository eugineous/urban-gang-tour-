'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {commerceMessages} from '@/ui/i18n/catalogues/commerce';
import {type StudioTile} from '@/data/generated-merch';
import {getColourPreview,type GalleryTile} from '@/data/merch-gallery';
import {useId} from 'react';
export default function GeneratedProductImage({id='cb-oversized-tee',colour='Black',tile:provided}:{id?:string;colour?:string;tile?:StudioTile}){
 const t=useMessages(commerceMessages);
 const clipId='studio-'+useId().replaceAll(':','');
 const tile=provided||getColourPreview(id,colour);if(!tile)return null;
 const kind=(tile as Partial<GalleryTile>).kind;
 return <svg data-studio-product={id} data-example-colour={tile.colour} data-gallery-kind={kind||'product'} viewBox={`0 0 ${tile.tileWidth} ${tile.tileHeight}`} role="img" aria-label={t(tile.source==='generated'?'image.generated':'image.supplied',{kind:kind==='eugine'?t('image.eugine'):kind==='lucy'?t('image.lucy'):kind==='detail'?t('image.detail'):t('image.mockup'),id:id.replace('cb-',''),colour:tile.colour})} preserveAspectRatio="xMidYMid meet" style={{display:'block',width:'100%',height:'100%',overflow:'hidden'}}><defs><clipPath id={clipId}><rect width={tile.tileWidth} height={tile.tileHeight}/></clipPath></defs><image clipPath={`url(#${clipId})`} href={tile.sheet} x={-tile.left} y={-tile.top} width={tile.width} height={tile.height}/></svg>;
}
