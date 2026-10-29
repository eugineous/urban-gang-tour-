import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {AdminNotice,noticeKind} from '@/app/admin/AdminNotice';
describe('shared admin notices',()=>{
 it('announces important errors and provides an accessible dismiss action',()=>{
  const html=renderToStaticMarkup(createElement(AdminNotice,{notice:{id:1,message:'Receipt download failed. Retry.',kind:'error'}}));
  expect(html).toContain('role="alert"');expect(html).toContain('aria-live="assertive"');expect(html).toContain('Dismiss notification');expect(html).toContain('Receipt download failed');
 });
 it('announces a confirmed success without making it an urgent error',()=>{
  const html=renderToStaticMarkup(createElement(AdminNotice,{notice:{id:1,message:'Saved',kind:'success'}}));
  expect(html).toContain('role="status"');expect(html).toContain('aria-live="polite"');
 });
 it.each(['Could not save.','The request was not confirmed.','Receipt download blocked.','A source reference is required.'])('keeps failure severity for %s',message=>{
  expect(noticeKind(message)).toBe('error');
 });
});
