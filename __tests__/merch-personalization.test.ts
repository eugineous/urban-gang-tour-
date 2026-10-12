import {beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:vi.fn(),q:vi.fn()}));
import {hasDb,q} from '@/lib/server/db';
import {applyVerifiedMerchPersonalization} from '@/lib/server/merch-personalization';
import {normalizePrintableName} from '@/lib/shared/merch-personalization';
const line={id:'rails-tee',qty:1,name:'Rails Tee (L)',unit:1500,variant:'L'};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(hasDb).mockReturnValue(true);vi.mocked(q).mockResolvedValue([{id:'rails-tee',name_on_back_enabled:true}]);});

describe('printable names',()=>{
 it('normalizes meaningful names without changing letter case or accents',()=>{
  expect(normalizePrintableName('  Amina   O’Neil ')).toBe('Amina O’Neil');
  expect(normalizePrintableName('E\u0301lodie')).toBe('Élodie');
  expect(normalizePrintableName('J. Kamau-7')).toBe('J. Kamau-7');
  expect(normalizePrintableName(undefined)).toBeUndefined();
 });
 it.each(['','   ','A'.repeat(25),'Amina\nBrian','Amina\tBrian','<script>','Brian🚀','\u202eBrian',42,null])('rejects invalid print instructions %j',value=>{
  expect(()=>normalizePrintableName(value)).toThrow('invalid_printable_name');
 });
});

describe('verified product eligibility',()=>{
 it('preserves name-specific line order and existing variant price with no added fee',async()=>{
  const inputs=[{id:'rails-tee',printableName:' Amina '},{id:'rails-tee',printableName:'Brian'}];
  const originals=[{...line,qty:2},{...line,qty:1}];
  expect(await applyVerifiedMerchPersonalization(inputs,originals)).toEqual([{...originals[0],printableName:'Amina'},{...originals[1],printableName:'Brian'}]);
  expect(originals).toEqual([{...line,qty:2},{...line,qty:1}]);
  expect(q).toHaveBeenCalledTimes(1);
  expect(vi.mocked(q).mock.calls[0][1]).toEqual([['rails-tee']]);
  expect(vi.mocked(q).mock.calls[0][0]).toContain('p.active=true');
 });
 it.each([{products:[]},{products:[{id:'rails-tee',name_on_back_enabled:false}]},{products:[{id:'rails-tee'}]}])('fails closed for products not explicitly enabled',async ({products})=>{
  vi.mocked(q).mockResolvedValue(products);
  await expect(applyVerifiedMerchPersonalization([{id:'rails-tee',printableName:'Amina'}],[line])).rejects.toThrow('personalization_not_available');
 });
 it('rejects missing database and invalid names before any order can be written',async()=>{
  vi.mocked(hasDb).mockReturnValue(false);
  await expect(applyVerifiedMerchPersonalization([{id:'rails-tee',printableName:'Amina'}],[line])).rejects.toThrow('personalization_catalog_unavailable');
  await expect(applyVerifiedMerchPersonalization([{id:'rails-tee',printableName:'<script>'}],[line])).rejects.toThrow('invalid_printable_name');
  expect(q).not.toHaveBeenCalled();
 });
 it('does not require a personalization query for an ordinary product order',async()=>{
  expect(await applyVerifiedMerchPersonalization([{id:'rails-tee'}],[line])).toEqual([line]);
  expect(q).not.toHaveBeenCalled();
 });
});
