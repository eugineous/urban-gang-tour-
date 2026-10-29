import {beforeEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {formatMessage,type Catalogue,type MessageValues} from '@/lib/i18n/messages';
const hooks=vi.hoisted(()=>({values:[] as unknown[],index:0,effect:undefined as undefined|(()=>void|(()=>void)),request:vi.fn()}));
// Exercise the component's actual request callback and rendered output without
// introducing a DOM dependency. State persists across the controlled rerenders.
vi.mock('react',async original=>({...await original<typeof import('react')>(),
 useState:(initial:unknown)=>{const index=hooks.index++;if(!(index in hooks.values))hooks.values[index]=initial;return [hooks.values[index],(value:unknown)=>{hooks.values[index]=typeof value==='function'?value(hooks.values[index]):value;}];},
 useEffect:(effect:()=>void|(()=>void))=>{hooks.effect=effect;},
}));
vi.mock('@/lib/client/fetch-with-timeout',()=>({fetchWithTimeout:hooks.request}));
vi.mock('@/ui/i18n/LanguageProvider',()=>({useInterfaceLanguage:()=>({locale:'en'}),useMessages:(catalogue:Catalogue<string>)=>(key:string,values?:MessageValues)=>formatMessage(catalogue,'en',key,values).text}));
import CustomerFulfillment from '@/app/_components/CustomerFulfillment';
const render=(orderId:string)=>{hooks.index=0;return renderToStaticMarkup(CustomerFulfillment({orderId}));};
const progress=(status:string)=>({paymentStatus:'paid',fulfillment:{status},history:[]});
beforeEach(()=>{hooks.values=[];hooks.index=0;hooks.effect=undefined;hooks.request.mockReset();});
it('clears the previous order progress while a different order loads',async()=>{
 hooks.request.mockResolvedValueOnce(new Response(JSON.stringify(progress('in_production')))).mockReturnValueOnce(new Promise(()=>{}));
 render('ORD-FIRST');const stopFirst=hooks.effect!();
 await vi.waitFor(()=>expect(render('ORD-FIRST')).toContain('In production'));
 if(typeof stopFirst==='function')stopFirst();render('ORD-SECOND');const stopSecond=hooks.effect!();
 expect(render('ORD-SECOND')).toContain('Loading order progress');
 expect(render('ORD-SECOND')).not.toContain('In production');if(typeof stopSecond==='function')stopSecond();
});
it('ignores a superseded response that finishes parsing after cancellation',async()=>{
 let finish!: (value:unknown)=>void;
 hooks.request.mockResolvedValueOnce({ok:true,json:()=>new Promise(resolve=>{finish=resolve;})} as Response)
  .mockResolvedValueOnce(new Response(JSON.stringify(progress('packed'))));
 render('ORD-FIRST');const stopFirst=hooks.effect!();await Promise.resolve();
 if(typeof stopFirst==='function')stopFirst();render('ORD-SECOND');const stopSecond=hooks.effect!();
 await vi.waitFor(()=>expect(render('ORD-SECOND')).toContain('Packed'));
 finish(progress('in_production'));await Promise.resolve();await Promise.resolve();
 expect(render('ORD-SECOND')).toContain('Packed');
 expect(render('ORD-SECOND')).not.toContain('In production');if(typeof stopSecond==='function')stopSecond();
});
