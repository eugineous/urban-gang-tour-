/** Static control checks. Not a screenshot, browser or accessibility certification. */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const files=fs.readdirSync('app',{recursive:true}).filter(f=>f.endsWith('.tsx')).map(f=>'app/'+f).concat(fs.readdirSync('ui/components',{recursive:true}).filter(f=>f.endsWith('.tsx')).map(f=>'ui/components/'+f));
const findings=[];
for(const file of files){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(source),props=new Map(node.attributes.properties.filter(ts.isJsxAttribute).map(p=>[p.name.getText(source),p.initializer]));
   const text=name=>{const value=props.get(name);return value&&ts.isStringLiteral(value)?value.text:null;};
   const add=issue=>findings.push({file:path.resolve(file),line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,tag,issue});
   if(tag==='main'&&!['app/_components/AppShell.tsx','app/global-error.tsx'].includes(file))add('nested_main_in_app_shell');
   if(tag==='a'&&props.has('href')&&['','#','javascript:void(0)','javascript:;'].includes(text('href')))add('empty_navigation_target');
   if(tag==='button'&&!props.has('type')){
    let ancestor=node.parent;
    while(ancestor){if(ts.isJsxElement(ancestor)&&ancestor.openingElement.tagName.getText(source)==='form'){add('implicit_submit_inside_form');break;}ancestor=ancestor.parent;}
   }
   if(tag==='a'&&text('target')==='_blank'&&!/noopener|noreferrer/.test(text('rel')||''))add('new_window_missing_noopener');
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
}
console.log(JSON.stringify({scope:'static JSX controls only',files:files.length,findings},null,2));
if(process.argv.includes('--check')&&findings.length)process.exitCode=1;
