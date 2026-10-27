import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not-found')}}));
vi.mock('@/lib/server/db',()=>({q:vi.fn(async()=>[{id:'ORD-ORIGINAL',status:'pending'}]),hasDb:()=>true,db:()=>true}));
import OrderVerification from '@/app/verify/order/[id]/page';
import {PrintDocumentButton} from '@/app/_components/PrintDocumentButton';
it('keeps anonymous verification identifiers and minimal projection server guarded',async()=>{
 await expect(OrderVerification({params:Promise.resolve({id:'invalid'})})).rejects.toThrow('not-found');
 const html=renderToStaticMarkup(await OrderVerification({params:Promise.resolve({id:'ORD-ORIGINAL'})}));
 expect(html).toContain('ORD-ORIGINAL');expect(html).toContain('data-language-control');expect(html).not.toContain('email@');
});
it('keeps English initial printable controls without depending on a translation service',()=>{
 const html=renderToStaticMarkup(createElement(PrintDocumentButton));expect(html).toContain('Print receipt');expect(html).not.toContain('translate.google');
});
