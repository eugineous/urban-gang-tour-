import {describe,it,expect,vi,afterEach} from 'vitest';
import {readLiveCart,addCartItem} from '@/lib/client/live-cart';
afterEach(()=>vi.unstubAllGlobals());
describe('shared product and shop bag',()=>{
 it('migrates saved size selections and discards malformed entries',()=>{vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='ugt_cart'?JSON.stringify([{id:'shirt',qty:2,size:'L'},{id:'other',qty:500}]):null});expect(readLiveCart()).toEqual([{id:'shirt',qty:2,variant:'L'}])});
 it('combines the same variation, caps quantity, and keeps other variations separate',()=>{const cart=addCartItem([{id:'shirt',qty:19,variant:'L'}],{id:'shirt',qty:4,variant:'L'});expect(cart[0].qty).toBe(20);expect(addCartItem(cart,{id:'shirt',qty:2,variant:'M'})).toHaveLength(2)});
 it('returns an empty bag when browser storage is unavailable',()=>{vi.stubGlobal('localStorage',{getItem:()=>{throw Error('unavailable')}});expect(readLiveCart()).toEqual([])});
 it('retains different production names as separate lines while combining the same name',()=>{
  const original=[{id:'shirt',qty:1,variant:'L',printableName:'Amina'}];
  const withOther=addCartItem(original,{id:'shirt',qty:2,variant:'L',printableName:'Brian'});
  expect(withOther).toHaveLength(2);
  expect(addCartItem(withOther,{id:'shirt',qty:1,variant:'L',printableName:' Amina '})).toEqual([{...original[0],qty:2},{id:'shirt',qty:2,variant:'L',printableName:'Brian'}]);
  expect(addCartItem(withOther,{id:'shirt',qty:1,variant:'L'})).toHaveLength(3);
 });
 it('keeps saved names and rejects a malformed name without losing other cart entries',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify([{id:'shirt',qty:1,variant:'L',printableName:'  Élodie  '},{id:'other',qty:1,printableName:'<script>'}])});
  expect(readLiveCart()).toEqual([{id:'shirt',qty:1,variant:'L',printableName:'Élodie'}]);
 });
});
