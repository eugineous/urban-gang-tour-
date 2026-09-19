import { hasDb, qSchema } from './db';

// Editorial workflow is deliberately additive to the existing posts table.
// It preserves every legacy published article, while giving scoped content
// staff a safe draft/review path instead of direct public publishing.
let ready: Promise<void> | null = null;

export function ensureContentWorkflowSchema(): Promise<void> {
  if (!hasDb()) return Promise.reject(new Error('db_not_configured'));
  if (!ready) {
    ready = qSchema(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_status TEXT;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS submitted_by TEXT DEFAULT '';
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS reviewed_by TEXT DEFAULT '';
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
      UPDATE posts
        SET editorial_status = CASE WHEN published THEN 'published' ELSE 'draft' END
        WHERE editorial_status IS NULL;
      ALTER TABLE posts ALTER COLUMN editorial_status SET DEFAULT 'draft';
    `).then(() => undefined).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export type EditorialStatus = 'draft' | 'in_review' | 'published';

export function editorialStatus(value: unknown, isPublished: unknown): EditorialStatus {
  if (value === 'in_review') return 'in_review';
  if (value === 'published' || isPublished === true) return 'published';
  return 'draft';
}
