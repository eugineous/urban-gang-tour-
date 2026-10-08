import {describe,it,expect} from 'vitest';
import {rewriteHtmlMedia} from '@/lib/img';
describe('hidden runtime media',()=>{
 it('does not start a second hero download while the runtime is hidden',()=>{
  const html=rewriteHtmlMedia('<video src="/assets/video/hero-main.mp4" preload="auto" autoplay></video>',true);
  expect(html).toContain('data-ugt-video="/assets/light-v1/video/hero-main.mp4"');
  expect(html).toContain('preload="none"');
  expect(html).not.toMatch(/\ssrc=/);
  expect(html).not.toMatch(/\sautoplay/);
 });
 it('keeps the visible server-rendered hero available before JavaScript boots',()=>{
  expect(rewriteHtmlMedia('<video src="/assets/video/hero-main.mp4"></video>')).toContain('src="/assets/light-v1/video/hero-main.mp4"');
 });
});
