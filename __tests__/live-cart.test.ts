import {describe,it,expect,vi,afterEach} from 'vitest';
import {readLiveCart,addCartItem} from '@/lib/client/live-cart';
afterEach(()=>vi.unstubAllGlobals());
describe('shared product and shop bag',()=>{
 it('migrates saved size selections and discards malformed entries',()=>{vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='ugt_cart'?JSON.stringify([{id:'shirt',qty:2,size:'L'},{id:'other',qty:500}]):null});expect(readLiveCart()).toEqual([{id:'shirt',qty:2,variant:'L'}])});
 it('combines the same variation, caps quantity, and keeps other variations separate',()=>{const cart=addCartItem([{id:'shirt',qty:19,variant:'L'}],{id:'shirt',qty:4,variant:'L'});expect(cart[0].qty).toBe(20);expect(addCartItem(cart,{id:'shirt',qty:2,variant:'M'})).toHaveLength(2)});
 it('returns an empty bag when browser storage is unavailable',()=>{vi.stubGlobal('localStorage',{getItem:()=>{throw Error('unavailable')}});expect(readLiveCart()).toEqual([])});
});
