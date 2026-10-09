import {cp,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const destination=path.resolve(process.argv[2]||'/tmp/ugt-flow-runtime');
const root=process.cwd();
if(destination===root||destination.startsWith(root+path.sep))throw Error('Put the frozen runtime outside the source checkout.');
await access('.open-next/worker.js');
await mkdir(destination+'/lib/cloudflare',{recursive:true});await mkdir(destination+'/data',{recursive:true});
for(const name of['.open-next','worker.js','wrangler.toml','lib/cloudflare/public-design.mjs','data/public-design-routes.json'])await cp(name,path.join(destination,name),{recursive:true});
// Bundle only. This command never publishes or uses a remote backend.
execFileSync(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'deploy','--dry-run','--outdir','bundle'],{cwd:destination,stdio:'inherit'});
console.log(JSON.stringify({runtime:destination,command:['node',path.resolve('scripts/serve-flow-runtime.mjs'),destination]}));
