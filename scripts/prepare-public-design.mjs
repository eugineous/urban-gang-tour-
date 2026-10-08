import {cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root='public-design/out', target='.open-next/assets';
const routes=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()&&!['_next','media-library','design-assets','fonts','assets'].includes(entry.name))await walk(file);else if(entry.isFile()&&entry.name==='index.html')routes.push('/'+path.relative(root,dir).replaceAll('\\','/'));}}
await walk(root);
await mkdir(target+'/_design-pages',{recursive:true});
for(const route of routes){if(route.startsWith('/404'))continue;const relative=route==='/'?'index.html':route.slice(1)+'/index.html';const output=target+'/_design-pages/'+relative;await mkdir(path.dirname(output),{recursive:true});await cp(root+'/'+relative,output);}
for(const dir of ['media-library','design-assets','fonts'])await cp(root+'/'+dir,target+'/'+dir,{recursive:true});
await cp(root+'/_next',target+'/_design/_next',{recursive:true});
await writeFile('data/public-design-routes.json',JSON.stringify(routes.filter(r=>!r.startsWith('/404')),null,2)+'\n');
console.log(`Prepared ${routes.length-1} public design pages; existing transaction routes preserved.`);
