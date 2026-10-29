import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import * as receipt from '@/lib/client/print-order-receipt';

const request=vi.fn();
const anchor={href:'',download:'',rel:'',click:vi.fn(),remove:vi.fn()};
beforeEach(()=>{
 vi.stubGlobal('fetch',request);request.mockReset();anchor.click.mockReset();
 vi.stubGlobal('document',{createElement:()=>anchor,body:{append:vi.fn()}});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:receipt-fixture');
 vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.useFakeTimers();
});
afterEach(()=>{vi.runOnlyPendingTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()});
const order={id:'ORD-RECEIPT-EXAMPLE',status:'paid'};
const pdf=()=>new Response('%PDF-1.7\nfixture',{headers:{'Content-Type':'application/pdf'}});
describe('admin receipt download',()=>{
 it.each(['pending','unknown','failed','refunded','partially_refunded'])('never labels an %s order as a paid receipt',async status=>{
  const result=await receipt.downloadOrderReceipt({...order,status});
  expect(result.ok).toBe(false);expect(result.message).toMatch(/confirmed payment/i);expect(request).not.toHaveBeenCalled();
 });
 it('surfaces a server-side payment change without downloading an artifact',async()=>{
  request.mockResolvedValue(new Response('{"error":"payment_not_confirmed"}',{status:409}));
  const result=await receipt.downloadOrderReceipt(order);
  expect(result).toMatchObject({ok:false});expect(result.message).toMatch(/confirmed payment/i);expect(anchor.click).not.toHaveBeenCalled();
 });
 it('keeps a useful retry message when the PDF endpoint fails',async()=>{
  request.mockRejectedValue(Error('offline'));
  const result=await receipt.downloadOrderReceipt(order);
  expect(result.ok).toBe(false);expect(result.message).toMatch(/connection|retry|try again/i);expect(result.receiptUrl).toBe('/receipt/ORD-RECEIPT-EXAMPLE');
 });
 it('rejects HTML error pages instead of saving them as a receipt',async()=>{
  request.mockResolvedValue(new Response('<html>Sign in</html>',{headers:{'Content-Type':'text/html'}}));
  expect((await receipt.downloadOrderReceipt(order)).ok).toBe(false);expect(anchor.click).not.toHaveBeenCalled();
 });
 it('reports a browser download failure and preserves the receipt-page fallback',async()=>{
  request.mockResolvedValue(pdf());anchor.click.mockImplementationOnce(()=>{throw Error('blocked')});
  const result=await receipt.downloadOrderReceipt(order);
  expect(result.ok).toBe(false);expect(result.message).toMatch(/browser|download/i);expect(result.receiptUrl).toBe('/receipt/ORD-RECEIPT-EXAMPLE');
 });
 it('downloads the existing server PDF with no popup or client financial rendering',async()=>{
  request.mockResolvedValue(pdf());
  const result=await receipt.downloadOrderReceipt(order);
  expect(result.ok).toBe(true);expect(result.message).toMatch(/ready|requested/i);expect(anchor.download).toBe('UGT-Receipt-ORD-RECEIPT-EXAMPLE.pdf');
  expect(request.mock.calls[0][0]).toBe('/api/receipts/ORD-RECEIPT-EXAMPLE/pdf');
  expect(request.mock.calls[0][1]).toMatchObject({cache:'no-store',credentials:'same-origin'});expect(anchor.click).toHaveBeenCalledOnce();
 });
});
