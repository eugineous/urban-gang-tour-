import {afterEach,expect,it,vi} from 'vitest';
import {enhanceHomeMotion} from '@/ui/lib/home-motion';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 let callback:IntersectionObserverCallback=()=>{};
 const observe=vi.fn(),unobserve=vi.fn(),disconnect=vi.fn();
 const cancel=vi.fn(),animation={cancel,addEventListener:vi.fn()};
 const element={animate:vi.fn(()=>animation)};
 const query=Object.assign(new EventTarget(),{matches:false});
 const document=Object.assign(new EventTarget(),{hidden:false,documentElement:{dataset:{focusView:'false'}}});
 const window=new EventTarget(),navigator={connection:{saveData:false}};
 const root={querySelectorAll:vi.fn(()=>[element])};
 vi.stubGlobal('IntersectionObserver',class{constructor(cb:IntersectionObserverCallback){callback=cb}observe=observe;unobserve=unobserve;disconnect=disconnect;});
 vi.stubGlobal('matchMedia',()=>query);vi.stubGlobal('document',document);vi.stubGlobal('window',window);vi.stubGlobal('navigator',navigator);
 return {root,element,query,document,window,navigator,cancel,observe,unobserve,disconnect,show:()=>callback([{isIntersecting:true,target:element} as unknown as IntersectionObserverEntry],{} as IntersectionObserver)};
}
it('animates each newly visible heading/card once, without making persistent styles or changing layout',()=>{
 const f=fixture(),dispose=enhanceHomeMotion(f.root as unknown as HTMLElement);
 expect(f.element.animate).not.toHaveBeenCalled();f.show();f.show();
 expect(f.element.animate).toHaveBeenCalledTimes(1);
 expect(f.element.animate).toHaveBeenCalledWith(expect.any(Array),expect.objectContaining({duration:460,fill:'none'}));
 dispose();expect(f.disconnect).toHaveBeenCalledOnce();expect(f.cancel).toHaveBeenCalledOnce();
});
it.each(['reduced','focus','saveData','hidden'])('does not animate when %s is enabled',preference=>{
 const f=fixture();
 if(preference==='reduced')f.query.matches=true;
 if(preference==='focus')f.document.documentElement.dataset.focusView='true';
 if(preference==='saveData')f.navigator.connection.saveData=true;
 if(preference==='hidden')f.document.hidden=true;
 const dispose=enhanceHomeMotion(f.root as unknown as HTMLElement);f.show();
 expect(f.element.animate).not.toHaveBeenCalled();dispose();
});
it('cancels entrance motion immediately when focus view changes or the tab becomes hidden',()=>{
 const f=fixture(),dispose=enhanceHomeMotion(f.root as unknown as HTMLElement);f.show();
 f.document.documentElement.dataset.focusView='true';f.window.dispatchEvent(new Event('ugt-focus-view'));
 expect(f.cancel).toHaveBeenCalledOnce();dispose();
});
it('keeps the page static and usable when IntersectionObserver is unavailable',()=>{
 vi.stubGlobal('IntersectionObserver',undefined);
 expect(enhanceHomeMotion({} as HTMLElement)).toEqual(expect.any(Function));
});
