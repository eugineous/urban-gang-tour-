import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');
const rule=(css:string,selector:string)=>{
  const start=css.indexOf(selector+'{');
  expect(start,selector).toBeGreaterThanOrEqual(0);
  return css.slice(start+selector.length+1,css.indexOf('}',start));
};

describe('compact independent public controls',()=>{
 it('keeps design CTAs touchable without the old oversized padding or forced hero width',()=>{
  const css=read('app/_components/merch/ColorBlastShop.module.css');
  const primary=rule(css,'.primary');
  for(const value of ['min-height:44px','padding:10px 16px','gap:10px','font:600 14px/1.4','white-space:normal'])expect(primary).toContain(value);
  expect(primary).not.toContain('min-height:54px');
  expect(primary).not.toContain('padding:16px 22px');
  expect(rule(css,'.hero .primary')).toContain('width:fit-content;max-width:100%');
 });

 it('keeps purchase and checkout actions full-width but at the compact touch size',()=>{
  const css=read('app/_components/Commerce.module.css');
  for(const selector of ['.summary :global(.button)','.checkoutForm :global(.button)','.purchase :global(.button)']){
   const action=rule(css,selector);
   for(const value of ['min-height:44px','font-size:14px','line-height:1.4','padding:10px 16px','width:100%','justify-content:center'])expect(action,selector).toContain(value);
  }
  expect(rule(css,'.cardActions :global(.button)')).toContain('min-height:44px');
 });

 it('does not shrink gallery buttons or mobile-readable product inputs',()=>{
  const css=read('app/_components/Commerce.module.css');
  expect(rule(css,'.galleryStage>button')).toContain('width:100%;height:100%;padding:28px');
  expect(rule(css,'.thumbnails button')).toContain('height:80px');
  expect(rule(css,'.purchase select,.purchase input')).toContain('font-size:16px');
  expect(rule(css,'.purchase select,.purchase input')).toContain('min-height:48px');
 });

 it('keeps the footer contact action compact and content-width on narrow screens',()=>{
  const css=read('ui/components/ContactChrome.module.css');
  const action=rule(css,'.contactButton');
  for(const value of ['min-height:44px','padding:10px 16px','gap:12px','font-size:14px','line-height:1.4'])expect(action).toContain(value);
  expect(css).not.toContain('.contactButton{width:100%}');
  expect(rule(css,'.socials>a')).toContain('min-width:44px;min-height:44px;max-height:44px');
 });

 it('reduces the floating contact launcher while preserving visibility and focus handling',()=>{
  const css=read('ui/components/ContactChrome.module.css');
  const action=rule(css,'.floatingTalk');
  for(const value of ['min-height:48px','padding:5px 12px 5px 5px','gap:8px','font-size:14px'])expect(action).toContain(value);
  expect(rule(css,'.floatingTalk>img')).toContain('width:36px;height:36px');
  expect(css).toContain('.floatingTalk[hidden]{display:none}');
  expect(css).toContain('.floatingTalk:focus-visible');
 });

 it('keeps homepage actions at 44px without changing the hero image or card controls',()=>{
  const css=read('ui/components/HomeSections.module.css');
  expect(rule(css,'.heroActions>a')).toContain('min-block-size:44px;font-size:14px;line-height:1.4');
  expect(rule(css,'.heroShop,.heroBook')).toContain('gap:10px;padding:10px 16px');
  expect(css).toContain('.heroActions>a{padding:10px 12px;font-size:13px;gap:8px;border-radius:12px}');
  expect(css).toContain('.heroImage{position:absolute;inset:0;');
  const catalogue=read('app/_components/ShopCatalogue.module.css');
  expect(rule(catalogue,'.cardActions button,.cardActions .designLink')).toContain('min-height:44px');
 });
});
