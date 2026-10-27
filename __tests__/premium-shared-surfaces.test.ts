import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import postcss from 'postcss';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const css=read('app/premium-implementation.css');
const sheet=postcss.parse(css);

describe('public premium surface boundaries',()=>{
 it('keeps every override screen-only and scoped to the semantic public shell',()=>{
  sheet.walkRules(rule=>{
   expect(rule.selector).toContain('[data-public-surface]');
   expect(rule.selector).not.toMatch(/:root|\[class[\^*$]?=/);
   let parent=rule.parent;
   while(parent&&parent.type!=='atrule')parent=parent.parent;
   expect(parent?.type).toBe('atrule');
   expect((parent as postcss.AtRule).params).toMatch(/^screen\b/);
  });
 });

 it('keeps private dashboards and standalone document routes outside the public marker',()=>{
  const shell=read('app/_components/AppShell.tsx');
  const boundary=shell.slice(shell.indexOf('const operational='),shell.indexOf('const critical='));
  expect(boundary).toContain("path.startsWith('/admin')");
  expect(boundary).toContain("path.startsWith('/organizer/dashboard')");
  expect(boundary).toContain('(t|tickets|receipt|verify)');
  expect(boundary).not.toContain('data-public-surface');
  expect(shell).toContain("data-public-surface={path.startsWith('/organizer')?undefined:critical?'transaction':'editorial'}");
 });

 it('does not restyle hero media, motion or generic commerce inputs',()=>{
  sheet.walkRules(rule=>{
   expect(rule.selector).not.toMatch(/hero|video|\.order-summary|\.checkout-card|\.document|\.ticket-preview/);
   if(/input|textarea|select/.test(rule.selector))expect(rule.selector).toContain(':focus-visible');
  });
  expect(css).not.toMatch(/animation:|transition:|transform:|!important/);
 });
});
