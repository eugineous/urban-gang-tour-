import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({path:'/',consent:true,effects:[] as Array<()=>unknown>}));
vi.mock('next/navigation',()=>({usePathname:()=>state.path}));
vi.mock('react',async original=>({
 ...await original<typeof import('react')>(),
 useState:()=>[state.consent,vi.fn()],
 useRef:()=>({current:false}),
 useEffect:(effect:()=>unknown)=>state.effects.push(effect),
}));

beforeEach(()=>{vi.resetModules();state.path='/';state.consent=true;state.effects=[];vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT','ca-pub-1234567890123456');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

function browser(){
 const scripts:unknown[]=[],target={} as {adsbygoogle?:unknown[]&{pauseAdRequests?:number}};
 vi.stubGlobal('window',target);
 vi.stubGlobal('document',{getElementById:()=>scripts[0]||null,createElement:()=>({}),head:{appendChild:(script:unknown)=>scripts.push(script)}});
 return {scripts,target,runEffect:()=>state.effects.at(-1)?.()};
}

it('sets the ad-request pause state before an asynchronous provider script can load',async()=>{
 const f=browser();const {AdSenseLoader}=await import('@/app/_components/Ads');
 AdSenseLoader();f.runEffect();
 expect(f.scripts).toHaveLength(1);expect(f.target.adsbygoogle?.pauseAdRequests).toBe(0);
 state.path='/checkout';AdSenseLoader();f.runEffect();
 expect(f.target.adsbygoogle?.pauseAdRequests).toBe(1);expect(f.scripts).toHaveLength(1);
});

it.each(['/book','/orders/track','/reels','/privacy-policy','/account','/checkout'])('keeps automatic and manual ads off the sensitive route %s',async path=>{
 state.path=path;const f=browser();const {AdSenseLoader,AdSlot}=await import('@/app/_components/Ads');
 AdSenseLoader();f.runEffect();expect(f.scripts).toHaveLength(0);
 state.effects=[];expect(AdSlot({slot:'fixture-slot'})).toBeNull();f.runEffect();
 expect(f.target.adsbygoogle?.length||0).toBe(0);
});

it('does not load provider code or create a manual placement when optional consent is declined',async()=>{
 state.consent=false;const f=browser();const {AdSenseLoader,AdSlot}=await import('@/app/_components/Ads');
 AdSenseLoader();f.runEffect();expect(f.scripts).toHaveLength(0);
 expect(AdSlot({slot:'fixture-slot'})).toBeNull();
});

it('stays dormant without the owner-configured publisher',async()=>{
 vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT','');const f=browser();const {AdSenseLoader,AdSlot}=await import('@/app/_components/Ads');
 AdSenseLoader();f.runEffect();expect(f.scripts).toHaveLength(0);
 expect(AdSlot({slot:'fixture-slot'})).toBeNull();
});
