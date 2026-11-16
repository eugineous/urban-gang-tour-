import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {catalogueProblems,formatMessage} from '@/lib/i18n/messages';
import {accountPurchasesMessages} from '@/app/account/account-purchases-messages';

it('renders independently paged tickets even when their order is absent from this order page',async()=>{
 const {default:AccountPurchases}=await import('@/app/account/AccountPurchases');
 const html=renderToStaticMarkup(createElement(AccountPurchases,{onRetry:()=>{},wallet:{
  orders:[{id:'ORDER-035',total:500,status:'paid',created_at:'2026-11-10 12:00:00.123456+00'}],
  tickets:[{code:'ACTUAL-TICKET',order_id:'ORDER-001',tier_name:'General',used_at:null}],requests:[],
  pagination:{exportScope:'page',download:'/api/account?orderCursor=cursor&download=1',orders:{next:'/account?orderCursor=older'},tickets:{next:'/account?ticketCursor=older'},requests:{next:'/account?requestCursor=older'}}
 }}));
 expect(html).toContain('/api/tickets/ACTUAL-TICKET/pdf');
 expect(html).toContain('/account?orderCursor=older');expect(html).toContain('/account?ticketCursor=older');expect(html).toContain('/account?requestCursor=older');
 expect(html).toContain('Export this page');expect(html).toContain('Each download contains only the records on this page.');
 expect(html).not.toContain('Export profile and linked purchases');
});
it('provides loading and retry states without pretending a failed wallet is empty',async()=>{
 const {default:AccountPurchases}=await import('@/app/account/AccountPurchases');
 const loading=renderToStaticMarkup(createElement(AccountPurchases,{wallet:null,onRetry:()=>{}}));expect(loading).toContain('role="status"');
 const failed=renderToStaticMarkup(createElement(AccountPurchases,{wallet:null,errorText:'Please retry the lookup',onRetry:()=>{}}));expect(failed).toContain('role="alert"');expect(failed).toContain('type="button"');expect(failed).not.toContain('No account purchases yet');
});
it('provides the complete six-language paged-export guidance',()=>{
 expect(catalogueProblems(accountPurchasesMessages)).toEqual([]);
 for(const locale of ['en','sw','fr','zh-Hans','ru','es'] as const){
  expect(formatMessage(accountPurchasesMessages,locale,'exportHelp').fallback).toBe(false);
  expect(formatMessage(accountPurchasesMessages,locale,'olderTickets').text).not.toBe('');
 }
});
