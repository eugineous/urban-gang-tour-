/** Recorded staff updates, never inferred carrier status or delivery estimates. */
export const MERCH_FULFILLMENT_STATES=['new','in_production','picking','packed','dispatch_ready','dispatched','delivered','collected','cancelled'] as const;
export function validateMerchFulfillment(status:string,handoffMethod:string){
 if(!(MERCH_FULFILLMENT_STATES as readonly string[]).includes(status)||!['','collection','delivery','courier','other'].includes(handoffMethod))throw Error('invalid_fulfillment');
 if(status==='collected'&&handoffMethod!=='collection')throw Error('collection_handoff_method_required');
 if(['dispatched','delivered'].includes(status)&&!['delivery','courier','other'].includes(handoffMethod))throw Error(status==='delivered'?'delivery_handoff_method_required':'dispatch_handoff_method_required');
}
export function isCompletedMerchFulfillment(status:string){return status==='delivered'||status==='collected';}
