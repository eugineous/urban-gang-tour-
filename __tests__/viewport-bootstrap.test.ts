import vm from 'node:vm';import {expect,it} from 'vitest';import {VIEWPORT_BOOTSTRAP} from '../lib/client/viewport-bootstrap';
it('tracks available height and rotation but preserves the page during typing or pinch zoom',()=>{
 const values:Record<string,string>={};const callbacks:Record<string,Function>={};let typing=false;
 const root={style:{zoom:'',setProperty:(key:string,value:string)=>values[key]=value},dataset:{} as Record<string,string>};
 const context={document:{documentElement:root,activeElement:{matches:()=>typing}},navigator:{maxTouchPoints:1},screen:{width:390},innerWidth:980,innerHeight:1800,matchMedia:()=>({matches:true}),requestAnimationFrame:(fn:Function)=>fn(),addEventListener:(name:string,fn:Function)=>callbacks[name]=fn,window:{visualViewport:{height:1700,scale:1,addEventListener:(name:string,fn:Function)=>callbacks['visual-'+name]=fn}}};
 vm.runInNewContext(VIEWPORT_BOOTSTRAP,context);expect(Number(values['--ugt-phone-zoom'])).toBeCloseTo(980/390);expect(values['--ugt-screen-height']).toBe('1700px');
 context.window.visualViewport.height=1200;typing=true;callbacks['visual-resize']();expect(values['--ugt-screen-height']).toBe('1700px');
 typing=false;context.window.visualViewport.scale=2;callbacks['visual-resize']();expect(values['--ugt-screen-height']).toBe('1700px');
 context.window.visualViewport.scale=1;context.innerWidth=390;callbacks.resize();expect(values['--ugt-screen-height']).toBe('1200px');expect(root.style.zoom).toBe('');
});

it('does not zoom a landscape phone whose screen dimensions remain portrait',()=>{
 const values:Record<string,string>={};const root={style:{zoom:'',setProperty:(k:string,v:string)=>values[k]=v},dataset:{}};
 const context={document:{documentElement:root,activeElement:null},navigator:{maxTouchPoints:1},screen:{width:390,height:844,orientation:{type:'landscape-primary'}},innerWidth:844,innerHeight:390,matchMedia:()=>({matches:true}),requestAnimationFrame:(fn:Function)=>fn(),addEventListener:()=>{},window:{visualViewport:{height:390,scale:1,addEventListener:()=>{}}}};
 vm.runInNewContext(VIEWPORT_BOOTSTRAP,context);expect(values['--ugt-phone-zoom']).toBe('1');expect(root.style.zoom).toBe('');
});
