import {describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({db:()=>null,q:vi.fn(async()=>[]),qSchema:vi.fn()}));
vi.mock('@/lib/server/media',()=>({isMediaUrl:()=>false}));
import {isDocType,preparePayload,validateFinalIssue,renderDoc,type DocType} from '@/lib/server/docgen';
const base={date:'2026-10-28',party:'Example School',partyAddress:'Nairobi',reference:'INV-EXAMPLE',purpose:'Agreed event materials',preparedBy:'Example staff',notes:'Review the source records.',requestedDate:'',openingBalance:1000,lines:[{description:'Event shirt',qty:2,rate:700,date:'2026-10-20',reference:'INV-EXAMPLE',debit:1400,credit:0}]};
describe('manual operational documents',()=>{
 it.each(['deliverynote','purchaseorder','creditnote','customerstatement'])('offers %s as a clearly marked draft without verification or a payment assertion',async key=>{
  expect(isDocType(key)).toBe(true);
  const type=key as DocType,prepared=preparePayload(type,base);
  expect(prepared.payload).toMatchObject({draft:true,party:'Example School',preparedBy:'Example staff'});
  validateFinalIssue(type,prepared,base);
  const html=String(await renderDoc(type,prepared.payload,'UGT-DRAFT-26-001'));
  expect(html).toContain('STAFF-ENTERED DRAFT');expect(html).toContain('Example School');expect(html).toContain('Not a tax document');
  expect(html).not.toContain('data:image/png;base64,');expect(html).not.toContain('/verify/');expect(html).not.toContain('Payment received');
 });
 it('calculates a purchase request from the entered quantities and rates',()=>{
  const result=preparePayload('purchaseorder' as DocType,{...base,total:999});
  expect(result.computed).toMatchObject({total:1400});
 });
 it('calculates statement balance from manual opening, debit and credit rows',()=>{
  const result=preparePayload('customerstatement' as DocType,{...base,lines:[base.lines[0],{date:'2026-10-25',reference:'REF-EXAMPLE',description:'Recorded adjustment',debit:0,credit:400}]});
  expect(result.computed).toMatchObject({totalDebit:1400,totalCredit:400,closingBalance:2000});
 });
 it('requires an attributable source and preparer before storing a final draft',()=>{
  const prepared=preparePayload('creditnote' as DocType,{...base,reference:'',preparedBy:''});
  expect(()=>validateFinalIssue('creditnote' as DocType,prepared,{})).toThrow(/reference|preparer/);
 });
 it('refuses negative or conflicting entered amounts rather than inventing a payment',()=>{
  expect(()=>preparePayload('purchaseorder' as DocType,{...base,lines:[{description:'Fee',qty:1,rate:-100}]})).toThrow();
  expect(()=>preparePayload('customerstatement' as DocType,{...base,lines:[{description:'Fee',date:'2026-10-28',reference:'REF',debit:100,credit:50}]})).toThrow();
 });
 it('escapes manual content and never accepts a supplied signature or paid flag',async()=>{
  expect(()=>preparePayload('deliverynote' as DocType,{...base,paid:true,signature:'Confirmed'})).toThrow(/Unsupported/);
  const prepared=preparePayload('deliverynote' as DocType,{...base,party:'<script>alert(1)</script>'});
  expect(prepared.payload).not.toHaveProperty('paid');expect(prepared.payload).not.toHaveProperty('signature');
  const html=String(await renderDoc('deliverynote' as DocType,prepared.payload,'UGT-DN-26-001'));
  expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>alert');expect(html).not.toContain('Confirmed');
 });
});
