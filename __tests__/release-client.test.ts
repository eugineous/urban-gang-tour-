import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {expect,it} from 'vitest';
it('replaces an old controlled runtime once while preserving browser business data', async()=>{
 const callbacks:Record<string,Function>={};const stored=new Map();let reloads=0;let registrations=0;let updates=0;
 const sw={controller:{},addEventListener:(name:string,fn:Function)=>{callbacks[name]=fn},register:async(path:string,options:any)=>{expect(path).toBe('/sw.js');expect(options.updateViaCache).toBe('none');registrations++;return{update:async()=>{updates++}}}};
 const context={window:{addEventListener:()=>{}},navigator:{serviceWorker:sw},location:{pathname:'/',reload:()=>{reloads++}},sessionStorage:{getItem:(k:string)=>stored.get(k),setItem:(k:string,v:string)=>stored.set(k,v)},document:{querySelector:()=>null,activeElement:null,addEventListener:()=>{}}};
 vm.runInNewContext(readFileSync('public/release-client.js','utf8'),context);await Promise.resolve();await Promise.resolve();
 callbacks.controllerchange();callbacks.controllerchange();expect(reloads).toBe(1);expect(registrations).toBe(1);expect(updates).toBe(1);
 context.location.pathname='/checkout';callbacks.controllerchange();expect(reloads).toBe(1);
 // Cache migration never touches localStorage carts or account data.
 expect([...stored.keys()]).toEqual(['ugt-release-reloaded']);
});
