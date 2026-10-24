import {afterEach,expect,it,vi} from 'vitest';
vi.mock('@opennextjs/cloudflare',()=>({initOpenNextCloudflareForDev:vi.fn()}));
import nextConfig from '../next.config.mjs';
import {GET as adsTxt} from '@/app/ads.txt/route';

afterEach(()=>vi.unstubAllEnvs());
async function policy(client:string){
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT',client);
 const routes=await nextConfig.headers!();
 const value=routes.find(route=>route.source==='/:path*')!.headers.find(header=>header.key==='Content-Security-Policy')!.value;
 return new Map(value.split('; ').map(directive=>{const [name,...sources]=directive.split(' ');return [name,sources]}));
}

it.each(['','pub-1234567890123456','ca-pub-1234','ca-pub-1234567890123456 https://untrusted.example'])('does not expand advertising origins for an absent or invalid publisher %s',async client=>{
 const csp=await policy(client);
 for(const sources of csp.values())expect(sources.join(' ')).not.toMatch(/googlesyndication|doubleclick|untrusted/);
 expect(csp.get('default-src')).toEqual(["'self'"]);expect(csp.get('object-src')).toEqual(["'none'"]);
});

it('permits only the core AdSense origins required for a valid configured publisher',async()=>{
 const baseline=await policy('');const enabled=await policy('ca-pub-1234567890123456');
 const additions:Record<string,string[]>={
  'script-src':['https://pagead2.googlesyndication.com'],
  'frame-src':['https://googleads.g.doubleclick.net','https://tpc.googlesyndication.com'],
  'connect-src':['https://pagead2.googlesyndication.com','https://googleads.g.doubleclick.net'],
 };
 expect([...enabled.keys()]).toEqual([...baseline.keys()]);
 for(const [directive,sources] of enabled){
  const existing=baseline.get(directive)!;
  expect(sources.filter(source=>!existing.includes(source))).toEqual(additions[directive]||[]);
  expect(existing.every(source=>sources.includes(source))).toBe(true);
 }
});

it('serves ads.txt from the configured publisher without a second hardcoded seller identity',async()=>{
 vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT','ca-pub-1234567890123456');
 const response=await adsTxt();
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
 expect(await response.text()).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
});

it.each(['','ca-pub-invalid'])('keeps ads.txt unavailable when no valid seller is configured %s',async client=>{
 vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT',client);const response=await adsTxt();
 expect(response.status).toBe(404);expect(await response.text()).toBe('ads.txt not configured');
});
