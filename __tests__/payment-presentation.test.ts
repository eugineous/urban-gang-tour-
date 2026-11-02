import {it,expect} from 'vitest';
import {paymentPresentation} from '@/lib/client/payment-presentation';
import {paymentFeedback} from '@/lib/client/payment-feedback';
import {catalogueProblems} from '@/lib/i18n/messages';
import {paymentMessages} from '@/ui/i18n/catalogues/payment';
it.each(['paid','fulfilled'])('offers documents only for server-confirmed %s',status=>{
 expect(paymentPresentation(status)).toMatchObject({paid:true,terminal:true,title:'Payment confirmed'});
});
it.each(['failed','declined','timed_out','cancelled','refunded','partially_refunded'])('stops pending presentation for terminal %s',status=>{
 expect(paymentPresentation(status)).toMatchObject({paid:false,terminal:true});
 expect(paymentPresentation(status).title).not.toBe('Payment confirmation pending');
});
it.each(['pending','created','initiated','unknown','reconciling','unexpected'])('does not infer a successful payment from %s',status=>{
 expect(paymentPresentation(status)).toMatchObject({paid:false,terminal:false});
 expect(paymentPresentation(status).message).toContain('do not pay again');
});
it('does not promise all documents are ready merely because funds are confirmed',()=>{
 expect(paymentPresentation('paid').message).toContain('preparation');
 expect(paymentPresentation('paid').message).not.toContain('download your documents');
});
it.each([undefined,null,{tickets:'delivered',email:'sent'},{tickets:1,email:true}])('treats missing or unrecognized delivery progress as unknown',summary=>{
 expect(paymentFeedback('paid',summary)).toEqual({paid:true,keepChecking:true,delivery:{tickets:'unknown',email:'unknown'}});
});
it('does not expose delivery progress on an unconfirmed payment',()=>{
 expect(paymentFeedback('pending',{tickets:'ready',email:'accepted'})).toEqual({paid:false,keepChecking:true,delivery:{tickets:'unknown',email:'unknown'}});
});
it('stops automatic checks when the remaining work needs staff review',()=>{
 expect(paymentFeedback('paid',{tickets:'review',email:'review'})).toMatchObject({paid:true,keepChecking:false});
});
it('provides complete native payment progress messages',()=>{
 expect(catalogueProblems(paymentMessages)).toEqual([]);
 for(const messages of Object.values(paymentMessages))for(const message of Object.values(messages))expect(String(message).trim()).not.toBe('');
});
