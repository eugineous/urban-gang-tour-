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
 expect(html).toContain('Your event tickets');expect(html).not.toContain('<form');
});
