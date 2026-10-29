import {expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@/lib/server/docgen',()=>({ensureDocgenSchema:vi.fn(),getDocumentBySerial:f.get,DOC_TYPES:{deliverynote:{label:'Delivery note (draft)'}},isOperationalDoc:(type:string)=>['deliverynote','purchaseorder','creditnote','customerstatement'].includes(type)}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not_found')}}));
import VerifyPage from '@/app/verify/[serial]/page';
it('never exposes a manual customer draft as a verified public document',async()=>{
 for(const type of ['deliverynote','purchaseorder','creditnote','customerstatement']){
  f.get.mockResolvedValue({type,status:'final',serial:'UGT-DN-26-001',issued_to:'Private customer draft',payload:{}});
  await expect(VerifyPage({params:Promise.resolve({serial:'UGT-DN-26-001'})})).rejects.toThrow('not_found');
 }
});
