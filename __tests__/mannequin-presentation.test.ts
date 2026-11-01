import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {getColourPreview,getGalleryTile} from '@/data/merch-gallery';
import GeneratedProductImage from '@/app/_components/merch/GeneratedProductImage';

it.each(['oversized-tee','hoodie','crewneck','baby-tee','jersey'])('shows the completed mannequin asset for black %s in cards and product galleries',slug=>{
 const id='cb-'+slug;
 const tile=getColourPreview(id,'Black');
 expect(tile?.sheet).toBe(`/assets/color-blast/mannequins/${slug}-black.webp`);
 expect(getGalleryTile(id,'Black','product')?.sheet).toBe(tile?.sheet);
 const html=renderToStaticMarkup(createElement(GeneratedProductImage,{id,colour:'Black'}));
 expect(html).toContain(`<img`);
 expect(html).toContain(`src="/assets/color-blast/mannequins/${slug}-black.webp"`);
 expect(html).toContain('mannequin');
 expect(html).not.toContain('<clipPath');
});

it('keeps real selected colours instead of pretending the black mannequin is another colour',()=>{
 const white=getColourPreview('cb-oversized-tee','White');
 expect(white?.colour).toBe('White');
 expect(white?.sheet).not.toContain('/mannequins/');
 const cream=getColourPreview('cb-hoodie','Cream');
 expect(cream?.colour).toBe('Cream');
 expect(cream?.sheet).not.toContain('/mannequins/');
 expect(getColourPreview('cb-hoodie')?.sheet).toBe('/assets/color-blast/mannequins/hoodie-black.webp');
 expect(getGalleryTile('cb-hoodie','Black','lucy')?.kind).toBe('lucy');
 expect(getColourPreview('cb-poster','Original artwork')?.sheet).not.toContain('/mannequins/');
});
