import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';

vi.mock('@/ui/i18n/LanguageProvider',()=>({useMessages:()=>((key:string)=>key)}));
import OfflineClient from '@/app/offline/OfflineClient';

it('provides a native retry destination when offline JavaScript is unavailable',()=>{
 const html=renderToStaticMarkup(createElement(OfflineClient));
 expect(html).toMatch(/<a\b[^>]*href="\/"[^>]*>offline\.retry<\/a>/);
});
