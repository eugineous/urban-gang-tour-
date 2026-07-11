// Gallery photo seed + idempotent seeding — the DB-backed source for
// public/v25-template.html's this.GALLERY. See app/api/site-data/gallery for
// the public read side and app/api/admin/gallery for admin CRUD + Vercel
// Blob upload.
//
// SEED_GALLERY below is the frozen literal public/v25-template.html shipped
// with:
//   this.GALLERY = ['/assets/gal/g-crowning.jpg','/assets/gal/g-trees.jpg',
//     '/assets/gal/g-runway.jpg','/assets/gal/g-street.jpg',
//     '/assets/gal/g-winning.jpg'];
// Inserted once into gallery_photos (idempotent — guarded by the empty-table
// check below, plus ON CONFLICT (url) DO NOTHING against the unique url
// index) so this migration never loses existing content or duplicates rows
// on a race. These rows keep their original public/assets/ path — they were
// never uploaded to Vercel Blob and don't need to be; only new admin uploads
// go through Blob. The source literal never carried a caption/category, so
// the seed rows are inserted with both empty rather than inventing content
// that was never there. gallery_photos.id is a plain SERIAL (matches the
// table's pre-existing production shape — see lib/server/ops.ts), so seed
// rows get whatever id the DB assigns; nothing in this app references a
// fixed gallery photo id the way tour_events/products do.
import { q, db } from './db';
import { ensureOpsSchema } from './ops';

export interface SeedGalleryPhoto {
  url: string;
  caption: string;
  category: string;
  sort_order: number;
}

export const SEED_GALLERY: SeedGalleryPhoto[] = [
  { url: '/assets/gal/g-crowning.jpg', caption: '', category: '', sort_order: 10 },
  { url: '/assets/gal/g-trees.jpg', caption: '', category: '', sort_order: 20 },
  { url: '/assets/gal/g-runway.jpg', caption: '', category: '', sort_order: 30 },
  { url: '/assets/gal/g-street.jpg', caption: '', category: '', sort_order: 40 },
  { url: '/assets/gal/g-winning.jpg', caption: '', category: '', sort_order: 50 },
];

let seeded = false;
export async function ensureGallerySeeded(): Promise<void> {
  if (seeded || !db()) return;
  await ensureOpsSchema();
  const countRows = await q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM gallery_photos`);
  if (Number(countRows[0]?.n) === 0) {
    for (const p of SEED_GALLERY) {
      await q(
        `INSERT INTO gallery_photos (url, caption, category, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT (url) DO NOTHING`,
        [p.url, p.caption, p.category, p.sort_order]
      );
    }
  }
  seeded = true;
}
