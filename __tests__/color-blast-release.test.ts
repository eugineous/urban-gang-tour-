import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {merchProducts} from '@/data/color-blast';
import {getGalleryKinds,getGalleryTile,getColourPreview,extraGalleryTiles} from '@/data/merch-gallery';
import {LIVE_CART_KEY,readLiveCart,addCartItem} from '@/lib/client/merch-preview-cart';
import {LIVE_CART_KEY as PURCHASE_KEY} from '@/lib/client/live-cart';
afterEach(()=>vi.unstubAllGlobals());
describe('Color Blast public release boundaries',()=>{
 it('has 24 unique proposed products, positive prices and no asserted stock',()=>{expect(merchProducts).toHaveLength(24);expect(new Set(merchProducts.map(p=>p.id)).size).toBe(24);for(const p of merchProducts){expect(p.stock).toBeNull();expect(p.price).toBeGreaterThan(0);expect(p.eventPrice).toBeLessThanOrEqual(p.price);expect(p.variants.length).toBeGreaterThan(0);expect(getColourPreview(p.id)).toBeTruthy()}});
 it('preserves the supplied print master byte for byte',()=>{expect(createHash('sha256').update(readFileSync('assets/color-blast/original-artwork.png')).digest('hex')).toBe('dd19a4dfc21d03b8c03acbec71ddddcd7fc04a3d6d56db903844851abb8fae79')});
 it('only links completed model assets and valid product colours',()=>{for(const [id,tiles] of Object.entries(extraGalleryTiles)){const p=merchProducts.find(p=>p.id===id)!;for(const t of tiles){expect(p.colorNames).toContain(t.colour);expect(existsSync('assets/'+t.sheet.replace('/assets/',''))).toBe(true);expect(t.left+t.tileWidth).toBeLessThanOrEqual(t.width);expect(t.top+t.tileHeight).toBeLessThanOrEqual(t.height)}}});
 it('offers both people on ready apparel and clearly retains actual fallback colours',()=>{expect(getGalleryKinds('cb-hoodie')).toEqual(['product','eugine','lucy']);expect(getGalleryTile('cb-hoodie','Black','lucy')?.colour).toBe('Cream');expect(getGalleryTile('cb-oversized-tee','Hot pink','lucy')?.colour).toBe('Hot pink');expect(getGalleryKinds('cb-poster')).toEqual(['product'])});
 it('isolates proposed design selections from checkout and rejects malformed entries',()=>{expect(LIVE_CART_KEY).not.toBe(PURCHASE_KEY);const getItem=vi.fn((key:string)=>key===LIVE_CART_KEY?JSON.stringify([{id:'cb-hoodie',variant:'Black / M',qty:2},{id:'live-stock',variant:'M',qty:1},{id:'cb-hoodie',qty:100}]):null);vi.stubGlobal('localStorage',{getItem});expect(readLiveCart()).toEqual([{id:'cb-hoodie',variant:'Black / M',qty:2}]);expect(getItem).toHaveBeenCalledTimes(1);expect(getItem).toHaveBeenCalledWith(LIVE_CART_KEY)});
 it('keeps colours separate and caps design quantities',()=>{const items=addCartItem([{id:'cb-hoodie',variant:'Black / M',qty:19}],{id:'cb-hoodie',variant:'Black / M',qty:2});expect(items[0].qty).toBe(20);expect(addCartItem(items,{id:'cb-hoodie',variant:'Cream / M',qty:1})).toHaveLength(2)});
});
