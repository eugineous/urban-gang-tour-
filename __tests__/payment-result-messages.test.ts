import {expect,it} from 'vitest';
import {INTERFACE_LOCALES} from '@/lib/i18n/locale';
import {catalogueProblems,formatMessage} from '@/lib/i18n/messages';
import {paymentResultMessages,type PaymentResultMessageKey} from '@/ui/i18n/catalogues/payment-result';

const keys = [
 'eyebrow.success','eyebrow.pending','eyebrow.failed','eyebrow.refund',
 'thanks','amount','method','method.card','method.mpesa','method.paystack','method.comp',
 'details','reference.copy','reference.copied','reference.copyFailed',
 'order.view','back','help','continue',
] as const satisfies readonly PaymentResultMessageKey[];

it('renders every payment result label in all six native languages without fallback',()=>{
 expect(catalogueProblems(paymentResultMessages)).toEqual([]);
 for(const locale of INTERFACE_LOCALES){
  expect(Object.keys(paymentResultMessages[locale]).sort()).toEqual([...keys].sort());
  for(const key of keys){
   const message = formatMessage(paymentResultMessages,locale,key);
   expect(message.lang).toBe(locale);
   expect(message.fallback).toBe(false);
   expect(message.text.trim()).not.toBe('');
  }
 }
});
