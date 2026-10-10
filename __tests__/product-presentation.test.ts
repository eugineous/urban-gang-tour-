import {describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({q:vi.fn()}));
import {productPresentation,isProductImageUrl} from '@/lib/server/product-presentation';
describe('product photographs and fit guidance',()=>{
 it('accepts approved local assets and HTTPS photographs, deduplicating them',()=>{
  expect(productPresentation({photos:['/assets/shirt.webp','https://images.example.com/shirt.jpg','/assets/shirt.webp'],sizeGuide:'  Verified measurements  '})).toEqual({photos:['/assets/shirt.webp','https://images.example.com/shirt.jpg'],sizeGuide:'Verified measurements'});
 });
 it.each(['javascript:alert(1)','data:image/svg+xml,test','//other.example.com/photo.jpg','https://','https://user:password@example.com/photo.jpg','/\\other.example.com/image','/photo\n.jpg'])('rejects malformed or unsafe photograph %s',url=>{
  expect(isProductImageUrl(url)).toBe(false);
  expect(()=>productPresentation({photos:[url]})).toThrow('invalid_product_photos');
 });
 it('bounds the image collection and guidance length',()=>{
  expect(()=>productPresentation({photos:Array(13).fill('/photo.jpg')})).toThrow('invalid_product_photos');
  expect(()=>productPresentation({sizeGuide:'x'.repeat(4001)})).toThrow('invalid_size_guide');
 });
});
