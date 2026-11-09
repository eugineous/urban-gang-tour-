import {expect,it} from 'vitest';
import {knownVisibleInstagramLinks} from '../scripts/instagram-discovery-counts.mjs';
it('counts known visible posts once, including metadata already collected from the page',()=>{
 const link='https://www.instagram.com/urban_newsgang/reel/KNOWN123/';
 const known=new Set(['KNOWN123']);
 expect(knownVisibleInstagramLinks([link,link],known,[{code:'KNOWN123'}])).toBe(0);
 expect(knownVisibleInstagramLinks([link,link],known,[])).toBe(1);
 expect(knownVisibleInstagramLinks([link],new Set(),[])).toBe(0);
});
