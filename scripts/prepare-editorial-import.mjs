// Converts a PRIVATELY extracted, path-validated editorial package to the admin
// import contract. Never write the output inside this public repository.
import {readFile,realpath,writeFile} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
const [sourceDir,archive,output]=process.argv.slice(2);
if(!sourceDir||!archive||!output)throw Error('usage: node scripts/prepare-editorial-import.mjs PRIVATE_EXTRACTED_DIR ORIGINAL_ZIP PRIVATE_OUTPUT_JSON');
const root=await realpath(sourceDir),repo=await realpath(new URL('..',import.meta.url));
const target=resolve(output),parent=await realpath(resolve(target,'..'));
if(parent===repo||parent.startsWith(repo+sep))throw Error('unpublished_output_must_be_outside_public_repository');
async function source(path){
  const file=await realpath(resolve(root,path));
  if(relative(root,file).startsWith('..')||!file.startsWith(root+sep))throw Error('unsafe_source_path');
  const bytes=await readFile(file);if(bytes.byteLength>100000)throw Error('source_too_large');return bytes.toString('utf8');
}
const manifest=JSON.parse(await source('full_schedule_manifest.json'));
if(!Array.isArray(manifest)||manifest.length!==73)throw Error('expected_73_slots');
const source_sha256=createHash('sha256').update(await readFile(archive)).digest('hex');
const items=[];let drafts=0;
for(const row of manifest){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)||!/^2026-\d{2}-\d{2}$/.test(row.date))throw Error('invalid_manifest_path');
  const kind=row.publication_status==='ready_for_fact_check_not_live'?'article':'assignment';
  if(kind==='article')drafts++;
  const folder=kind==='article'?'batch_01_full_articles':'remaining_63_editorial_briefs';
  items.push({slug:row.slug,date:row.date,scheduled_at:row.scheduled_at,title:row.title,section:row.category||row.section||'Analysis',description:row.description||row.angle||'',author:row.author||'Urban News Editorial Desk',kind,
    markdown:await source(`${folder}/${row.date}-${row.slug}.md`),image_prompt:await source(row.image_prompt_file),metadata:row});
}
if(drafts!==10)throw Error('expected_10_drafts_63_assignments');
await writeFile(target,JSON.stringify({version:1,source_sha256,items}),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({file:target,slots:items.length,drafts,assignments:items.length-drafts,source_sha256,private:true}));
