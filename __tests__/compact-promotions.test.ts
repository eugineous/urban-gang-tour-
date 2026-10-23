// CSS source contracts only; root also checks rendered viewport behavior.
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {describe,expect,it} from 'vitest';

const host=readFileSync('ui/components/BookingInvitation.module.css','utf8');
const campaign=readFileSync('app/_components/CampaignDisplays.module.css','utf8');
function declarations(css:string,selector:string,property:string){
 const values:string[]=[];
 postcss.parse(css).walkRules(selector,rule=>rule.walkDecls(property,decl=>{values.push(decl.value)}));
 return values;
}

describe('compact promotion sizing',()=>{
 it('bounds the host invitation without clipping its source video or scroll area',()=>{
  expect(declarations(host,'.dialog','width')).toEqual(['min(440px,calc(100% - 24px))']);
  expect(declarations(host,'.dialog','max-height')).toEqual(['calc(100dvh - 24px)']);
  expect(declarations(host,'.dialog','overflow')).toEqual(['auto']);
  expect(declarations(host,'.film video','height')).toEqual(['auto']);
  expect(declarations(host,'.film video','object-fit')).toEqual(['contain']);
  expect(declarations(host,'.film video','max-height')).toEqual(['min(110px,20dvh)','min(100px,20dvh)']);
 });
 it('uses smaller host copy and paired actions with a narrow-screen stack',()=>{
  expect(declarations(host,'.copy','padding')).toContain('16px');
  expect(declarations(host,'.copy','grid-template-columns')).toEqual(['repeat(2,minmax(0,1fr))']);
  expect(declarations(host,'.copy h2','font-size')).toEqual(['26px','24px','24px']);
  expect(declarations(host,'.copy>p:not(.eyebrow)','font-size')).toEqual(['14px']);
  expect(host).toContain('@media(max-width:380px)');
  expect(declarations(host,'.copy>.primary,.copy>.secondary','grid-column')).toEqual(['1/-1']);
  expect(declarations(host,'.copy small','font-size')).toEqual(['12px']);
 });
 it('keeps host close, playback, primary, secondary and dismissal touch targets usable',()=>{
  expect(declarations(host,'.heading button,.film button','min-height')).toEqual(['44px']);
  expect(declarations(host,'.primary,.secondary,.dismiss','min-height')).toEqual(['44px']);
  expect(declarations(host,'.heading','position')).toEqual(['sticky']);
  expect(declarations(host,'.dialog :focus-visible','outline')).toEqual(['3px solid #087b98']);
  expect(declarations(host,'.dialog:not([open])','display')).toEqual(['none']);
 });
 it('keeps campaign cards compact while reserving room for the close control',()=>{
  expect(declarations(campaign,'.banner','width')).toEqual(['min(420px,calc(100vw - 24px))']);
  expect(declarations(campaign,'.banner','grid-template-columns')).toContain('76px minmax(0,1fr)');
  expect(declarations(campaign,'.banner','padding-right')).toEqual(['44px']);
  expect(declarations(campaign,'.dialog','width')).toEqual(['min(440px,calc(100vw - 24px))']);
  expect(declarations(campaign,'.dialog .copy','padding')).toContain('18px');
  expect(declarations(campaign,'.creative:not(:has(.image)) .copy','padding-top').every(value=>value==='52px')).toBe(true);
  expect(declarations(campaign,'.creative>.image','max-height')).toEqual(['28svh','26svh']);
 });
 it('retains campaign scrolling, focus outlines and 44px controls without enlarging animation',()=>{
  expect(declarations(campaign,'.banner','overflow')).toEqual(['auto']);
  expect(declarations(campaign,'.dialog','overflow')).toEqual(['auto']);
  expect(declarations(campaign,'.cta','min-height')).toEqual(['44px']);
  expect(declarations(campaign,'.close','width')).toEqual(['44px']);
  expect(declarations(campaign,'.close','height')).toEqual(['44px']);
  expect(campaign).toContain('@media(prefers-reduced-motion:reduce)');
  expect(declarations(campaign,'.dialog :focus-visible,.banner :focus-visible','outline')).toEqual(['3px solid #941358']);
 });
});
