import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'public', 'doc-templates');
const docgenPath = path.join(process.cwd(), 'lib', 'server', 'docgen.ts');
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
const REFERENCE_GENERATOR_RATIONALE = {
  '22-ticket-event-vip.html': 'Legacy VIP ticket visual reference. Issued tickets use 55-event-ticket-collector.html so all tiers share one collector-safe QR layout.',
};

const docgenSource = await readFile(docgenPath, 'utf8');

function quotedStrings(src) {
  return [...src.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function blockForKey(source, key) {
  const match = new RegExp(`\\n\\s*${key}:\\s*\\{([\\s\\S]*?)\\n\\s{2}\\},`, 'm').exec(source);
  return match?.[1] || '';
}

function activeDocTypes(source) {
  const match = /export const ACTIVE_DOC_TYPES = \[([\s\S]*?)\] as const;/.exec(source);
  return match ? quotedStrings(match[1]) : [];
}

function recordArray(source, recordName, key) {
  const start = source.indexOf(recordName);
  if (start === -1) return [];
  const match = new RegExp(`\\n\\s*${key}:\\s*\\[([\\s\\S]*?)\\],`, 'm').exec(source.slice(start));
  return match ? quotedStrings(match[1]) : [];
}

function recordCounts(source, recordName) {
  const start = source.indexOf(recordName);
  if (start === -1) return new Map();
  const end = source.indexOf('};', start);
  const body = end === -1 ? source.slice(start) : source.slice(start, end);
  return new Map([...body.matchAll(/\n\s*([a-z]\w*):\s*(\d+),/gi)].map((m) => [m[1], Number(m[2])]));
}

function setValues(source, setName) {
  const match = new RegExp(`${setName}\\s*=\\s*new Set<DocType>\\(\\[([\\s\\S]*?)\\]\\);`, 'm').exec(source);
  return new Set(match ? quotedStrings(match[1]) : []);
}

const templates = (await readdir(root))
  .filter((name) => /^(?:0[1-9]|[1-5]\d)-.+\.html$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const rows = [];
const htmlByFile = new Map();
for (const file of templates) {
  const html = await readFile(path.join(root, file), 'utf8');
  htmlByFile.set(file, html);
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
  const isReferenceGenerator = !!REFERENCE_GENERATOR_RATIONALE[file];
  const kind = isStaticMaster ? 'static-master' : isReferenceGenerator ? 'reference-generator' : 'generator';
  if (isStaticMaster && fields.length) issues.push('field-on-static-master');
  if (!isStaticMaster && !rootMatch) issues.push('generator-without-doc-root');
  if (fields.some((field) => !/^[a-z][\w:-]*:[a-z][\w-]*$/i.test(field))) issues.push('invalid-field-host');
  rows.push({ file, kind, page: rootMatch?.[1] || '-', fields: fields.length, assets: assetRefs.length, rationale: STATIC_MASTER_RATIONALE[file] || REFERENCE_GENERATOR_RATIONALE[file] || '-', missingAssets, issues });
}

const registryIssues = [];
const activeTypes = activeDocTypes(docgenSource);
const registryTemplates = new Map();
const registeredTemplateFiles = new Set();
if (!activeTypes.length) registryIssues.push('active-doc-types-not-found');
for (const type of activeTypes) {
  const block = blockForKey(docgenSource, type);
  if (!block) {
    registryIssues.push(`missing-doc-type-registry:${type}`);
    continue;
  }
  const template = /template:\s*"([^"]+)"/.exec(block)?.[1];
  const pagesMatch = /pages:\s*\[([\s\S]*?)\]/.exec(block);
  const files = pagesMatch ? quotedStrings(pagesMatch[1]) : template ? [template] : [];
  if (!files.length) registryIssues.push(`doc-type-without-template:${type}`);
  registryTemplates.set(type, files);
  for (const file of files) {
    registeredTemplateFiles.add(file);
    const html = htmlByFile.get(file);
    if (!html) registryIssues.push(`missing-registered-template:${type}:${file}`);
    if (STATIC_MASTER_RATIONALE[file]) registryIssues.push(`static-master-registered:${type}:${file}`);
    if (html && !/\bdata-doc-page="/.test(html)) registryIssues.push(`registered-template-without-doc-root:${type}:${file}`);
    if (html && !html.includes(LOGO)) registryIssues.push(`registered-template-missing-logo:${type}:${file}`);
  }
}

const bandBlock = /export const BAND_TEMPLATES:[\s\S]*?= \{([\s\S]*?)\};/.exec(docgenSource)?.[1] || '';
for (const file of quotedStrings(bandBlock)) {
  registeredTemplateFiles.add(file);
  const html = htmlByFile.get(file);
  if (!html) registryIssues.push(`missing-band-template:${file}`);
  if (html && !/\bdata-doc-page="band"/.test(html)) registryIssues.push(`band-template-without-band-root:${file}`);
  if (html && !html.includes(LOGO)) registryIssues.push(`band-template-missing-logo:${file}`);
}

for (const row of rows) {
  if (row.kind === 'generator' && !registeredTemplateFiles.has(row.file)) {
    registryIssues.push(`unregistered-generator-template:${row.file}`);
  }
}

const heroCounts = recordCounts(docgenSource, 'PROMO_HERO_SLOT_COUNTS');
const partnerTypes = setValues(docgenSource, 'PROMO_PARTNER_SLOT_TYPES');
for (const type of activeTypes) {
  const block = blockForKey(docgenSource, type);
  if (!/\bpromo:/.test(block)) continue;
  const files = registryTemplates.get(type) || [];
  const html = files[0] ? htmlByFile.get(files[0]) || '' : '';
  const stampedFields = new Set([...html.matchAll(/\bdata-field="([^"]+)"/gi)].map((m) => m[1]));
  const promoFields = new Set(recordArray(docgenSource, 'PROMO_FIELDS', type));
  const missingFields = [...promoFields].filter((field) => !stampedFields.has(field));
  const extraFields = [...stampedFields].filter((field) => !promoFields.has(field));
  if (missingFields.length) registryIssues.push(`promo-fields-not-in-template:${type}:${missingFields.join(',')}`);
  if (extraFields.length) registryIssues.push(`template-fields-not-whitelisted:${type}:${extraFields.join(',')}`);

  const heroSlots = [...html.matchAll(/\bdata-hero-slot="(\d+)"/gi)].map((m) => Number(m[1])).sort((a, b) => a - b);
  const expectedHeroSlots = Array.from({ length: heroCounts.get(type) || 0 }, (_v, i) => i);
  if (heroSlots.join(',') !== expectedHeroSlots.join(',')) {
    registryIssues.push(`promo-hero-slot-count-mismatch:${type}:template=${heroSlots.join(',') || '-'}:registry=${expectedHeroSlots.join(',') || '-'}`);
  }

  const hasPartnerStrip = /\bdata-partner-strip="1"/.test(html);
  if (partnerTypes.has(type) !== hasPartnerStrip) {
    registryIssues.push(`promo-partner-strip-rule-mismatch:${type}`);
  }
}

const withIssues = rows.filter((row) => row.issues.length);
const dynamic = rows.filter((row) => row.kind === 'generator').length;
const staticMasters = rows.filter((row) => row.kind === 'static-master').length;
const referenceGenerators = rows.filter((row) => row.kind === 'reference-generator').length;
const missingAssetCount = rows.reduce((count, row) => count + row.missingAssets.length, 0);
console.log(`templates=${rows.length} generator=${dynamic} reference-generators=${referenceGenerators} static-masters=${staticMasters} active-types=${activeTypes.length} registry-issues=${registryIssues.length} issues=${withIssues.length} missing-assets=${missingAssetCount}`);
for (const row of rows) {
  const assetState = row.missingAssets.length ? `missing=${row.missingAssets.join(',')}` : 'assets-ok';
  const rationale = row.kind !== 'generator' ? `rationale=${row.rationale}` : '';
  console.log(`${row.file}\tkind=${row.kind}\tpage=${row.page}\tfields=${row.fields}\tassets=${row.assets}\t${rationale}\t${assetState}\t${row.issues.join(',') || 'ok'}`);
}
for (const issue of registryIssues) console.log(`registry\t${issue}`);
if (templates.length !== 56) process.exitCode = 1;
if (withIssues.length) process.exitCode = 2;
if (missingAssetCount) process.exitCode = 3;
if (registryIssues.length) process.exitCode = 4;
