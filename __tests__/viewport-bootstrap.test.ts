import vm from 'node:vm';
import {expect,it} from 'vitest';
import {VIEWPORT_BOOTSTRAP} from '../lib/client/viewport-bootstrap';

it('holds the original phone zoom ratio when Android changes innerWidth after layout',()=>{
 const values:Record<string,string>={},callbacks:Record<string,()=>void>={};let typing=false;
 const root={style:{zoom:'',setProperty:(key:string,value:string)=>values[key]=value},dataset:{} as Record<string,string>};
 const context={document:{documentElement:root,activeElement:{matches:()=>typing}},navigator:{maxTouchPoints:1},screen:{width:390,height:844,orientation:{type:'portrait-primary'}},innerWidth:980,innerHeight:1800,matchMedia:()=>({matches:true}),requestAnimationFrame:(fn:()=>void)=>fn(),addEventListener:(name:string,fn:()=>void)=>callbacks[name]=fn,window:{visualViewport:{height:1700,scale:1,addEventListener:(name:string,fn:()=>void)=>callbacks['visual-'+name]=fn}}};
 vm.runInNewContext(VIEWPORT_BOOTSTRAP,context);
 expect(Number(root.style.zoom)).toBeCloseTo(980/390);
 expect(values['--ugt-phone-zoom']).toBe(String(980/390));
 expect(root.dataset.phoneViewport).toBe('wide');
 expect(values['--ugt-screen-height']).toBe('1700px');
 // The browser may now report a larger layout viewport as a side effect of zoom.
 context.innerWidth=1400;callbacks.resize();
 expect(Number(root.style.zoom)).toBeCloseTo(980/390);
 expect(values['--ugt-phone-zoom']).toBe(String(980/390));
 context.window.visualViewport.height=1200;typing=true;callbacks['visual-resize']();
 expect(values['--ugt-screen-height']).toBe('1700px');
 typing=false;context.window.visualViewport.scale=2;callbacks['visual-resize']();
 expect(values['--ugt-screen-height']).toBe('1700px');
 context.window.visualViewport.scale=1;callbacks.resize();
 expect(values['--ugt-screen-height']).toBe('1200px');
 // Rotation starts a fresh baseline, rather than retaining portrait zoom.
 context.screen.orientation.type='landscape-primary';context.innerWidth=844;
 callbacks.orientationchange();
 expect(root.style.zoom).toBe('');
 expect(values['--ugt-phone-zoom']).toBe('1');
 expect(root.dataset.phoneViewport).toBeUndefined();
});

it('does not zoom a landscape phone whose screen dimensions remain portrait',()=>{
 const values:Record<string,string>={};const root={style:{zoom:'',setProperty:(k:string,v:string)=>values[k]=v},dataset:{} as Record<string,string>};
 const context={document:{documentElement:root,activeElement:null},navigator:{maxTouchPoints:1},screen:{width:390,height:844,orientation:{type:'landscape-primary'}},innerWidth:844,innerHeight:390,matchMedia:()=>({matches:true}),requestAnimationFrame:(fn:()=>void)=>fn(),addEventListener:()=>{},window:{visualViewport:{height:390,scale:1,addEventListener:()=>{}}}};
 vm.runInNewContext(VIEWPORT_BOOTSTRAP,context);
 expect(values['--ugt-phone-zoom']).toBe('1');expect(root.style.zoom).toBe('');
});

it('keeps ordinary device-width phone layouts at native scale',()=>{
 const values:Record<string,string>={};const root={style:{zoom:'',setProperty:(k:string,v:string)=>values[k]=v},dataset:{} as Record<string,string>};
 const context={document:{documentElement:root,activeElement:null},navigator:{maxTouchPoints:1},screen:{width:390,height:844,orientation:{type:'portrait-primary'}},innerWidth:390,innerHeight:844,matchMedia:()=>({matches:true}),requestAnimationFrame:(fn:()=>void)=>fn(),addEventListener:()=>{},window:{visualViewport:{height:844,scale:1,addEventListener:()=>{}}}};
 vm.runInNewContext(VIEWPORT_BOOTSTRAP,context);
 expect(values['--ugt-phone-zoom']).toBe('1');expect(root.style.zoom).toBe('');
 expect(root.dataset.phoneViewport).toBeUndefined();
});
