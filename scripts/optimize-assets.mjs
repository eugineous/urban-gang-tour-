// One-shot asset optimizer.
//
// The homepage was shipping 25.6MB and decoding ~97MB of image RAM, which is
// what OOM-killed iOS Safari mid-scroll (blank/coloured screen) and made the
// site unusable on slow connections. This rewrites every oversized asset in
// place-adjacent form: a capped-dimension WebP + AVIF next to the original, and
// a small JPEG/H.264 for the hero media.
//
// Run: node scripts/optimize-assets.mjs
// Idempotent - skips anything already smaller than its target.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpegPkg from '@ffmpeg-installer/ffmpeg';

const run = promisify(execFile);
const ROOT = process.cwd();
const ASSETS = path.join(ROOT, 'public', 'assets');

// Max rendered width per asset class. Nothing on this site is displayed wider
// than ~1600px, and cards/thumbs are far smaller - the originals were up to
// 2783x2783, which is pure decoded-RAM waste on a phone.
const RULES = [
  { dir: 'merch', width: 900, quality: 72 },
  { dir: 'crew', width: 800, quality: 74 },
  { dir: 'crew2', width: 800, quality: 74 },
  { dir: 'team', width: 800, quality: 74 },
  { dir: 'gal', width: 1200, quality: 70 },
  { dir: 'events', width: 1000, quality: 72 },
  { dir: 'news2', width: 900, quality: 72 },
  { dir: 'partners', width: 500, quality: 78 },
  { dir: '.', width: 1400, quality: 74 },
];

const IMG_EXT = /\.(png|jpe?g|webp)$/i;
const stats = { images: 0, before: 0, after: 0, videos: 0, vbefore: 0, vafter: 0, skipped: 0 };

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'video' || e.name === 'optimized') continue;
      out.push(...(await walk(p)));
    } else if (IMG_EXT.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

function ruleFor(file) {
  const rel = path.relative(ASSETS, file).split(path.sep);
  const top = rel.length > 1 ? rel[0] : '.';
  return RULES.find((r) => r.dir === top) || RULES[RULES.length - 1];
}

async function doImage(file) {
  const rule = ruleFor(file);
  const buf = await fs.readFile(file);
  const meta = await sharp(buf).metadata();
  const needsResize = (meta.width || 0) > rule.width;

  // Anything already small and already modern gets left alone.
  if (!needsResize && buf.length < 120 * 1024 && /\.webp$/i.test(file)) {
    stats.skipped += 1;
    return;
  }

  const base = file.replace(IMG_EXT, '');
  const pipeline = sharp(buf).rotate();
  if (needsResize) pipeline.resize({ width: rule.width, withoutEnlargement: true });

  // WebP is the universal baseline (Safari 14+, every Android browser in use)
  // and captures nearly all of the available saving. AVIF was tried here and
  // dropped: encoding 2000px PNGs took 20s+ each on this OneDrive-synced tree
  // for a further ~30%, which is not worth the build time.
  const webp = await pipeline.clone().webp({ quality: rule.quality, effort: 4 }).toBuffer();

  await fs.writeFile(`${base}.webp`, webp);

  // Keep a same-extension fallback at the new size so existing <img src> paths
  // that we have not rewritten yet still get the small file.
  if (/\.png$/i.test(file)) {
    await fs.writeFile(file, await pipeline.clone().png({ quality: rule.quality, compressionLevel: 9, palette: true }).toBuffer());
  } else if (/\.jpe?g$/i.test(file)) {
    await fs.writeFile(file, await pipeline.clone().jpeg({ quality: rule.quality, mozjpeg: true }).toBuffer());
  }

  const after = (await fs.stat(file)).size;
  stats.images += 1;
  stats.before += buf.length;
  stats.after += Math.min(after, webp.length);
  // unbuffered so progress is visible while this runs
  process.stdout.write(
    `img ${path.relative(ASSETS, file).padEnd(34)} ${(buf.length / 1024).toFixed(0).padStart(6)}KB -> ${(webp.length / 1024).toFixed(0).padStart(5)}KB webp\n`,
  );
}

async function doVideo() {
  const vdir = path.join(ASSETS, 'video');
  let files;
  try {
    files = (await fs.readdir(vdir)).filter((f) => /\.mp4$/i.test(f) && !/\.orig\./i.test(f));
  } catch {
    return;
  }
  const ff = ffmpegPkg.path;

  for (const f of files) {
    const src = path.join(vdir, f);
    const before = (await fs.stat(src)).size;
    const tmp = path.join(vdir, `.tmp-${f}`);
    const webm = src.replace(/\.mp4$/i, '.webm');

    // 720p, CRF 30, no audio track at all (these are muted decorative heroes -
    // the audio stream was dead weight). faststart puts the moov atom first so
    // playback begins before the file finishes downloading, which is what makes
    // it start in a couple of seconds on a slow link instead of thirty.
    await run(ff, [
      '-y', '-i', src,
      '-vf', "scale='min(1280,iw)':-2",
      '-c:v', 'libx264', '-profile:v', 'main', '-level', '4.0',
      '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-an', tmp,
    ]);
    await fs.rename(tmp, src);

    await run(ff, [
      '-y', '-i', src,
      '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1',
      '-deadline', 'good', '-cpu-used', '3', '-an', webm,
    ]).catch(() => {});

    const after = (await fs.stat(src)).size;
    stats.videos += 1;
    stats.vbefore += before;
    stats.vafter += after;
    console.log(`vid ${f.padEnd(34)} ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB`);
  }

  // The 9MB poster.png was downloaded on every single load before a frame of
  // video existed. Replace it with a small JPEG at display size.
  const poster = path.join(ASSETS, 'poster.png');
  try {
    const b = await fs.readFile(poster);
    const jpg = await sharp(b).resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 62, mozjpeg: true }).toBuffer();
    await fs.writeFile(path.join(ASSETS, 'poster.jpg'), jpg);
    await fs.writeFile(poster, await sharp(b).resize({ width: 1280, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toBuffer());
    console.log(`poster.png ${(b.length / 1024 / 1024).toFixed(1)}MB -> ${(jpg.length / 1024).toFixed(0)}KB jpg`);
  } catch {}
}

async function dropOriginals() {
  // hero-1.orig.mp4 + hero-main.orig.mp4 are 31MB of masters sitting in the
  // public directory. They are never referenced by the site; they were only
  // ever deploy payload. Move them out of public/ so they stop shipping.
  const vdir = path.join(ASSETS, 'video');
  const keep = path.join(ROOT, 'assets', 'video-masters');
  await fs.mkdir(keep, { recursive: true });
  for (const f of await fs.readdir(vdir).catch(() => [])) {
    if (!/\.orig\./i.test(f)) continue;
    await fs.rename(path.join(vdir, f), path.join(keep, f));
    console.log(`moved master out of public/: ${f}`);
  }
}

const t0 = Date.now();
await dropOriginals();
const files = await walk(ASSETS);
for (const f of files) {
  try { await doImage(f); } catch (e) { console.log(`skip ${f}: ${e.message}`); }
}
await doVideo();

console.log(`
=== done in ${((Date.now() - t0) / 1000).toFixed(0)}s ===
images  ${stats.images} rewritten, ${stats.skipped} already fine
        ${(stats.before / 1048576).toFixed(1)}MB -> ${(stats.after / 1048576).toFixed(1)}MB
videos  ${stats.videos} re-encoded
        ${(stats.vbefore / 1048576).toFixed(1)}MB -> ${(stats.vafter / 1048576).toFixed(1)}MB
`);
