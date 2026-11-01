import type {StudioTile} from './generated-merch';

// Standalone studio presentations, not crops of a contact sheet. The actual
// selected colour must match; other colourways keep their existing previews.
export const mannequinTiles:Record<string,StudioTile>=Object.fromEntries(
 ['oversized-tee','hoodie','crewneck','baby-tee','jersey'].map(slug=>['cb-'+slug,{
  sheet:`/assets/color-blast/mannequins/${slug}-black.webp`,
  width:900,height:1200,left:0,top:0,tileWidth:900,tileHeight:1200,
  colour:'Black',source:'generated',presentation:'mannequin',
 } satisfies StudioTile]),
);
