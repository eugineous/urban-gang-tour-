import {expect,it,vi} from 'vitest';
vi.mock('@opennextjs/cloudflare',()=>({initOpenNextCloudflareForDev:vi.fn()}));
import nextConfig from '../next.config.mjs';
it.each(['/receipt/:path*','/tickets/:path*'])('protects %s responses without changing public catalogue caching',async source=>{
 const routes=await nextConfig.headers!();
 const rule=routes.find(route=>route.source===source);
 expect(rule).toBeTruthy();
 const headers=new Map(rule!.headers.map(header=>[header.key.toLowerCase(),header.value]));
 expect(headers.get('cache-control')).toBe('private, no-store');expect(headers.get('cloudflare-cdn-cache-control')).toBe('no-store');expect(headers.get('referrer-policy')).toBe('no-referrer');
 expect(routes.some(route=>route.source==='/shop/:path*'&&route.headers.some(header=>header.value==='private, no-store'))).toBe(false);
});
