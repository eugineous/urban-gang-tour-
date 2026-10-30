import {createElement,isValidElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({events:vi.fn(()=>new Promise<never>(()=>{}))}));
vi.mock('@/lib/server/public-events',()=>({readPublicEvents:state.events}));
vi.mock('next/navigation',()=>({usePathname:()=>'/clients'}));
import RootLayout from '@/app/layout';

it('returns the real public shell and supplied page without waiting for unrelated ticket availability',async()=>{
 const pending=Symbol('blocked_by_event_feed');
 const result=await Promise.race([
  Promise.resolve(RootLayout({children:createElement('h1',null,'Independent client page')})),
  Promise.resolve(pending),
 ]);
 expect(result).not.toBe(pending);
 expect(isValidElement(result)).toBe(true);
 const html=renderToStaticMarkup(result as ReturnType<typeof createElement>);
 expect(html).toContain('Independent client page');
 expect(html).toContain('class="site-header"');
 expect(html).toContain('href="/gallery"');
 expect(state.events).not.toHaveBeenCalled();
});
