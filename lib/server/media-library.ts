import { qSchema } from "./db";
import { ensureOpsSchema } from "./ops";
export const MEDIA_LIBRARY_SCHEMA = `
 CREATE TABLE IF NOT EXISTS gallery_folders (
  id UUID PRIMARY KEY, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
  version INT NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );
 CREATE UNIQUE INDEX IF NOT EXISTS gallery_folder_name ON gallery_folders(lower(name));
 ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES gallery_folders(id) ON DELETE RESTRICT;
 ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
 ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
 CREATE INDEX IF NOT EXISTS gallery_photo_folder ON gallery_photos(folder_id);
`;
let ready: Promise<void> | null = null;
export function ensureMediaLibrarySchema() {
  if (!ready)
    ready = (async () => {
      await ensureOpsSchema();
      await qSchema(MEDIA_LIBRARY_SCHEMA);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  return ready;
}
