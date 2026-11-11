import {describe,expect,it} from 'vitest';
import {accountCursorQuery,accountPagination,decodeAccountCursor,encodeAccountCursor,parseAccountQuery} from '@/lib/server/account-pagination';

const raw=(text:string)=>Buffer.from(text).toString('base64url');
const cursor={createdAt:'2026-11-10 12:00:00.123456+00',id:'ORDER-006'};
describe('untrusted account pagination inputs',()=>{
 it('round trips PostgreSQL microseconds without converting through a Date',()=>{
  const encoded=encodeAccountCursor(cursor);expect(decodeAccountCursor(encoded)).toEqual(cursor);
  expect(accountCursorQuery(new URLSearchParams({orderCursor:encoded,reset:'private',download:'1',other:'ignored'}))).toBe('orderCursor='+encoded);
 });
 it('rejects noncanonical JSON/base64, oversized identifiers and impossible timestamps',()=>{
  const invalid=[raw(JSON.stringify({...cursor,extra:1})),raw(JSON.stringify({id:cursor.id,createdAt:cursor.createdAt})),raw(' '+JSON.stringify(cursor)),encodeAccountCursor(cursor)+'=',raw(JSON.stringify({...cursor,id:'a'.repeat(161)}))];
  for(const createdAt of ['2026-02-29 12:00:00+00','2026-04-31 12:00:00+00','2026-11-10 24:00:00+00','2026-11-10 12:00:60+00','0000-01-01 12:00:00+00','2026-11-10 12:00:00.1234567+00','2026-11-10 12:00:00+14:01','2026-11-10'])invalid.push(raw(JSON.stringify({...cursor,createdAt})));
  for(const value of invalid)expect(()=>decodeAccountCursor(value)).toThrow('invalid_account_cursor');
 });
 it('rejects duplicate cursors and unbounded API options',()=>{
  for(const text of ['orderCursor=a&orderCursor=b','download=1&download=1','limit=50000','offset=3000','download=0'])expect(()=>parseAccountQuery(new URLSearchParams(text))).toThrow();
 });
 it('generates relative links that preserve independent cursors and remove only the selected stream on first-page navigation',()=>{
  const order=encodeAccountCursor(cursor),ticket=encodeAccountCursor({...cursor,id:'TICKET-006'}),older=encodeAccountCursor({...cursor,id:'ORDER-001'});
  const page=accountPagination({orderCursor:cursor,ticketCursor:{...cursor,id:'TICKET-006'}},{orders:older,tickets:null,requests:null});
  expect(page.current).toBe('/account?orderCursor='+order+'&ticketCursor='+ticket);
  expect(page.orders.next).toBe('/account?orderCursor='+older+'&ticketCursor='+ticket);
  expect(page.orders.first).toBe('/account?ticketCursor='+ticket);
  expect(page.tickets.first).toBe('/account?orderCursor='+order);
  expect(page.download).toBe('/api/account?orderCursor='+order+'&ticketCursor='+ticket+'&download=1');
 });
});
