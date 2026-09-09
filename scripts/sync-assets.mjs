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
  // .orig.* are local pre-compression masters (gitignored) - never ship them
  // These three committed public files are already compressed. Copying their
  // source masters over them silently undid the previous performance fix.
  const optimized = new Set(['poster.png', 'video/hero-1.mp4', 'video/hero-main.mp4']);
  await cp(src, dest, { recursive: true, filter: (p) => {
    if (/\.orig\.[a-z0-9]+$/i.test(p)) return false;
    const rel = path.relative(src, p).split(path.sep).join('/');
    return !(optimized.has(rel) && existsSync(path.join(dest, rel)));
  } });
  const s = await stat(dest);
  console.log('[sync-assets] copied /assets -> /public/assets', s.isDirectory() ? '(ok)' : '');
  await import('./build-light-media.mjs');
}

main().catch((e) => {
  console.error('[sync-assets] failed:', e);
  process.exit(1);
});
