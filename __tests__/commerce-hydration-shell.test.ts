import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveCommerce} from '@/app/_components/LiveCommerce';
afterEach(()=>vi.unstubAllGlobals());
it.each([['shop','Shop.'],['cart','Your cart.'],['checkout','Checkout.']] as const)('server-renders a stable %s heading without reading browser storage', (view,title)=>{
 const getItem=vi.fn(()=>{throw new Error('Browser storage is unavailable on the server')});
 vi.stubGlobal('localStorage',{getItem});
 const html=renderToStaticMarkup(createElement(LiveCommerce,{view}));
 expect(html).toContain(title);expect(html).toContain('Loading the live catalogue');
 expect((html.match(/<h1(?:\s|>)/g)||[]).length).toBe(1);
 expect(getItem).not.toHaveBeenCalled();
});
it('renders a stable event placeholder before any client catalogue result',()=>{
 const html=renderToStaticMarkup(createElement(LiveCommerce,{view:'checkout',eventId:'test-event'}));
 expect(html).toContain('<h1>Checkout.</h1>');expect(html).toContain('href="/events">Tickets</a>');expect(html).toContain('Loading the live catalogue');expect(html).not.toContain('<form');
});
it('server-renders supplied live products without a loading gap or browser storage access',()=>{
 const getItem=vi.fn(()=>{throw Error('No browser storage during SSR')});vi.stubGlobal('localStorage',{getItem});
 const html=renderToStaticMarkup(createElement(LiveCommerce,{initialProducts:[{id:'approved-tee',name:'Approved Tee',price:1800,made_to_order:true,stock:null,variants:[{label:'Black / M',priceAdjustment:0,stock:null}]}]}));
 expect(html).toContain('Approved Tee');expect(html).toContain('Add to cart');expect(html).not.toContain('Loading the live catalogue');expect(getItem).not.toHaveBeenCalled();
});
it('embeds the live collection without another page heading',()=>{
 const html=renderToStaticMarkup(createElement(LiveCommerce,{embedded:true,initialProducts:[{id:'approved-tee',name:'Approved Tee',price:1800,variants:[]}]}));
 expect(html).toContain('Approved Tee');expect(html).toContain('id="merchandise-catalogue"');expect(html).not.toContain('<h1');
});
