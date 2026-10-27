import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {formatMessage,catalogueProblems,type Catalogue,type MessageValues} from '@/lib/i18n/messages';
import {formatKes} from '@/lib/i18n/format';
import {INTERFACE_LOCALES,type InterfaceLocale} from '@/lib/i18n/locale';
import {ProductPurchase} from '@/app/_components/ProductPurchase';
import {ProductGallery} from '@/app/_components/ProductGallery';
import ShopCatalogueView from '@/app/_components/ShopCatalogueView';
import BuyBox from '@/app/marketplace/[eventId]/BuyBox';
import ColorBlastShop from '@/app/_components/merch/ColorBlastShop';
import {merchProducts} from '@/data/color-blast';
import {addCartItem} from '@/lib/client/live-cart';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const selected=vi.hoisted(()=>({locale:'en' as InterfaceLocale}));
vi.mock('@/ui/i18n/LanguageProvider',async original=>({
 ...await original<typeof import('@/ui/i18n/LanguageProvider')>(),
 useInterfaceLanguage:()=>({locale:selected.locale}),
 useMessages:(catalogue:Catalogue<string>)=>(key:string,values?:MessageValues)=>formatMessage(catalogue,selected.locale,key,values).text,
}));
vi.mock('@/lib/server/marketplace',()=>({
 getPublishedMarketplaceEvents:async()=>[{id:'original-event',name:'Original Event',event_date:'2026-10-27',venue:'Original Venue',city:'Original City',image:'/original-event.webp',organizer_business_name:'Original Organizer',tiers:[{name:'Original Tier',price:125.5}]}],
 getMarketplaceEventById:async()=>({id:'original-event',name:'Original Event',event_date:'2026-10-27',venue:'Original Venue',city:'Original City',description:'Original event description.',organizer_business_name:'Original Organizer',status:'published',tiers:[{name:'Original Tier',price:125.5}]}),
}));
const labels={en:'Add to cart',sw:'Ongeza kwenye kikapu',fr:'Ajouter au panier','zh-Hans':'加入购物车',ru:'Добавить в корзину',es:'Añadir al carrito'};
const product={id:'approved-original-sku',name:'Original Product',price:0.5,image:'/original.webp',category:'Original Category',description:'Original description',stock:10,name_on_back_enabled:true,variants:[{label:'Original Blue / M',priceAdjustment:0.25,stock:5}]};
const photoLabels={en:['Original Product · photograph 1','Original Product · photograph 2'],sw:['Original Product · picha 1','Original Product · picha 2'],fr:['Original Product · photographie 1','Original Product · photographie 2'],'zh-Hans':['Original Product · 第 1 张照片','Original Product · 第 2 张照片'],ru:['Original Product · фотография 1','Original Product · фотография 2'],es:['Original Product · fotografía 1','Original Product · fotografía 2']};
const generatedPhotos=[{id:'original-photo-1',url:'/gallery-original-1.webp',kind:'productPhotograph' as const,ordinal:1},{id:'original-photo-2',url:'/gallery-original-2.webp',kind:'productPhotograph' as const,ordinal:2}];
it.each(INTERFACE_LOCALES)('localizes generated photo alt and gallery accessibility labels while retaining authored alt in %s',async locale=>{
 selected.locale=locale;
 const {commerceMessages}=await import('@/ui/i18n/catalogues/commerce');
 const html=renderToStaticMarkup(createElement(ProductGallery,{name:'Original Product',photos:generatedPhotos}));
 expect(html).toContain('alt="'+photoLabels[locale][0]+'"');
 expect(html).toContain('aria-label="'+formatMessage(commerceMessages,locale,'gallery.enlarge',{name:photoLabels[locale][0]}).text+'"');
 for(const label of photoLabels[locale])expect(html).toContain('aria-label="'+formatMessage(commerceMessages,locale,'gallery.show',{name:label}).text+'"');
 expect(html).toContain('aria-label="'+formatMessage(commerceMessages,locale,'gallery.photos',{name:'Original Product'}).text+'"');
 expect(html).toContain('aria-label="'+formatMessage(commerceMessages,locale,'gallery.title',{name:'Original Product'}).text+'"');
 for(const photo of generatedPhotos)expect(html).toContain('src="'+photo.url+'"');
 const authored=renderToStaticMarkup(createElement(ProductGallery,{name:'Original Product',photos:[{id:'authored-photo',url:'/authored-original.webp',altText:'Texte fourni · photograph 9',language:'fr-FR'}]}));
 expect(authored).toContain('alt="Texte fourni · photograph 9"');expect(authored).toContain('lang="fr-FR"');expect(authored).toContain('src="/authored-original.webp"');
});

it.skipIf(!existsSync('/usr/bin/chromium'))('switches generated photo labels and authored captions without resetting the selected open image, focus, zoom or requests',async()=>{
 const {commerceMessages}=await import('@/ui/i18n/catalogues/commerce');
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {LanguageProvider} from './ui/i18n/LanguageProvider';
  import LanguageChooser from './app/_components/LanguageChooser';
  import {ProductGallery} from './app/_components/ProductGallery';
  createRoot(document.getElementById('app')).render(<LanguageProvider>
   <LanguageChooser path="/shop/original-product"/>
   <div id="generated"><ProductGallery name="Original Product" photos={${JSON.stringify(generatedPhotos)}}/></div>
   <div id="authored"><ProductGallery name="Original Product" photos={[{id:'authored-photo',url:'/authored-original.webp',altText:'Texte fourni · photograph 9',language:'fr-FR'}]}/></div>
  </LanguageProvider>);
 `},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-photo-labels',setup(builder){
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/shop/original-product";'}));
  builder.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
 }}]});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(5000);
  const requests:string[]=[],unexpected:string[]=[];
  await context.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());requests.push(request.method()+' '+url.pathname);
   if(url.origin==='http://127.0.0.1'&&url.pathname==='/fixture')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><div id="app"></div>'});
   if(url.origin!=='http://127.0.0.1'||request.method()!=='GET'||!['/gallery-original-1.webp','/gallery-original-2.webp','/authored-original.webp'].includes(url.pathname))unexpected.push(request.method()+' '+request.url());
   return route.abort();
  });
  await page.goto('http://127.0.0.1/fixture');await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.locator('#generated').getByRole('button',{name:'Show Original Product · photograph 2',exact:true}).click();
  await page.locator('#generated').getByRole('button',{name:'Enlarge Original Product · photograph 2',exact:true}).click();
  await page.getByRole('button',{name:'Zoom image',exact:true}).click();
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete));
  await page.evaluate(()=>{
   const dialog=document.querySelector('#generated dialog')!,image=dialog.querySelector('img')!,close=dialog.querySelector('.ugt-photo-toolbar button:last-child') as HTMLButtonElement;
   close.focus();(window as any).photoBefore={dialog,image,close,stage:document.querySelector('#generated button img'),thumbnail:document.querySelector('#generated button[aria-pressed="true"]')};
  });
  const baseline=[...requests];
  for(const locale of INTERFACE_LOCALES){
   await page.evaluate(locale=>{const chooser=document.querySelector('[data-language-control] select') as HTMLSelectElement;chooser.value=locale;chooser.dispatchEvent(new Event('change',{bubbles:true}))},locale);
   const message=(key:keyof typeof commerceMessages.en,values?:MessageValues)=>formatMessage(commerceMessages,locale,key,values).text;
   await page.locator('#generated .ugt-photo-caption p').filter({hasText:photoLabels[locale][1]}).waitFor();
   expect(await page.locator('#generated .ugt-photo-caption p').textContent()).toBe(photoLabels[locale][1]);
   expect(await page.locator('#generated .ugt-photo-caption p').getAttribute('lang')).toBe(locale==='en'?'en-KE':locale);
   expect(await page.locator('#generated dialog').getAttribute('aria-label')).toBe(message('gallery.title',{name:'Original Product'}));
   expect(await page.locator('#generated [role="group"]').getAttribute('aria-label')).toBe(message('gallery.photos',{name:'Original Product'}));
   expect(await page.locator('#generated > div > div').first().locator('button').getAttribute('aria-label')).toBe(message('gallery.enlarge',{name:photoLabels[locale][1]}));
   for(const [index,photo]of generatedPhotos.entries()){
    const thumbnail=page.locator('#generated button[aria-pressed]').nth(index);
    expect(await thumbnail.getAttribute('aria-label')).toBe(message('gallery.show',{name:photoLabels[locale][index]}));
    expect(await thumbnail.locator('img').getAttribute('src')).toBe(photo.url);
   }
   for(const image of [page.locator('#generated > div > div').first().locator('img'),page.locator('#generated dialog img')]){
    expect(await image.getAttribute('alt')).toBe(photoLabels[locale][1]);expect(await image.getAttribute('src')).toBe('/gallery-original-2.webp');
    expect(await image.getAttribute('lang')).toBe(locale==='en'?'en-KE':locale);
   }
   expect(await page.locator('#generated dialog .ugt-photo-toolbar button').first().textContent()).toBe(message('gallery.fit'));
   expect(await page.locator('#generated .ugt-photo-toolbar button').last().getAttribute('aria-label')).toBe(message('gallery.closePhoto'));
   expect(await page.locator('#generated .ugt-photo-caption button').allTextContents()).toEqual([message('previous'),message('next')]);
   expect(await page.evaluate(()=>{const b=(window as any).photoBefore;return b.dialog===document.querySelector('#generated dialog')&&b.dialog.open&&b.image===b.dialog.querySelector('img')&&b.image.isConnected&&b.stage===document.querySelector('#generated button img')&&b.close===document.activeElement&&b.thumbnail===document.querySelector('#generated button[aria-pressed="true"]')&&!!document.querySelector('#generated .ugt-photo-stage.zoomed')&&document.body.style.overflow==='hidden'})).toBe(true);
   expect(requests).toEqual(baseline);expect(unexpected).toEqual([]);
  }
  await page.locator('#generated .ugt-photo-toolbar button').last().click();
  await page.locator('#authored button').first().click();
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete));
  const authoredBaseline=[...requests];
  for(const locale of INTERFACE_LOCALES){
   await page.evaluate(locale=>{const chooser=document.querySelector('[data-language-control] select') as HTMLSelectElement;chooser.value=locale;chooser.dispatchEvent(new Event('change',{bubbles:true}))},locale);
   await page.waitForFunction(locale=>document.documentElement.lang===(locale==='en'?'en-KE':locale),locale);
   expect(await page.locator('#authored .ugt-photo-caption p').textContent()).toBe('Texte fourni · photograph 9');
   expect(await page.locator('#authored .ugt-photo-caption p').getAttribute('lang')).toBe('fr-FR');
   expect(await page.locator('#authored dialog img').getAttribute('alt')).toBe('Texte fourni · photograph 9');
   expect(await page.locator('#authored dialog img').getAttribute('lang')).toBe('fr-FR');
   expect(await page.locator('#authored dialog img').getAttribute('src')).toBe('/authored-original.webp');
   expect(requests).toEqual(authoredBaseline);expect(unexpected).toEqual([]);
  }
 }finally{await browser.close()}
},30000);
it('provides complete commerce messages and honest preview warnings in all six languages',async()=>{
 const {commerceMessages}=await import('@/ui/i18n/catalogues/commerce');
 expect(catalogueProblems(commerceMessages)).toEqual([]);
 for(const locale of INTERFACE_LOCALES){
  for(const key of ['design.warning','design.notOnSale','design.noPayment'] as const){
   const message=formatMessage(commerceMessages,locale,key);
   expect(message.fallback).toBe(false);expect(message.text.trim()).not.toBe('');
   if(locale!=='en')expect(message.text).not.toBe(commerceMessages.en[key]);
  }
 }
 const warnings=['Designs are not on sale. Samples, final prices and stock are unconfirmed.','Miundo haiuzwi. Sampuli, bei za mwisho na bidhaa zilizopo hazijathibitishwa.','Les créations ne sont pas en vente. Échantillons, prix finaux et stocks non confirmés.','设计尚未发售。样品、最终价格和库存均未确认。','Дизайны не продаются. Образцы, итоговые цены и наличие не подтверждены.','Los diseños no están a la venta. Las muestras, precios finales y existencias no están confirmados.'];
 INTERFACE_LOCALES.forEach((locale,index)=>expect(formatMessage(commerceMessages,locale,'design.warning').text).toBe(warnings[index]));
});

it.skipIf(!existsSync('/usr/bin/chromium'))('retains filled forms, live errors, approved quote and stored attempt through six languages without transaction or effect replay',async()=>{
 const {commerceMessages}=await import('@/ui/i18n/catalogues/commerce');
 const fixtureProduct={...product,price:1000,variants:[{label:'Original Blue / M',priceAdjustment:0,stock:10}]};
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {LanguageProvider} from './ui/i18n/LanguageProvider';
  import LanguageChooser from './app/_components/LanguageChooser';
  import {LiveCommerce} from './app/_components/LiveCommerce';
  import {ProductPurchase} from './app/_components/ProductPurchase';
  import BuyBox from './app/marketplace/[eventId]/BuyBox';
  createRoot(document.getElementById('app')).render(<LanguageProvider>
   <LanguageChooser path="/checkout"/>
   <div id="checkout"><LiveCommerce view="checkout"/></div>
   <div id="purchase"><ProductPurchase {...${JSON.stringify(fixtureProduct)}} nameOnBackEnabled/></div>
   <div id="marketplace"><BuyBox eventId="original-event" tiers={[{name:'Original Tier',price:125.5},{name:'Original VIP',price:200.75}]}/></div>
  </LanguageProvider>);
 `},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-commerce',setup(builder){
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const usePathname=()=>"/checkout";'}));
  builder.onLoad({filter:/\.css$/},()=>({contents:'export default {};',loader:'js'}));
 }}]});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(5000);
  const posts:{path:string;body:unknown}[]=[],gets:string[]=[],unexpected:string[]=[];
  let paymentCase:'none'|'unknown'|'uncertain'='none';
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(request.method()==='POST')posts.push({path:url.pathname,body:request.postDataJSON()});
   if(url.origin!=='http://127.0.0.1'){unexpected.push(request.url());return route.abort();}
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><div id="app"></div>'});
   if(url.pathname==='/api/site-data/products'){gets.push(url.pathname);return route.fulfill({json:{ok:true,products:[fixtureProduct]}});}
   if(url.pathname==='/api/checkout/fulfillment'){gets.push(url.pathname);return route.fulfill({json:{pickup:{location:'Original collection point'},delivery:{enabled:true,fee:300}}});}
   if(url.pathname==='/api/checkout/quote')return route.fulfill({json:{total:950,promoApplied:false,savings:350,deliveryFee:300}});
   if(paymentCase!=='none'){
    if(url.pathname==='/api/checkout/session')return route.fulfill({json:{ok:true,created:false}});
    if(url.pathname==='/api/checkout/recovery')return route.fulfill({status:404,json:{ok:false}});
    if(url.pathname==='/api/orders')return paymentCase==='unknown'?route.fulfill({status:400,json:{error:'constructor',message:'PRIVATE PROVIDER DETAIL'}}):route.abort();
   }
   if(request.method()==='POST'||url.pathname.startsWith('/api/'))unexpected.push(url.pathname);
   return route.abort();
  });
  await page.goto('http://127.0.0.1/fixture');
  await page.evaluate(({id,variant})=>{
   localStorage.setItem('ugt-live-cart-v1',JSON.stringify([{id,variant,printableName:'Amina',qty:1}]));
   localStorage.setItem('ugt-mpesa-attempt-v1',JSON.stringify({key:'original_recovery_key_12345678901234567890',orderId:'original-order',state:'unknown'}));
   (window as any).cartEvents=0;window.addEventListener('ugt-cart-changed',()=>{(window as any).cartEvents++});
  },{id:fixtureProduct.id,variant:fixtureProduct.variants[0].label});
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.locator('#checkout form input[name="name"]').waitFor();
  await page.locator('#checkout select').first().selectOption('delivery');
  for(const [name,value]of Object.entries({name:'Original Buyer',phone:'0712345678',email:'buyer@example.test',line1:'Original Road',city:'Nairobi',postalCode:'00100'}))await page.locator('#checkout input[name="'+name+'"]').fill(value);
  await page.locator('#checkout input[maxlength="60"]').fill('ORIGINAL-PROMO');
  await page.locator('#checkout input[type="checkbox"]').check();
  await page.getByRole('button',{name:'Check total and promo',exact:true}).click();
  await page.getByText(formatMessage(commerceMessages,'en','quote.promoNotApplied').text,{exact:true}).waitFor();
  await page.locator('#checkout details summary').click();
  await page.locator('#cart-name-0').fill('Unsaved draft');
  await page.locator('#purchase input[type="number"]').fill('2');
  await page.locator('#purchase input[maxlength="24"]').fill('Amina!');
  await page.locator('#purchase button[type="submit"]').click();
  await page.locator('#purchase [role="alert"]').waitFor();
  await page.locator('#marketplace select').selectOption('1');
  await page.locator('#marketplace input[type="number"]').fill('2');
  await page.locator('#marketplace input[autocomplete="name"]').fill('Original Holder');
  await page.locator('#marketplace input[type="email"]').fill('holder@example.test');
  await page.locator('#marketplace form').dispatchEvent('submit');
  await page.locator('#marketplace [role="alert"]').waitFor();
  await page.locator('#marketplace input[type="checkbox"]').check();
  await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('#checkout form,#purchase form,#marketplace form,#checkout input,#purchase input,#marketplace input,#checkout select,#purchase select,#marketplace select')];
   (window as any).preserved={nodes,values:nodes.map((n:any)=>[n.value,n.checked]),cart:localStorage.getItem('ugt-live-cart-v1'),attempt:localStorage.getItem('ugt-mpesa-attempt-v1'),events:(window as any).cartEvents};
  });
  expect(posts).toEqual([{path:'/api/checkout/quote',body:{items:[{id:fixtureProduct.id,variant:'Original Blue / M',printableName:'Amina',qty:1}],promoCode:'ORIGINAL-PROMO',fulfillment:{method:'delivery',address:{line1:'Original Road',city:'Nairobi',postalCode:'00100'}}}}]);
  const baselineGets=[...gets];
  for(const locale of INTERFACE_LOCALES){
   await page.evaluate(locale=>{
    const field=document.querySelector('#checkout input[name="name"]') as HTMLInputElement;field.focus();
    const chooser=document.querySelector('[data-language-control] select') as HTMLSelectElement;chooser.value=locale;chooser.dispatchEvent(new Event('change',{bubbles:true}));
   },locale);
   await page.waitForFunction(locale=>document.documentElement.lang===(locale==='en'?'en-KE':locale),locale);
   await page.getByText(formatMessage(commerceMessages,locale,'quote.promoNotApplied').text,{exact:true}).waitFor();
   expect(await page.locator('#purchase [role="alert"]').textContent()).toBe(formatMessage(commerceMessages,locale,'personalization.invalid').text);
   expect(await page.locator('#marketplace [role="alert"]').textContent()).toBe(formatMessage(commerceMessages,locale,'marketplace.acceptTerms').text);
   expect(await page.locator('#checkout aside h2').textContent()).toBe(formatMessage(commerceMessages,locale,'checkout.total',{amount:formatKes(950,locale)!}).text);
   expect(await page.evaluate(()=>{
    const b=(window as any).preserved,nodes=[...document.querySelectorAll('#checkout form,#purchase form,#marketplace form,#checkout input,#purchase input,#marketplace input,#checkout select,#purchase select,#marketplace select')];
    return nodes.length===b.nodes.length&&nodes.every((n:any,i)=>n===b.nodes[i]&&n.isConnected&&n.value===b.values[i][0]&&n.checked===b.values[i][1])&&localStorage.getItem('ugt-live-cart-v1')===b.cart&&localStorage.getItem('ugt-mpesa-attempt-v1')===b.attempt&&(window as any).cartEvents===b.events&&document.activeElement===document.querySelector('#checkout input[name="name"]');
   })).toBe(true);
   expect(await page.locator('#checkout').textContent()).toContain('Original Product');expect(await page.locator('#checkout').textContent()).toContain('Original Blue / M');
   expect(posts).toHaveLength(1);expect(gets).toEqual(baselineGets);expect(unexpected).toEqual([]);
  }
  const chooser=page.locator('[data-language-control] select');await chooser.focus();await chooser.press('Home');await chooser.press('ArrowDown');await chooser.press('Enter');
  await page.waitForFunction(()=>document.documentElement.lang==='sw');
  expect(await chooser.evaluate(node=>document.activeElement===node)).toBe(true);
  expect(posts).toHaveLength(1);expect(gets).toEqual(baselineGets);expect(unexpected).toEqual([]);
  for(const scenario of ['unknown','uncertain'] as const){
   paymentCase=scenario;
   await page.locator('#checkout form[aria-busy] button[type="submit"]').click();
   const key=scenario==='unknown'?'checkout.startFailed':'checkout.paymentUncertain';
   await page.locator('#checkout .modern-alert').filter({hasText:formatMessage(commerceMessages,'sw',key).text}).waitFor();
   const postCount=posts.length;
   expect(posts.slice(-3).map(post=>post.path)).toEqual(['/api/checkout/session','/api/checkout/recovery','/api/orders']);
   expect(posts.at(-2)?.body).toEqual({key:'original_recovery_key_12345678901234567890'});
   expect(posts.at(-1)?.body).toEqual({name:'Original Buyer',phone:'0712345678',email:'buyer@example.test',idempotencyKey:'original_recovery_key_12345678901234567890',promoCode:'ORIGINAL-PROMO',items:[{id:fixtureProduct.id,variant:'Original Blue / M',printableName:'Amina',qty:1}],fulfillment:{method:'delivery',address:{line1:'Original Road',city:'Nairobi',postalCode:'00100'}}});
   for(const locale of ['fr','zh-Hans','ru','es','en','sw'] as const){
    await chooser.selectOption(locale);
    await page.locator('#checkout .modern-alert').filter({hasText:formatMessage(commerceMessages,locale,key).text}).waitFor();
    expect(await page.locator('#checkout').textContent()).not.toContain('PRIVATE PROVIDER DETAIL');
    expect(await page.evaluate(()=>localStorage.getItem('ugt-mpesa-attempt-v1')===(window as any).preserved.attempt&&localStorage.getItem('ugt-live-cart-v1')===(window as any).preserved.cart)).toBe(true);
    expect(posts).toHaveLength(postCount);expect(gets).toEqual(baselineGets);expect(unexpected).toEqual([]);
   }
  }
 }finally{await browser.close()}
},30000);
it.each(INTERFACE_LOCALES)('localizes purchase and catalogue actions while keeping source values and fractional KES in %s',locale=>{
 selected.locale=locale;
 const purchase=renderToStaticMarkup(createElement(ProductPurchase,{...product,nameOnBackEnabled:true}));
 expect(purchase).toContain(labels[locale]);expect(purchase).toContain('value="Original Blue / M"');
 expect(purchase).toContain(formatKes(0.75,locale));
 expect(renderToStaticMarkup(createElement(ProductPurchase,{id:'original-zero',price:0,variants:[]}))).toContain(formatKes(0,locale));
 const before=JSON.stringify(product);
 const catalogue=renderToStaticMarkup(createElement(ShopCatalogueView,{products:[product],categories:[product.category],availability:'all',search:'',sort:'featured',category:'',printableNames:{[product.id]:'Amina'},variationFor:()=>product.variants[0].label,selectionFull:()=>false,onAvailability:()=>{},onSearch:()=>{},onSort:()=>{},onCategory:()=>{},onVariation:()=>{},onName:()=>{},onAdd:()=>{}}));
 expect(catalogue).toContain(labels[locale]);expect(catalogue).toContain('value="Original Blue / M"');expect(catalogue).toContain('value="Amina"');
 expect(catalogue).toContain('Original description');expect(catalogue).toContain('lang="en-KE"');
 for(const option of catalogue.matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/g))expect(option[1]).not.toMatch(/<[^>]+>/);
 expect(JSON.stringify(product)).toBe(before);
 const cart=addCartItem([],{id:product.id,variant:product.variants[0].label,printableName:'Amina',qty:2});
 expect(cart).toEqual([{id:product.id,variant:'Original Blue / M',printableName:'Amina',qty:2}]);
 expect((product.price+product.variants[0].priceAdjustment)*cart[0].qty).toBe(1.5);
 expect(formatKes(0,locale)).toMatch(/^KES /);
});
it.each(INTERFACE_LOCALES)('keeps marketplace tier values and design identity under translated presentation in %s',locale=>{
 selected.locale=locale;
 const html=renderToStaticMarkup(createElement(BuyBox,{eventId:'original-event',tiers:[{name:'Original Tier',price:125.5}]}));
 expect(html).toContain('value="0"');expect(html).toContain('Original Tier');expect(html).toContain(formatKes(125.5,locale));
 const design=renderToStaticMarkup(createElement(ColorBlastShop,{product:merchProducts[0]}));
 expect(design).toContain(merchProducts[0].name);expect(design).toContain(merchProducts[0].description);
 if(locale!=='en'){expect(html).not.toContain('>Pay with card<');expect(design).not.toContain('>Save design <');}
 expect(design).not.toContain('/api/');
});

it.each(INTERFACE_LOCALES)('translates server marketplace leaves with original organizers, authoritative days and numeric KES in %s',async locale=>{
 selected.locale=locale;
 const {default:MarketplacePage}=await import('@/app/marketplace/page');
 const {default:MarketplaceEventPage}=await import('@/app/marketplace/[eventId]/page');
 const catalogue=renderToStaticMarkup(await MarketplacePage());
 const detail=renderToStaticMarkup(await MarketplaceEventPage({params:Promise.resolve({eventId:'original-event'})}));
 for(const html of [catalogue,detail]){
  expect(html).toContain('Original Event');expect(html).toContain('Original Organizer');expect(html).toContain('Original Venue');expect(html).toContain('dateTime="2026-10-27"');expect(html).toContain('lang="en-KE"');
 }
 expect(catalogue).toContain('href="/marketplace/original-event"');expect(catalogue).toContain(formatKes(125.5,locale));
 expect(detail).toContain('Original event description.');
 if(locale!=='en')expect(detail).not.toContain('Your event organizer');
});
