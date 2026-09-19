import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'public', 'doc-templates');
const LOGO = 'URBAN GANG TOUR OFFICIAL LOGO.png';
// Static masters are deliberately retained only when their job is a fixed
// brand/print direction. Personal, event and legal/operational artefacts must
// have a data-doc-page and pass through the generator instead.
const STATIC_MASTER_RATIONALE = {
  '01-business-card-eugine-ticket.html': 'Founder-specific identity master.',
  '03-business-card-team-backstage.html': 'Company service-sales card master.',
  '13-wristband-event-campus-rave.html': 'Archived visual reference; not exposed in the staff library.',
  '14-outdoor-teardrops-telescopic-handflag-to-scale.html': 'Large-format flag production master.',
  '15-event-flag-3x5ft.html': 'Reusable 3x5ft flag production master.',
  '20-ig-highlight-covers.html': 'Fixed social highlight icon set.',
  '25-brochure-one-pager.html': 'Fixed corporate capabilities one-pager.',
  '28-sticker-pack-a5.html': 'Fixed A5 merchandise print master.',
  '29-bandana-55x55cm.html': 'Fixed 55x55cm merchandise print master.',
  '51-artist-crew-rate-card.html': 'Commercial discussion guide; rates stay agreement-controlled.',
};

const templates = (await readdir(root))
  .filter((name) => /^(?:0[1-9]|[1-5]\d)-.+\.html$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const rows = [];
for (const file of templates) {
  const html = await readFile(path.join(root, file), 'utf8');
  const fields = [...html.matchAll(/<([a-z][\w:-]*)\b[^>]*\bdata-field="([^"]+)"[^>]*>/gi)]
    .map((m) => `${m[1].toLowerCase()}:${m[2]}`);
  const rootMatch = /data-doc-page="([^"]+)"/i.exec(html);
  const assetRefs = [
    ...[...html.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/\burl\(\s*["']?([^"'\)\s]+)["']?\s*\)/gi)].map((m) => m[1]),
  ].filter((ref) => ref.startsWith('../assets/') || ref.startsWith('../uploads/'));
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
  const isStaticMaster = !!STATIC_MASTER_RATIONALE[file];
  const kind = isStaticMaster ? 'static-master' : 'generator';
  if (isStaticMaster && fields.length) issues.push('field-on-static-master');
  if (!isStaticMaster && !rootMatch) issues.push('generator-without-doc-root');
  if (fields.some((field) => !/^[a-z][\w:-]*:[a-z][\w-]*$/i.test(field))) issues.push('invalid-field-host');
  rows.push({ file, kind, page: rootMatch?.[1] || '-', fields: fields.length, assets: assetRefs.length, rationale: STATIC_MASTER_RATIONALE[file] || '-', missingAssets, issues });
}

const withIssues = rows.filter((row) => row.issues.length);
const dynamic = rows.filter((row) => row.kind === 'generator').length;
const staticMasters = rows.length - dynamic;
const missingAssetCount = rows.reduce((count, row) => count + row.missingAssets.length, 0);
console.log(`templates=${rows.length} generator=${dynamic} static-masters=${staticMasters} issues=${withIssues.length} missing-assets=${missingAssetCount}`);
for (const row of rows) {
  const assetState = row.missingAssets.length ? `missing=${row.missingAssets.join(',')}` : 'assets-ok';
  const rationale = row.kind === 'static-master' ? `rationale=${row.rationale}` : '';
  console.log(`${row.file}\tkind=${row.kind}\tpage=${row.page}\tfields=${row.fields}\tassets=${row.assets}\t${rationale}\t${assetState}\t${row.issues.join(',') || 'ok'}`);
}
if (templates.length !== 56) process.exitCode = 1;
if (withIssues.length) process.exitCode = 2;
if (missingAssetCount) process.exitCode = 3;
