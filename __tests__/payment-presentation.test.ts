import {it,expect} from 'vitest';
import {paymentPresentation} from '@/lib/client/payment-presentation';
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
