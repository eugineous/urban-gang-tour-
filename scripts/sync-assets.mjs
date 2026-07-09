// Copies /assets -> /public/assets before dev/build so Next serves v25 media
// without physically relocating the files in git (keeps the diff small).
import { cp, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'assets');
const destDir = path.join(root, 'public');
const dest = path.join(destDir, 'assets');

async function main() {
  if (!existsSync(src)) {
    console.warn('[sync-assets] no /assets dir found, skipping');
    return;
  }
  await mkdir(destDir, { recursive: true });
  await cp(src, dest, { recursive: true });
  const s = await stat(dest);
  console.log('[sync-assets] copied /assets -> /public/assets', s.isDirectory() ? '(ok)' : '');
}

main().catch((e) => {
  console.error('[sync-assets] failed:', e);
  process.exit(1);
});
