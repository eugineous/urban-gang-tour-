import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildVendorApplication, buildSponsorshipPack } from '../lib/vendor/documents.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logo = await readFile(resolve(root, 'public/design-assets/logo.png'));
const logoData = `data:image/png;base64,${logo.toString('base64')}`;
const outputDir = resolve(root, 'public/downloads');
const check = process.argv.includes('--check');
if (!check) await mkdir(outputDir, { recursive: true });
for (const [name, builder] of [
  ['vendor-application.pdf', buildVendorApplication],
  ['sponsorship-partnership-pack.pdf', buildSponsorshipPack],
]) {
  const doc = builder({ logoData });
  if (doc.getNumberOfPages() !== 2) throw new Error(`${name}: expected exactly two A4 pages`);
  const bytes = Buffer.from(doc.output('arraybuffer'));
  const path = resolve(outputDir, name);
  if (check) {
    if (!bytes.equals(await readFile(path))) throw new Error(`${name}: generated document differs; regenerate and review it`);
  } else await writeFile(path, bytes);
  console.log(`${check ? 'Verified' : 'Generated'} ${name}: 2 pages, ${bytes.length} bytes, SHA-256 ${createHash('sha256').update(bytes).digest('hex')}`);
}
