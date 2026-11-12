/** Isolated UI network fixtures only; cryptographic verification lives in the PostgreSQL suite. */
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser,type BrowserContext,type Page} from 'playwright';
import {generateAuthenticationOptions,generateRegistrationOptions} from '@simplewebauthn/server';
let browser:Browser,script:string,css:string;
const origin='https://urbangangtour.co.ke';
const creation=()=>generateRegistrationOptions({rpID:'urbangangtour.co.ke',rpName:'Synthetic fixture',userName:'synthetic@example.invalid',userID:new Uint8Array(32).fill(9),supportedAlgorithmIDs:[-7,-257],attestationType:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'}});
async function fixture(mode:'signin'|'manager',settings:{unsupported?:boolean;cancel?:boolean;mutationFails?:boolean}={}){
 const context=await browser.newContext({viewport:{width:360,height:800}}),requests:Record<string,unknown>[]=[];
 await context.route('**/*',async route=>{
  const req=route.request();if(new URL(req.url()).pathname!=='/api/account/passkeys')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width"><div id="root"></div>'});
  if(req.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,passkeys:[]})});
  const body=req.postDataJSON() as Record<string,unknown>;requests.push(body);
  if(body.action==='login-options'){await new Promise(resolve=>setTimeout(resolve,100));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,options:await generateAuthenticationOptions({rpID:'urbangangtour.co.ke',userVerification:'required'})})})}
  if(body.action==='register-options')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,options:await creation()})});
  return route.fulfill({status:settings.mutationFails?503:200,contentType:'application/json',body:JSON.stringify(settings.mutationFails?{error:'passkeys_unavailable'}:{ok:true})});
 });
 if(settings.unsupported)await context.addInitScript(()=>Object.defineProperty(window,'PublicKeyCredential',{value:undefined,configurable:true}));
 if(settings.cancel)await context.addInitScript(()=>Object.defineProperty(navigator.credentials,'get',{value:()=>Promise.reject(new DOMException('Synthetic cancellation','NotAllowedError')),configurable:true}));
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origin);await page.addStyleTag({content:css+'body{font-family:Arial,sans-serif;padding:12px;margin:0;color:#18141a;background:#faf8fa}'});
 await page.addScriptTag({content:script});expect(errors).toEqual([]);await page.evaluate(mode=>(window as unknown as {mountPasskeys:(mode:string)=>void}).mountPasskeys(mode),mode);
 return {context,page,requests};
}
const close=async(context:BrowserContext,page:Page)=>{await page.close();await context.close()};
describe('passkey controls in an intercepted canonical-origin browser',()=>{
 beforeAll(async()=>{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {PasskeySignIn,PasskeyManager} from './app/account/PasskeyControls';const root=createRoot(document.getElementById('root'));window.passkeySuccesses=0;window.mountPasskeys=mode=>root.render(mode==='signin'?<PasskeySignIn onSuccess={()=>window.passkeySuccesses++}/>:<PasskeyManager verified={true}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'passkey-fixture.js',platform:'browser',format:'iife',banner:{js:'var process={env:{NODE_ENV:"production"},browser:true};'},define:{'process.env.NODE_ENV':'"production"'}});
  script=bundle.outputFiles.find(file=>file.path.endsWith('.js'))!.text;css=bundle.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 },30000);
 afterAll(async()=>{await browser?.close()});
 it('does not auto-prompt or request options, and retains password fallback when unsupported',async()=>{
  const {context,page,requests}=await fixture('signin',{unsupported:true});
  try{await page.getByText('Passkeys are unavailable in this browser. Use your password.').waitFor();expect(await page.getByRole('button',{name:'Sign in with a passkey'}).isDisabled()).toBe(true);expect(requests).toEqual([])}finally{await close(context,page)}
 });
 it('blocks duplicate gestures and returns a cancelled ceremony to password fallback',async()=>{
  const {context,page,requests}=await fixture('signin',{cancel:true});
  try{
   await page.getByRole('button',{name:'Sign in with a passkey'}).waitFor();
   await page.evaluate(()=>{const button=document.querySelector('button')!;button.click();button.click()});
   await page.getByRole('alert').filter({hasText:'Passkey request cancelled.'}).waitFor();
   expect(requests.map(item=>item.action)).toEqual(['login-options']);expect(await page.evaluate(()=>(window as unknown as {passkeySuccesses:number}).passkeySuccesses)).toBe(0);
   expect(await page.getByRole('button',{name:'Sign in with a passkey'}).isEnabled()).toBe(true);
  }finally{await close(context,page)}
 });
 it('shows a server failure after a real device registration without claiming a key was added',async()=>{
  const {context,page,requests}=await fixture('manager',{mutationFails:true});
  try{
   const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
   await page.getByText('No passkeys added yet.').waitFor();await page.getByLabel('Current password').fill('Synthetic fixture password');await page.getByRole('button',{name:'Add a passkey'}).click();
   await page.getByRole('alert').filter({hasText:'We could not complete the passkey request.'}).waitFor();expect(requests.map(item=>item.action)).toEqual(['register-options','register-finish']);expect(await page.getByText('Passkey added.',{exact:true}).count()).toBe(0);
   expect(await page.getByLabel('Current password').inputValue()).toBe('Synthetic fixture password');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }finally{await close(context,page)}
 });
});
