import {afterEach,describe,expect,it,vi} from 'vitest';
import {openCampaignDialog} from '@/lib/client/campaign-dialog';

afterEach(()=>vi.unstubAllGlobals());
function fixture(fail=false){
 const dispatchEvent=vi.fn();
 const style={overflow:'auto'};
 vi.stubGlobal('window',{dispatchEvent});
 vi.stubGlobal('document',{body:{style}});
 const dialog={open:false,showModal:vi.fn(function(this:{open:boolean}){if(fail)throw new Error('not connected');this.open=true}),close:vi.fn(function(this:{open:boolean}){this.open=false})};
 return {dispatchEvent,style,dialog:dialog as unknown as HTMLDialogElement};
}
describe('campaign modal lifecycle',()=>{
 it('pauses background media and scrolling until the dialog closes',()=>{
  const f=fixture();const close=openCampaignDialog(f.dialog);
  expect(f.dialog.open).toBe(true);expect(f.style.overflow).toBe('hidden');
  expect(f.dispatchEvent.mock.calls.map(([e])=>[e.type,e.detail])).toEqual([['ugt-overlay-change',true]]);
  close?.();expect(f.dialog.open).toBe(false);expect(f.style.overflow).toBe('auto');
  expect(f.dispatchEvent.mock.calls.map(([e])=>[e.type,e.detail])).toEqual([['ugt-overlay-change',true],['ugt-overlay-change',false]]);
 });
 it('balances overlay depth only once when cleanup is repeated',()=>{
  const f=fixture();const close=openCampaignDialog(f.dialog);close?.();close?.();
  expect(f.dispatchEvent).toHaveBeenCalledTimes(2);expect(f.dialog.close).toHaveBeenCalledTimes(1);
 });
 it('does not strand the page or count an overlay when native opening fails',()=>{
  const f=fixture(true);expect(openCampaignDialog(f.dialog)).toBeNull();
  expect(f.style.overflow).toBe('auto');expect(f.dispatchEvent).not.toHaveBeenCalled();
 });
 it('balances the shared overlay event if the dialog was already closed natively',()=>{
  const f=fixture();const close=openCampaignDialog(f.dialog);f.dialog.open=false;close?.();
  expect(f.dialog.close).not.toHaveBeenCalled();expect(f.style.overflow).toBe('auto');
  expect(f.dispatchEvent.mock.calls.at(-1)?.[0].detail).toBe(false);
 });
 it('keeps an existing scroll lock and allows a later mount to open normally',()=>{
  const f=fixture();f.style.overflow='hidden';const close=openCampaignDialog(f.dialog);close?.();
  expect(f.style.overflow).toBe('hidden');const closeAgain=openCampaignDialog(f.dialog);
  expect(f.dialog.open).toBe(true);closeAgain?.();expect(f.style.overflow).toBe('hidden');
 });
 it('is inert during server rendering',()=>{
  vi.stubGlobal('document',undefined);vi.stubGlobal('window',undefined);
  expect(openCampaignDialog({} as HTMLDialogElement)).toBeNull();
 });
});
