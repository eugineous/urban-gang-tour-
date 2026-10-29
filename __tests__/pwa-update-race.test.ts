import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Exercise the actual update action and installed lifecycle listeners without a DOM renderer.
vi.mock('react',()=>({
 useEffect:(effect:()=>void)=>effect(),
 useState:(value:unknown)=>[value,vi.fn()],
 useSyncExternalStore:(_subscribe:unknown,snapshot:()=>unknown)=>snapshot(),
}));
vi.mock('next/navigation',()=>({usePathname:()=>'/app'}));
vi.mock('@/ui/i18n/LanguageProvider',()=>({useMessages:()=>((key:string)=>key)}));

const events=new Map<string,()=>void>();
const documentEvents=new Map<string,(event:{target:unknown})=>void>();
const registrationLookup=vi.fn();
const reload=vi.fn();
const location={pathname:'/app',reload};
class FormField {closest(){return {};}}

beforeEach(()=>{
 vi.resetModules();vi.useFakeTimers();events.clear();documentEvents.clear();
 registrationLookup.mockReset().mockResolvedValue(undefined);reload.mockReset();location.pathname='/app';
 vi.stubGlobal('location',location);
 vi.stubGlobal('navigator',{onLine:true,userAgent:'Chromium',platform:'Linux',maxTouchPoints:0,serviceWorker:{controller:{},getRegistration:registrationLookup,addEventListener:vi.fn(),removeEventListener:vi.fn()}});
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 vi.stubGlobal('addEventListener',(name:string,callback:()=>void)=>events.set(name,callback));
 vi.stubGlobal('removeEventListener',vi.fn());
 vi.stubGlobal('Element',FormField);
 vi.stubGlobal('document',{querySelector:()=>({}),addEventListener:(name:string,callback:(event:{target:unknown})=>void)=>documentEvents.set(name,callback),removeEventListener:vi.fn()});
});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});

describe('PWA update lookup races',()=>{
 it.each([
  [false,'dirty'],[false,'protected'],[false,'offline'],
  [true,'dirty'],[true,'protected'],[true,'offline'],
 ] as const)('does not reload or activate with waiting=%s when %s begins during registration lookup',async(waiting,blocked)=>{
  const app=await import('@/app/_components/InstallableApp');
  app.InstallableApp();
  events.get(waiting?'ugt-release-ready':'ugt-release-activated')!();
  let resolveLookup!:(registration:unknown)=>void;
  registrationLookup.mockReturnValue(new Promise(resolve=>{resolveLookup=resolve;}));
  const postMessage=vi.fn();
  expect(app.refreshBlocked(location.pathname)).toBe(false);
  const updating=app.updateApp();
  if(blocked==='dirty')documentEvents.get('input')!({target:new FormField()});
  if(blocked==='protected')location.pathname='/checkout';
  if(blocked==='offline'){
   Object.assign(navigator,{onLine:false});events.get('offline')!();
  }
  expect(app.refreshBlocked(location.pathname)).toBe(true);
  resolveLookup({waiting:waiting?{postMessage}:null});
  await updating;
  expect(reload).not.toHaveBeenCalled();
  expect(postMessage).not.toHaveBeenCalled();
  expect(app.useInstallableApp().updating).toBe(false);
 });

 it('still refreshes an activated release after a clean registration lookup',async()=>{
  const app=await import('@/app/_components/InstallableApp');
  app.InstallableApp();events.get('ugt-release-activated')!();
  await app.updateApp();
  expect(reload).toHaveBeenCalledOnce();
 });
});
