import {spawn} from 'node:child_process';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(),true);
// This explicit command selects the news lane; normal npm run dev is unchanged.
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,URBAN_NEWS_ENABLED:'true'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{console.error('Could not start Next.js. Run npm ci first.');process.exitCode=1});
child.on('exit',code=>{process.exitCode=code??1});
