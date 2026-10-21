import {afterEach,beforeEach,expect,it,vi} from 'vitest';
beforeEach(()=>vi.resetModules());
afterEach(()=>vi.unstubAllGlobals());
it('shares one automatic popup cap for campaigns and host invitations',async()=>{
 const data=new Map<string,string>();vi.stubGlobal('sessionStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)});
 const state=await import('@/lib/client/automatic-popup');expect(state.automaticPopupWasShown()).toBe(false);
 state.markAutomaticPopupShown();expect(state.automaticPopupWasShown()).toBe(true);expect(data.get('ugt-campaign-popup-session')).toBe('shown');
});
it('honours the session cap saved on an earlier route',async()=>{
 vi.stubGlobal('sessionStorage',{getItem:()=> 'shown'});const state=await import('@/lib/client/automatic-popup');expect(state.automaticPopupWasShown()).toBe(true);
});
it('still caps interruptions when session storage is blocked',async()=>{
 vi.stubGlobal('sessionStorage',{getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}});
 const state=await import('@/lib/client/automatic-popup');expect(state.automaticPopupWasShown()).toBe(false);state.markAutomaticPopupShown();expect(state.automaticPopupWasShown()).toBe(true);
});
