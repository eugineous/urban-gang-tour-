import { db } from "./db";

export interface DbGalleryPhoto {
  id: number;
  category: string;
  url: string;
  caption: string;
  width: number;
  height: number;
  created_at: string;
}

export const GALLERY_UPLOAD_CAP_PER_CATEGORY = 100;

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS gallery_photos (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  ensured = true;
}

export async function listGalleryPhotos(category?: string): Promise<DbGalleryPhoto[]> {
  await ensureTable();
  const sql = db();
  if (category) {
    return (await sql`SELECT * FROM gallery_photos WHERE category = ${category} ORDER BY created_at DESC`) as DbGalleryPhoto[];
  }
  return (await sql`SELECT * FROM gallery_photos ORDER BY created_at DESC`) as DbGalleryPhoto[];
}

export async function countInCategory(category: string): Promise<number> {
  await ensureTable();
  const sql = db();
  const rows = (await sql`SELECT COUNT(*)::int AS count FROM gallery_photos WHERE category = ${category}`) as { count: number }[];
  return rows[0]?.count ?? 0;
}

export async function insertGalleryPhoto(input: {
  category: string;
  url: string;
  caption: string;
  width: number;
  height: number;
}): Promise<DbGalleryPhoto> {
  await ensureTable();
  const sql = db();
  const rows = (await sql`
    INSERT INTO gallery_photos (category, url, caption, width, height)
    VALUES (${input.category}, ${input.url}, ${input.caption}, ${input.width}, ${input.height})
    RETURNING *
  `) as DbGalleryPhoto[];
  return rows[0];
}

export async function deleteGalleryPhoto(id: number): Promise<DbGalleryPhoto | null> {
  await ensureTable();
  const sql = db();
  const rows = (await sql`DELETE FROM gallery_photos WHERE id = ${id} RETURNING *`) as DbGalleryPhoto[];
  return rows[0] ?? null;
}
