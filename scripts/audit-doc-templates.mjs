import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'public', 'doc-templates');
const LOGO = 'URBAN GANG TOUR OFFICIAL LOGO.png';

const templates = (await readdir(root))
  .filter((name) => /^(?:0[1-9]|[1-5]\d)-.+\.html$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const rows = [];
for (const file of templates) {
  const html = await readFile(path.join(root, file), 'utf8');
  const fields = [...html.matchAll(/<([a-z][\w:-]*)\b[^>]*\bdata-field="([^"]+)"[^>]*>/gi)]
    .map((m) => `${m[1].toLowerCase()}:${m[2]}`);
  const rootMatch = /data-doc-page="([^"]+)"/i.exec(html);
  const assetRefs = [...html.matchAll(/(?:src|url\()\s*=?\s*["']?([^"'\)\s]+)(?:["']|\))/gi)]
    .map((m) => m[1])
    .filter((ref) => ref.startsWith('../assets/') || ref.startsWith('../uploads/'));
  const missingAssets = [];
  for (const ref of assetRefs) {
    try {
      await access(path.resolve(root, ref));
    } catch {
      missingAssets.push(ref);
    }
  }
  const issues = [];
  if (!html.includes(LOGO)) issues.push('missing-official-logo');
  const kind = rootMatch ? 'generator' : 'static-master';
  if (!rootMatch && fields.length) issues.push('field-without-doc-root');
  if (fields.some((field) => !/^[a-z][\w:-]*:[a-z][\w-]*$/i.test(field))) issues.push('invalid-field-host');
  rows.push({ file, kind, page: rootMatch?.[1] || '-', fields: fields.length, assets: assetRefs.length, missingAssets, issues });
}

const withIssues = rows.filter((row) => row.issues.length);
const dynamic = rows.filter((row) => row.kind === 'generator').length;
const staticMasters = rows.length - dynamic;
const missingAssetCount = rows.reduce((count, row) => count + row.missingAssets.length, 0);
console.log(`templates=${rows.length} generator=${dynamic} static-masters=${staticMasters} issues=${withIssues.length} missing-assets=${missingAssetCount}`);
for (const row of rows) {
  const assetState = row.missingAssets.length ? `missing=${row.missingAssets.join(',')}` : 'assets-ok';
  console.log(`${row.file}\tkind=${row.kind}\tpage=${row.page}\tfields=${row.fields}\tassets=${row.assets}\t${assetState}\t${row.issues.join(',') || 'ok'}`);
}
if (templates.length !== 56) process.exitCode = 1;
if (withIssues.length) process.exitCode = 2;
if (missingAssetCount) process.exitCode = 3;
