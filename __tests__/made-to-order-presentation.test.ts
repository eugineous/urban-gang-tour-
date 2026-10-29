// Render actual customer controls with the native language catalogue.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {formatMessage,type Catalogue,type MessageValues} from '@/lib/i18n/messages';
vi.mock('@/ui/i18n/LanguageProvider',async original=>({...await original<typeof import('@/ui/i18n/LanguageProvider')>(),useInterfaceLanguage:()=>({locale:'en'}),useMessages:(catalogue:Catalogue<string>)=>(key:string,values?:MessageValues)=>formatMessage(catalogue,'en',key,values).text}));
import {ProductPurchase} from '@/app/_components/ProductPurchase';
import PaymentStatus from '@/app/pay/success/PaymentStatus';
import {statusIssue,accountMessages} from '@/ui/i18n/catalogues/account';
it('presents manufacture after purchase rather than an unverified available-stock claim',()=>{
 const html=renderToStaticMarkup(createElement(ProductPurchase,{id:'cb-hoodie',price:3500,variants:[{label:'Black / M',priceAdjustment:0}],madeToOrder:true}));
 expect(html).toContain('Made to order');expect(html).toContain('after your payment is confirmed');expect(html).not.toContain('Availability checked at payment');expect(html).toContain('Add to cart');
});
it('keeps the saved order tracking destination available while payment is checked',()=>{
 const html=renderToStaticMarkup(createElement(PaymentStatus,{orderId:'ORD-ABC123456789012345678901234'}));
 expect(html).toContain('href="/orders/track?ref=ORD-ABC123456789012345678901234"');
});
it('translates actual manufacturing progress as a known fulfillment state',()=>{
 const issue=statusIssue('in_production','fulfillment');
 expect(formatMessage(accountMessages,'en',issue.key).text).toBe('In production');
 expect(formatMessage(accountMessages,'sw',issue.key).text).toBe('Inatengenezwa');
});
