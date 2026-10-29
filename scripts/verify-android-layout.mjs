// Review-only rendered responsive smoke test. No production calls, payments or secrets.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:4184';
await mkdir('artifacts/android-responsive',{recursive:true});
const server=spawn('npm',['run','start','--','-p','4184'],{
  stdio:['ignore','pipe','pipe'],
  env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},
});
let serverLogs='';
for (const stream of [server.stdout,server.stderr]) stream.on('data',chunk=>{
  serverLogs=(serverLogs+chunk.toString()).slice(-16000);
});
async function ready(){
  const deadline=Date.now()+90000;
  while(Date.now()<deadline){
    if(server.exitCode!==null)throw Error('Next.js server exited: '+serverLogs);
    try{const r=await fetch(origin+'/vendors',{signal:AbortSignal.timeout(5000)});
      if(r.status>=200&&r.status<500)return;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,750));
  }
  throw Error('Next.js server not ready: '+serverLogs);
}
const cases=[
  {name:'phone-320',width:320,height:740,screenWidth:320,screenHeight:740,checkStack:true},
  {name:'phone-390',width:390,height:844,screenWidth:390,screenHeight:844,checkStack:true},
  {name:'phone-430',width:430,height:932,screenWidth:430,screenHeight:932,checkStack:true},
  // Emulates a browser that requests a wide CSS viewport on a physically narrow Android.
  // Unlike normal device emulation, CSS max-device-width must NOT be relied upon.
  {name:'android-wide-viewport',width:980,height:844,screenWidth:390,screenHeight:844,checkStack:true,forceScreen:true},
  {name:'phone-landscape',width:844,height:390,screenWidth:390,screenHeight:844,landscape:true,checkStack:false},
  {name:'tablet-820',width:820,height:1180,screenWidth:820,screenHeight:1180,checkStack:false},
  {name:'desktop-1440',width:1440,height:900,screenWidth:1440,screenHeight:900,checkStack:false},
];
let failures=[];
let browser;
try {
  await ready();
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const scenario of cases){
    const context=await browser.newContext({
      viewport:{width:scenario.width,height:scenario.height},
      screen:{width:scenario.screenWidth,height:scenario.screenHeight},
      isMobile:false,
      hasTouch:scenario.screenWidth<=600,
      deviceScaleFactor:1,
      reducedMotion:'reduce',
    });
    if(scenario.forceScreen)await context.addInitScript(()=>{
      Object.defineProperty(screen,'width',{configurable:true,get:()=>390});
      Object.defineProperty(screen,'height',{configurable:true,get:()=>844});
    });
    const page=await context.newPage();
    const runtimeErrors=[];
    page.on('pageerror',error=>runtimeErrors.push(error.message));
    try{
      const response=await page.goto(origin+'/vendors',{waitUntil:'domcontentloaded',timeout:30000});
      if(!response||response.status()>=400)throw Error('GET /vendors returned '+(response?.status()||'no response'));
      await page.locator('section[aria-labelledby="vendor-title"]').waitFor({timeout:15000});
      const metrics=await page.evaluate(()=>{
        const sections=['vendor-title','vendor-preparation','sponsor-title'].map(id=>{
          const el=document.querySelector('section[aria-labelledby="'+id+'"]');
          return {id,columns:el?getComputedStyle(el).gridTemplateColumns:null,rect:el?.getBoundingClientRect().toJSON()};
        });
        const footer=document.querySelector('footer[data-site-footer]');
        const prices=document.querySelector('dl');
        return {
          innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
          rootZoom:document.documentElement.style.zoom,phoneViewport:document.documentElement.dataset.phoneViewport||'',
          sections,footerWidth:footer?.getBoundingClientRect().width,
          priceColumns:prices?getComputedStyle(prices).gridTemplateColumns:'',
          formDownloads:[...document.querySelectorAll('a[href$="vendor-application.pdf"],a[href$="sponsorship-partnership-pack.pdf"]')].length,
        };
      });
      console.log(scenario.name,JSON.stringify(metrics));
      if(metrics.scrollWidth>metrics.clientWidth+5)failures.push(scenario.name+': horizontal overflow '+(metrics.scrollWidth-metrics.clientWidth)+'px');
      if(metrics.formDownloads<2)failures.push(scenario.name+': missing PDF download links');
      if(scenario.checkStack){
        for(const item of metrics.sections){
          if(!item.columns||item.columns.trim().split(/\s+/).length!==1) failures.push(scenario.name+': '+item.id+' is not one column: '+item.columns);
        }
        if(metrics.priceColumns.trim().split(/\s+/).length!==1)failures.push(scenario.name+': pricing stays multi-column: '+metrics.priceColumns);
      }
      if(scenario.forceScreen&&metrics.phoneViewport!=='wide')failures.push(scenario.name+': wide-viewport fallback not activated');
      await page.screenshot({path:'artifacts/android-responsive/'+scenario.name+'-vendor.png',fullPage:true});
      await page.locator('.menu-toggle').click();
      const dialog=page.locator('dialog.menu-panel');
      await dialog.waitFor({state:'visible',timeout:5000});
      const dialogRect=await dialog.boundingBox();
      const view=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      if(dialogRect&&(dialogRect.x< -3 || dialogRect.x+dialogRect.width>view.width+5))failures.push(scenario.name+': navigation dialog exceeds viewport');
      await page.screenshot({path:'artifacts/android-responsive/'+scenario.name+'-menu.png'});
      if(runtimeErrors.length)failures.push(scenario.name+': browser runtime errors: '+runtimeErrors.slice(0,3).join('; '));
    }catch(error){failures.push(scenario.name+': '+String(error));}
    finally{await context.close();}
  }
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
if(failures.length){console.error('Responsive verification failures:\n'+failures.join('\n'));process.exitCode=1;}
else console.log('Responsive smoke verified all '+cases.length+' viewport cases.');
