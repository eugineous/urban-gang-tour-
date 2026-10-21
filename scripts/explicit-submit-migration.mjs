/** Mechanical explicit-type migration for already-reviewed native submit controls.
 * Emits an apply_patch patch. Does not write source files or change form handlers.
 */
import ts from 'typescript';
import fs from 'node:fs';
const files=fs.readdirSync('app',{recursive:true}).filter(f=>f.endsWith('.tsx')).map(f=>'app/'+f).concat(fs.readdirSync('ui/components',{recursive:true}).filter(f=>f.endsWith('.tsx')).map(f=>'ui/components/'+f));
const patches=[];
for(const file of files){
 const original=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,original,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),offsets=[];
 function visit(node){
  if(ts.isJsxOpeningElement(node)&&node.tagName.getText(source)==='button'&&!node.attributes.properties.some(p=>p.name?.getText(source)==='type')){
   let ancestor=node.parent;
   while(ancestor){if(ts.isJsxElement(ancestor)&&ancestor.openingElement.tagName.getText(source)==='form'){
    if(node.attributes.properties.some(p=>p.name?.getText(source)==='onClick'))throw Error('Unreviewed click control inside form');
    offsets.push(node.getStart(source)+7);break;
   }ancestor=ancestor.parent;}
  }
  ts.forEachChild(node,visit);
 }
 visit(source);let changed=original;
 for(const offset of offsets.sort((a,b)=>b-a))changed=changed.slice(0,offset)+' type="submit"'+changed.slice(offset);
 if(changed!==original){const before=original.split('\n'),after=changed.split('\n');patches.push(`*** Update File: ${process.cwd()}/${file}\n`+before.flatMap((line,i)=>line!==after[i]?['@@','-'+line,'+'+after[i]]:[]).join('\n'));}
}
const file='app/admin/control-room.css',original=fs.readFileSync(file,'utf8');
const changed=original.replaceAll('font:600 14px/1.4 inherit','font-family:inherit;font-size:14px;font-weight:600;line-height:1.4').replaceAll('font:600 14px/1.5 inherit','font-family:inherit;font-size:14px;font-weight:600;line-height:1.5').replaceAll('font:400 16px/1.5 inherit','font-family:inherit;font-size:16px;font-weight:400;line-height:1.5').replaceAll('grid-template-columns:minmax(0,2fr) repeat(auto-fit,minmax(140px,1fr))','grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))');
if(changed!==original){const before=original.split('\n'),after=changed.split('\n');patches.push(`*** Update File: ${process.cwd()}/${file}\n`+before.flatMap((line,i)=>line!==after[i]?['@@','-'+line,'+'+after[i]]:[]).join('\n'));}
console.log('*** Begin Patch\n'+patches.join('\n')+'\n*** End Patch');
