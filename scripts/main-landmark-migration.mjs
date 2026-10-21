/** Emit an apply_patch migration. Root AppShell owns the main landmark;
 * global-error owns its separate document and must keep its own main.
 */
import fs from 'node:fs';
import ts from 'typescript';
const patch=['*** Begin Patch'];
for(const f of fs.readdirSync('app',{recursive:true}).filter(f=>f.endsWith('.tsx'))){
 const file='app/'+f;if(['app/_components/AppShell.tsx','app/global-error.tsx'].includes(file))continue;
 const original=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,original,99,true,ts.ScriptKind.TSX),offsets=[];
 function visit(node){if((ts.isJsxOpeningElement(node)||ts.isJsxClosingElement(node)||ts.isJsxSelfClosingElement(node))&&node.tagName.getText(source)==='main')offsets.push([node.tagName.getStart(source),node.tagName.getEnd()]);ts.forEachChild(node,visit);}visit(source);
 if(!offsets.length)continue;let changed=original;for(const [start,end] of offsets.sort((a,b)=>b[0]-a[0]))changed=changed.slice(0,start)+'section'+changed.slice(end);
 const before=original.split('\n'),after=changed.split('\n');patch.push('*** Update File: '+process.cwd()+'/'+file);before.forEach((line,i)=>{if(line!==after[i])patch.push('@@','-'+line,'+'+after[i]);});
}
patch.push('*** End Patch');console.log(patch.join('\n'));
