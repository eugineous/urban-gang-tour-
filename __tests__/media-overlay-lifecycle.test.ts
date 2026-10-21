import {runInNewContext} from 'node:vm';
import {expect,it,vi} from 'vitest';
import {MEDIA_LIFECYCLE_BOOTSTRAP} from '@/lib/client/media-lifecycle';
function fixture(focus=false){
 const handlers=new Map<string,(event:any)=>void>();
 const playing={paused:false,ended:false,isConnected:true,pause:vi.fn(),play:vi.fn(()=>Promise.resolve()),getBoundingClientRect:()=>({top:0,bottom:300})};
 playing.pause.mockImplementation(()=>{playing.paused=true});
 const paused={...playing,paused:true,pause:vi.fn(),play:vi.fn(()=>Promise.resolve())};
 runInNewContext(MEDIA_LIFECYCLE_BOOTSTRAP,{Set,Math,innerHeight:800,document:{hidden:false,documentElement:{dataset:{}},querySelectorAll:()=>[playing,paused],addEventListener:vi.fn()},navigator:{},localStorage:{getItem:()=>String(focus)},matchMedia:()=>({matches:false}),addEventListener:(name:string,fn:(event:any)=>void)=>handlers.set(name,fn),dispatchEvent:vi.fn(),Event:class{}});
 return {playing,paused,signal:(open:boolean)=>handlers.get('ugt-overlay-change')!({detail:open})};
}
it('does not resume videos when a nested language dialog closes over the open menu',()=>{
 const {playing,paused,signal}=fixture();
 signal(true);signal(true);expect(playing.pause).toHaveBeenCalledTimes(1);
 signal(false);expect(playing.play).not.toHaveBeenCalled();
 signal(false);expect(playing.play).toHaveBeenCalledTimes(1);expect(paused.play).not.toHaveBeenCalled();
 signal(false);expect(playing.play).toHaveBeenCalledTimes(1);
});
it('does not override focus view when the final overlay closes',()=>{
 const {playing,signal}=fixture(true);signal(true);signal(false);expect(playing.play).not.toHaveBeenCalled();
});
