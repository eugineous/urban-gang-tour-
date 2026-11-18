import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,writeFile,symlink,rm,cp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Run a real development server with no project .env files or external credentials.
// Copy source: Next's route discovery does not traverse a symlinked app directory.
const root=process.cwd(),temp=await mkdtemp(join(tmpdir(),'ugt-dev-smoke-'));
const listener=createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',URBAN_NEWS_ENABLED:'true'};
let child;let output='';
try{
 for(const path of ['app','lib','ui','components','content','data','public','node_modules','tsconfig.json','next.config.mjs','next.config.ts','next.config.js','postcss.config.mjs','postcss.config.js']){
  if(!existsSync(join(root,path)))continue;
  if(path==='node_modules'||path==='public')await symlink(join(root,path),join(temp,path));
  else await cp(join(root,path),join(temp,path),{recursive:true});
 }
 await writeFile(join(temp,'package.json'),JSON.stringify({private:true,name:'ugt-development-smoke'}));
 child=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:temp,env,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>{output=(output+chunk).slice(-12000);process.stdout.write(chunk)});child.stderr.on('data',chunk=>{output=(output+chunk).slice(-12000);process.stdout.write(chunk)});
 const base=`http://127.0.0.1:${port}`,deadline=Date.now()+120000;
 let ready=false;while(Date.now()<deadline){if(child.exitCode!==null)throw Error('Development server exited early');try{const r=await fetch(base+'/api/admin/urban-news',{signal:AbortSignal.timeout(1500)});if(r.status===401){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,350))}
 if(!ready)throw Error('Development server did not become ready');
 for(const [path,expected,text] of [['/',200,'Urban News'],['/blog',200,'Urban News'],['/editorial-policy',200,'Editorial'],['/admin',200,'Control Room'],['/api/admin/urban-news',401,'unauthorized'],['/api/site-data/posts',200,'posts']]){
  const response=await fetch(base+path,{signal:AbortSignal.timeout(180000)}),body=await response.text();
  if(response.status!==expected||!body.toLowerCase().includes(text.toLowerCase()))throw Error(`Development smoke failed: ${path} returned ${response.status}`);
  console.log(`PASS ${path}: ${response.status}`);
 }
 console.log('Development startup and credential-free routes passed. Authenticated editing and SQL behavior are covered by isolated tests.');
}catch(error){console.error(error.message);console.error(output);process.exitCode=1}
finally{if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve()},5000).unref()})}await rm(temp,{recursive:true,force:true})}
