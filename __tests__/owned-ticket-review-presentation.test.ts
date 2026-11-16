import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import PaymentResultScreen from '@/app/pay/success/PaymentResultScreen';
it('a paid unfulfillable ticket shows manual refund review without claiming admission or refunded money',()=>{
 const html=renderToStaticMarkup(createElement(PaymentResultScreen,{orderId:'ORD-REVIEW123',status:'paid',refundReview:true,delivery:{tickets:'review',email:'not_requested'},total:500,method:'paystack',remainingTickets:false,offline:false,error:false,stopped:false,checking:false,onCheck:()=>{}}));
 expect(html).toContain('Payment received');expect(html).toContain('manual refund review');expect(html).not.toContain('/tickets/ORD-REVIEW123');expect(html).not.toContain('Thank you for your order');
});
