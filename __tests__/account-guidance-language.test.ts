import {afterAll,beforeAll,expect,it} from 'vitest';
import {build} from 'esbuild';
import {chromium,type Browser} from 'playwright';
import {existsSync} from 'node:fs';

const guidance=[
 {locale:'en',login:'Use your email or Kenyan phone number.',forgot:'Enter the email used for your account.',reset:'Use at least 8 characters. All other devices will be signed out.'},
 {locale:'sw',login:'Tumia barua pepe au simu ya Kenya.',forgot:'Weka barua pepe ya akaunti yako.',reset:'Tumia angalau herufi 8. Vifaa vingine vyote vitaondolewa.'},
 {locale:'fr',login:'Utilisez votre e-mail ou téléphone kényan.',forgot:'Saisissez l’e-mail de votre compte.',reset:'Au moins 8 caractères. Tous les autres appareils seront déconnectés.'},
 {locale:'zh-Hans',login:'请使用邮箱或肯尼亚电话号码。',forgot:'请输入账户所用邮箱。',reset:'至少8个字符。其他所有设备将退出登录。'},
 {locale:'ru',login:'Используйте почту или кенийский телефон.',forgot:'Введите почту вашего аккаунта.',reset:'Не менее 8 символов. Остальные устройства будут отключены.'},
 {locale:'es',login:'Usa tu correo o teléfono keniano.',forgot:'Introduce el correo de tu cuenta.',reset:'Usa al menos 8 caracteres. Se cerrará la sesión en otros dispositivos.'},
];
const enabled=existsSync('/usr/bin/chromium');
let browser:Browser;
let script:string;

beforeAll(async()=>{
 if(!enabled)return;
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';
 import {LanguageProvider} from './ui/i18n/LanguageProvider';import LanguageChooser from './app/_components/LanguageChooser';import AccountApp from './app/account/AccountApp';
 createRoot(document.getElementById('app')).render(<LanguageProvider><LanguageChooser path="/account"/><div id="account"><AccountApp/></div></LanguageProvider>);
 `},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'account-guidance-fixture',setup(builder){
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/account";'}));
  builder.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
 }}]});
 script=bundle.outputFiles[0].text;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
},30000);
afterAll(async()=>{await browser?.close()});

async function openAccount(token?:string){
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 page.setDefaultTimeout(3000);
 const requests:string[]=[],recoveries:unknown[]=[],unexpected:string[]=[];
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1'){unexpected.push(request.url());return route.abort()}
  if(url.pathname==='/account'&&request.isNavigationRequest())return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><div id="app"></div>'});
  requests.push(request.method()+' '+url.pathname);
  if(url.pathname==='/api/auth'&&request.method()==='POST'&&request.postDataJSON().action==='me')return route.fulfill({json:{ok:true,user:null}});
  if(url.pathname==='/api/auth/google'&&request.method()==='GET')return route.fulfill({json:{}});
  if(url.pathname==='/api/account/recovery'&&request.method()==='POST'){
   recoveries.push(request.postDataJSON());
   return route.fulfill({status:400,json:{error:'invalid_or_expired_token'}});
  }
  unexpected.push(request.method()+' '+request.url());return route.abort();
 });
 await page.goto('http://127.0.0.1/account'+(token?'?reset='+token:''));
 await page.addScriptTag({content:script});
 await page.locator('#account form').waitFor();
 if(!token)await page.waitForFunction(()=>!!document.querySelector('#account input[type="password"]'));
 return {context,page,requests,recoveries,unexpected};
}

// A literal mode description leaves non-English users with English guidance.
for(const mode of ['login','forgot'] as const)it.skipIf(!enabled)(`updates ${mode} guidance in six languages while retaining filled inputs without submitting`,async()=>{
 const fixture=await openAccount(),{context,page,requests,recoveries,unexpected}=fixture;
 try{
  await page.locator('#account input[type="email"]').fill('fictional@example.test');
  await page.locator('#account input[type="tel"]').fill('0712345678');
  await page.locator('#account input[type="password"]').fill('FictionalPassword8');
  if(mode==='forgot')await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
  const baseline=[...requests];
  for(const item of guidance){
   await page.locator('[data-language-control] select').selectOption(item.locale);
   await page.locator('#account').getByText(item[mode],{exact:true}).waitFor();
   expect(await page.locator('#account input[type="email"]').inputValue()).toBe('fictional@example.test');
   if(mode==='login'){
    expect(await page.locator('#account input[type="tel"]').inputValue()).toBe('0712345678');
    expect(await page.locator('#account input[type="password"]').inputValue()).toBe('FictionalPassword8');
   }
   expect(requests).toEqual(baseline);
  }
  if(mode==='forgot')await page.locator('#account form > button[type="button"]').first().click();
  expect(await page.locator('#account input[type="password"]').inputValue()).toBe('FictionalPassword8');
  expect(recoveries).toEqual([]);expect(unexpected).toEqual([]);
 }finally{await context.close()}
},30000);

// Switching the reset description must not remount or discard its credential.
it.skipIf(!enabled)('updates reset guidance in six languages while keeping the password and stripped reset token available for submission',async()=>{
 const token='r'.repeat(43),{context,page,requests,recoveries,unexpected}=await openAccount(token);
 try{
  await page.locator('#account input[type="password"]').fill('FictionalReplacement8');
  expect(new URL(page.url()).search).toBe('');const baseline=[...requests];
  for(const item of guidance){
   await page.locator('[data-language-control] select').selectOption(item.locale);
   await page.locator('#account').getByText(item.reset,{exact:true}).waitFor();
   expect(await page.locator('#account input[type="password"]').inputValue()).toBe('FictionalReplacement8');
   expect(requests).toEqual(baseline);
  }
  await page.locator('#account button[type="submit"]').click();
  await page.locator('#account [role="alert"]').waitFor();
  expect(recoveries).toEqual([{action:'reset',token,password:'FictionalReplacement8'}]);
  expect(unexpected).toEqual([]);
 }finally{await context.close()}
},30000);

// Text-only button height can fall below the supported 44px touch target.
it.skipIf(!enabled)('provides a 44px account-switch button in login and signup for every language',async()=>{
 const {context,page}=await openAccount();
 try{
  for(const item of guidance){
   await page.locator('[data-language-control] select').selectOption(item.locale);
   const button=page.locator('#account form > button[type="button"]').first();
   for(let mode=0;mode<2;mode++){
    const box=await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
    await button.click();
   }
  }
 }finally{await context.close()}
},30000);
