// Build small, versioned files so image performance does not depend on the
// Cloudflare image-resizing service. Originals stay available for downloads.
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const run = promisify(execFile);
const root = path.resolve('public/assets');
const output = path.join(root, 'light-v1');
const widths = [480, 960, 1440];
let count = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'light-v1' || entry.name === 'video-masters') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walk(file); continue; }
    if (!/\.(png|jpe?g|webp|avif)$/i.test(file)) continue;
    const target = path.join(output, path.relative(root, file));
    await mkdir(path.dirname(target), { recursive: true });
    const sourceTime = (await stat(file)).mtimeMs;
    for (const width of widths) {
      const dest = `${target}.${width}.webp`;
      if (await stat(dest).then(s => s.mtimeMs >= sourceTime).catch(() => false)) continue;
      await sharp(file).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 72 }).toFile(dest);
    }
    count++;
  }
}
await walk(root);
await mkdir(path.join(output, 'video'), { recursive: true });
for (const name of ['hero-main', 'hero-1']) {
  const input = path.join(root, 'video', `${name}.mp4`);
  const dest = path.join(output, 'video', `${name}.mp4`);
  const sourceTime = (await stat(input)).mtimeMs;
  if (await stat(dest).then(s => s.mtimeMs >= sourceTime).catch(() => false)) continue;
  // Decorative, muted background: a short 480p loop avoids downloading an
  // entire film before a visitor can use the page. H.264 works on Safari too.
  await run(ffmpeg.path, ['-y', '-i', input, '-t', '12', '-vf', 'scale=854:-2,fps=24',
    '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '32',
    '-preset', 'fast', '-an', '-movflags', '+faststart', dest]);
  console.log(`${name}: ${(await stat(dest)).size} bytes`);
}
console.log(`Built responsive WebP variants for ${count} images.`);
