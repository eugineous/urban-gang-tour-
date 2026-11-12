import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogueProblems} from '@/lib/i18n/messages';

describe('optional native passkey controls',()=>{
 it('offers password fallback and requires verified email for adding a key',async()=>{
  const path='../app/account/PasskeyControls';const components=await import(path).catch(()=>null);
  expect(components,'passkey controls must exist').not.toBeNull();
  const signIn=renderToStaticMarkup(createElement(components!.PasskeySignIn,{onSuccess:()=>{}}));
  expect(signIn).toContain('Sign in with a passkey');expect(signIn).toContain('password');
  const manager=renderToStaticMarkup(createElement(components!.PasskeyManager,{verified:false}));
  expect(manager).toContain('Verify your email');expect(manager).not.toContain('type="password"');
 });
 it('has complete native copy with consistent placeholders for all six locales',async()=>{
  const path='../ui/i18n/catalogues/passkeys';const catalogue=await import(path).catch(()=>null);
  expect(catalogue,'passkey catalogue must exist').not.toBeNull();expect(catalogueProblems(catalogue!.passkeyMessages)).toEqual([]);
 });
});
