import {describe,it,expect} from 'vitest';
import {validateMerchFulfillment,isCompletedMerchFulfillment} from '@/lib/shared/merch-fulfillment';
describe('recorded merchandise progress',()=>{
 it.each(['in_production','delivered'])('accepts actual %s progress',status=>{expect(()=>validateMerchFulfillment(status,status==='delivered'?'courier':'')).not.toThrow()});
 it.each(['in_production','dispatched','packed'])('keeps %s separate from completed handover',status=>{expect(isCompletedMerchFulfillment(status)).toBe(false)});
 it.each(['delivered','collected'])('completes handover only at %s',status=>{expect(isCompletedMerchFulfillment(status)).toBe(true)});
 it('rejects a delivery claim without a delivery handover method',()=>{expect(()=>validateMerchFulfillment('delivered','collection')).toThrow('delivery_handoff_method_required')});
});
