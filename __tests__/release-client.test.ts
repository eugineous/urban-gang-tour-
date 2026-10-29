import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {expect,it} from 'vitest';
it('announces waiting and activated releases without reloading any open page or touching browser data', async()=>{
 const callbacks:Record<string,()=>void>={};const stored=new Map();let reloads=0;let registrations=0;let updates=0;const events:string[]=[];
 const registration={waiting:{state:'installed'},addEventListener:()=>{},update:async()=>{updates++}};
 const sw={controller:{},addEventListener:(name:string,fn:()=>void)=>{callbacks[name]=fn},register:async(path:string,options:{updateViaCache:string})=>{expect(path).toBe('/sw.js');expect(options.updateViaCache).toBe('none');registrations++;return registration}};
 const context={CustomEvent,window:{addEventListener:()=>{},dispatchEvent:(event:Event)=>{events.push(event.type)}},navigator:{serviceWorker:sw},location:{pathname:'/',reload:()=>{reloads++}},sessionStorage:{getItem:(k:string)=>stored.get(k),setItem:(k:string,v:string)=>stored.set(k,v)},document:{querySelector:()=>null,activeElement:null,addEventListener:()=>{}}};
 vm.runInNewContext(readFileSync('public/release-client.js','utf8'),context);await Promise.resolve();await Promise.resolve();
 expect(events).toContain('ugt-release-ready');
 callbacks.controllerchange();callbacks.controllerchange();expect(reloads).toBe(0);expect(registrations).toBe(1);expect(updates).toBe(1);
 context.location.pathname='/checkout';callbacks.controllerchange();expect(reloads).toBe(0);
 expect(events).toContain('ugt-release-activated');
 // Cache migration never touches localStorage carts or account data.
 expect([...stored.keys()]).toEqual([]);
});

it('does not label the first installation as an available update', async () => {
 const events:string[]=[];
 const registration={waiting:{state:'installed'},addEventListener:()=>{},update:async()=>{}};
 const serviceWorker={controller:null,addEventListener:()=>{},register:async()=>registration};
 vm.runInNewContext(readFileSync('public/release-client.js','utf8'), {
  CustomEvent,window:{addEventListener:()=>{},dispatchEvent:(event:Event)=>{events.push(event.type);}},
  navigator:{serviceWorker},document:{addEventListener:()=>{}},
 });
 await Promise.resolve();await Promise.resolve();
 expect(events).toEqual([]);
});
