// Generates a real multi-size favicon.ico plus Google-search-spec PNG sizes
// (square, multiple of 48px) from the source logo. Run once; commit output.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SRC = 'assets/favicon.png'; // 500x500 source, square, transparent
const SIZES = [16, 32, 48, 96, 144, 192];

async function pngBuffer(size) {
  return sharp(SRC).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

// Minimal ICO container: header + one dir entry per embedded PNG (Vista+
// format - every modern browser and Google's crawler support PNG-in-ICO).
function buildIco(buffers, sizes) {
  const count = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(16);
    const s = sizes[i];
    entry.writeUInt8(s >= 256 ? 0 : s, 0);
    entry.writeUInt8(s >= 256 ? 0 : s, 1);
    entry.writeUInt8(0, 2); // no palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffers[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffers[i].length;
    dirEntries.push(entry);
  }
  return Buffer.concat([header, ...dirEntries, ...buffers]);
}

async function main() {
  for (const size of SIZES) {
    const buf = await pngBuffer(size);
    writeFileSync(`public/icon-${size}.png`, buf);
    console.log(`public/icon-${size}.png written`);
  }
  // real ICO: 16/32/48 embedded (covers browser tab + taskbar + Windows)
  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(icoSizes.map(pngBuffer));
  writeFileSync('public/favicon.ico', buildIco(icoBuffers, icoSizes));
  console.log('public/favicon.ico written (real multi-size ICO)');
}

main().catch((e) => { console.error(e); process.exit(1); });
