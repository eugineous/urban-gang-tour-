import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
export default {
 tests:'tests/**/*.e2e.ts', workers:1, retries:0, timeout:60000, assertionTimeout:12000,
 targets:[390,820,1440].map(width=>({name:`chromium-${width}`,engine:web({connect:{cdpEndpoint:()=>process.env.CDP_ENDPOINT||'http://127.0.0.1:9224'},viewport:{width,height:900}}),app:{url:process.env.BASE||'http://127.0.0.1:4184',environment:'test'}}))
} satisfies E2EConfig;
