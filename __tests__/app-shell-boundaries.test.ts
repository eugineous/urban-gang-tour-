import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({usePathname:vi.fn()}));
import {usePathname} from 'next/navigation';
import {AppShell} from '@/app/_components/AppShell';
it.each(['/','/shop/available','/cart','/checkout'])('keeps the server-content hydration boundary on %s',path=>{
 vi.mocked(usePathname).mockReturnValue(path);
 const html=renderToString(createElement(AppShell,{children:createElement('h1',null,'Test page')}));
 expect(html).toContain('<!--$--><h1>Test page</h1><!--/$-->');
 expect((html.match(/<main(?:\s|>)/g)||[]).length).toBe(1);
});
