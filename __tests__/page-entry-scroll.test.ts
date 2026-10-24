import vm from 'node:vm';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {PAGE_ENTRY_BOOTSTRAP,installPageEntryScroll} from '@/lib/client/page-entry-scroll';

function browser(hash=''){
 const events:Record<string,()=>void>={},documentEvents:Record<string,()=>void>={};
 const frames=new Map<number,FrameRequestCallback>();let frame=0;
 type ObserverStub={callback:()=>void;observe:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>};
 const mutations:ObserverStub[]=[],resizes:ObserverStub[]=[];
 const observer=(instances:ObserverStub[])=>class {
  observe=vi.fn();disconnect=vi.fn();
  constructor(public callback:()=>void){instances.push(this)}
 };
 const target={location:{hash},history:{scrollRestoration:'auto'},scrollTo:vi.fn(),
  requestAnimationFrame:(callback:FrameRequestCallback)=>{frames.set(++frame,callback);return frame},
  cancelAnimationFrame:(id:number)=>frames.delete(id),
  addEventListener:(name:string,callback:()=>void)=>{events[name]=callback},
  MutationObserver:observer(mutations),ResizeObserver:observer(resizes),
  document:{addEventListener:(name:string,callback:()=>void)=>{documentEvents[name]=callback},getElementById:vi.fn()},
 };
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(0))};
 return {target:target as unknown as Window,events,documentEvents,flush,scrollTo:target.scrollTo,mutations,resizes};
}
afterEach(()=>vi.restoreAllMocks());
describe('page entry scroll',()=>{
 it('opts out of saved browser positions before resetting a normal or reloaded document',()=>{
  const {target,scrollTo,flush}=browser();
  vm.runInNewContext(PAGE_ENTRY_BOOTSTRAP,{window:target});
  expect(target.history.scrollRestoration).toBe('manual');
  expect(scrollTo).toHaveBeenCalledWith({top:0,left:0,behavior:'instant'});
  scrollTo.mockClear();flush();
  expect(scrollTo).not.toHaveBeenCalled();
 });
 it.each(['pageshow','DOMContentLoaded'])('preserves native text-fragment positioning after %s when Chrome hides the directive',event=>{
  const {target,events,documentEvents,scrollTo,flush}=browser();
  vm.runInNewContext(PAGE_ENTRY_BOOTSTRAP,{window:target});
  // Chrome exposes an empty location.hash for a pure #:~:text= directive.
  // Its native text positioning happens after the early head script.
  scrollTo.mockClear();
  (event==='DOMContentLoaded'?documentEvents:events)[event]();flush();
  expect(scrollTo).not.toHaveBeenCalled();
 });
 it('resets later document history navigation while allowing restoration to finish',()=>{
  const {target,events,scrollTo,flush}=browser();
  installPageEntryScroll(target);
  scrollTo.mockClear();events.popstate();
  expect(scrollTo).toHaveBeenCalledOnce();
  scrollTo.mockClear();flush();
  expect(scrollTo).toHaveBeenCalledWith({top:0,left:0,behavior:'instant'});
 });
 it('does not erase native text positioning when hydration restores anchors only',()=>{
  const {target,scrollTo,flush}=browser();
  const reset=installPageEntryScroll(target);scrollTo.mockClear();
  reset(false);flush();
  expect(scrollTo).not.toHaveBeenCalled();
 });
 it.each(['#main-content','#services', '#:~:text=school'])('preserves the explicit destination %s on entry and browser history',hash=>{
  const {target,events,documentEvents,scrollTo,flush}=browser(hash);
  installPageEntryScroll(target)();
  events.pageshow();events.popstate();documentEvents.DOMContentLoaded();flush();
  expect(scrollTo).not.toHaveBeenCalled();
 });
 it('reuses one listener set across client routes and preserves a hash added before the next frame',()=>{
  const {target,scrollTo,flush}=browser();
  const reset=installPageEntryScroll(target);
  expect(installPageEntryScroll(target)).toBe(reset);
  reset();target.location.hash='#main-content';scrollTo.mockClear();flush();
  expect(scrollTo).not.toHaveBeenCalled();
 });
 it('repositions an explicit hash after reload even with manual history restoration',()=>{
  const {target,events,scrollTo,flush}=browser('#school%20events');
  const scrollIntoView=vi.fn();
  vi.mocked(target.document.getElementById).mockReturnValue({scrollIntoView,getClientRects:()=>[{}]} as unknown as HTMLElement);
  installPageEntryScroll(target);events.pageshow();flush();
  expect(target.document.getElementById).toHaveBeenCalledWith('school events');
  expect(scrollIntoView).toHaveBeenCalledWith({block:'start',behavior:'instant'});
  expect(scrollTo).not.toHaveBeenCalled();
 });
 it('waits for a hidden streamed anchor to have layout after document load',()=>{
  const {target,events,documentEvents,flush,resizes}=browser('#experiences');
  let visible=false;
  const scrollIntoView=vi.fn();
  const anchor={scrollIntoView,getClientRects:()=>visible?[{}]:[]};
  vi.mocked(target.document.getElementById).mockReturnValue(anchor as unknown as HTMLElement);
  installPageEntryScroll(target);documentEvents.DOMContentLoaded();events.pageshow();flush();
  expect(scrollIntoView).not.toHaveBeenCalled();
  visible=true;resizes.at(-1)!.callback();
  expect(scrollIntoView).toHaveBeenCalledOnce();
  expect(scrollIntoView).toHaveBeenCalledWith({block:'start',behavior:'instant'});
  expect(resizes.at(-1)!.disconnect.mock.invocationCallOrder[0]).toBeLessThan(scrollIntoView.mock.invocationCallOrder[0]);
 });
 it('discovers an anchor added after the document events and releases observers before scrolling',()=>{
  const {target,events,flush,mutations,resizes}=browser('#experiences');
  installPageEntryScroll(target);events.pageshow();flush();
  const scrollIntoView=vi.fn();let visible=false;
  vi.mocked(target.document.getElementById).mockReturnValue({scrollIntoView,getClientRects:()=>visible?[{}]:[]} as unknown as HTMLElement);
  expect(mutations.length).toBeGreaterThan(0);
  mutations.at(-1)!.callback();
  expect(mutations.at(-1)!.disconnect).toHaveBeenCalled();
  expect(scrollIntoView).not.toHaveBeenCalled();
  visible=true;resizes.at(-1)!.callback();
  expect(scrollIntoView).toHaveBeenCalledOnce();
 });
 it.each(['hashchange','pagehide'])('releases a hidden-anchor observer on %s',event=>{
  const {target,events,resizes}=browser('#experiences');
  vi.mocked(target.document.getElementById).mockReturnValue({getClientRects:()=>[]} as unknown as HTMLElement);
  installPageEntryScroll(target);
  const pending=resizes.at(-1)!;
  if(event==='hashchange')target.location.hash='';
  expect(events[event]).toBeTypeOf('function');
  events[event]();
  expect(pending.disconnect).toHaveBeenCalled();
 });
});
