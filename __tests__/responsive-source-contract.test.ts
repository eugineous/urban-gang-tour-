// Source regression contracts only. These are NOT rendered viewport/device tests.
import {expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
it('does not restore fixed-pixel floors in repeat(auto-fit/fill) admin grids',()=>{
 for(const file of readdirSync('app/admin',{recursive:true}).filter(f=>String(f).endsWith('.tsx'))){
  const source=readFileSync('app/admin/'+file,'utf8');
  expect(source,String(file)).not.toMatch(/repeat\(auto-(?:fit|fill),\s*minmax\([1-9][0-9]{2}px,\s*1fr\)\)/);
 }
});
it('uses available container width, zero-minimum tracks and wrapping actions instead of clipping the page',()=>{
 const css=readFileSync('app/responsive-continuation.css','utf8'),admin=readFileSync('app/admin/control-room.css','utf8');
 expect(css).toContain('minmax(min(100%,260px),1fr)');expect(css).toContain('container-type:inline-size');expect(css).toContain('max-inline-size:100%');
 expect(css).toContain('.language-control{');expect(css).toContain('flex-wrap:wrap');expect(css).toContain('inline-size:160px');expect(css).toContain('min-inline-size:0');expect(css).toContain('min-block-size:44px');expect(css).toContain(':focus-visible');expect(css).not.toContain('inline-size:96px');expect(css).not.toContain('.language-apply');expect(css).not.toContain('.language-dialog');expect(css).not.toContain('overflow-x:hidden');
 expect(admin).toContain('grid-template-columns:minmax(0,1fr) auto auto');expect(admin).toContain('minmax(min(100%,240px),1fr)');
});
