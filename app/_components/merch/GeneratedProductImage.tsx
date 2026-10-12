import {type StudioTile} from '@/data/generated-merch';
import {getColourPreview,type GalleryTile} from '@/data/merch-gallery';
import {useId} from 'react';
export default function GeneratedProductImage({id='cb-oversized-tee',colour='Black',tile:provided}:{id?:string;colour?:string;tile?:StudioTile}){
 const clipId='studio-'+useId().replaceAll(':','');
 const tile=provided||getColourPreview(id,colour);if(!tile)return null;
 const kind=(tile as Partial<GalleryTile>).kind;
 return <svg data-studio-product={id} data-example-colour={tile.colour} data-gallery-kind={kind||'product'} viewBox={`0 0 ${tile.tileWidth} ${tile.tileHeight}`} role="img" aria-label={`${tile.source==='generated'?'AI-generated '+(kind==='eugine'?'Eugine model preview':kind==='lucy'?'Lucy model preview':kind==='detail'?'material design study':'studio mockup'):'Supplied garment presentation'} · ${id.replace('cb-','')} · ${tile.colour}`} preserveAspectRatio="xMidYMid meet" style={{display:'block',width:'100%',height:'100%',overflow:'hidden'}}><defs><clipPath id={clipId}><rect width={tile.tileWidth} height={tile.tileHeight}/></clipPath></defs><image clipPath={`url(#${clipId})`} href={tile.sheet} x={-tile.left} y={-tile.top} width={tile.width} height={tile.height}/></svg>;
}
