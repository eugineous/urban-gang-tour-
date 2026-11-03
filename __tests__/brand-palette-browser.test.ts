import {it,expect} from 'vitest';
import {chromium} from 'playwright';
import {readFileSync,existsSync} from 'node:fs';
it.skipIf(!existsSync('/usr/bin/chromium'))('keeps primary hero actions magenta and secondary accent teal with readable white text',async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.setContent('<nav class="heroActions"><a class="heroAction" href="/events">Events</a><a class="heroAction" href="/shop">Shop</a><a class="heroAction" href="/book">Book</a></nav>');
  await page.addStyleTag({content:readFileSync('app/design.css','utf8')+readFileSync('ui/components/HomeSections.module.css','utf8')+readFileSync('app/brand-palette.css','utf8')});
  const colors=await page.locator('a').evaluateAll(nodes=>nodes.map(n=>({background:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color})));
  expect(colors[0]).toEqual({background:'rgb(173, 18, 100)',color:'rgb(255, 255, 255)'});
  expect(colors[2]).toEqual({background:'rgb(15, 107, 109)',color:'rgb(255, 255, 255)'});
 }finally{await browser.close()}
});
