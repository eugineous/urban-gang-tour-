import { hasDb, q, qSchema } from './db';
import type { StoryDraftContent } from '../story-draft';

let ready: Promise<void> | null = null;
export function ensureStoryWorkspaceSchema(): Promise<void> {
  if (!hasDb()) return Promise.reject(Error('db_not_configured'));
  if (!ready) ready = qSchema(`
    CREATE TABLE IF NOT EXISTS admin_story_drafts (
      id UUID PRIMARY KEY, actor TEXT NOT NULL, content JSONB NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS admin_story_drafts_actor_date ON admin_story_drafts(actor, updated_at DESC);
    CREATE TABLE IF NOT EXISTS admin_story_revisions (
      draft_id UUID NOT NULL REFERENCES admin_story_drafts(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL, content JSONB NOT NULL, saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(draft_id, revision)
    );
    CREATE TABLE IF NOT EXISTS admin_story_trash (
      slug TEXT PRIMARY KEY, snapshot JSONB NOT NULL, removed_by TEXT NOT NULL,
      removed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS admin_story_trash_actor_date ON admin_story_trash(removed_by, removed_at DESC);
  `).catch(error => {ready = null; throw error;});
  return ready;
}

/** One statement: the compare-and-swap and its immutable revision either both commit or neither does. */
export async function saveStoryDraft(id: string, actor: string, revision: number, content: StoryDraftContent) {
  await ensureStoryWorkspaceSchema();
  const rows = await q<{id: string; revision: number; updated_at: string}>(`
    WITH saved AS (
      INSERT INTO admin_story_drafts AS draft (id, actor, content)
      SELECT $1::uuid,$2,$4::jsonb WHERE $3::int=0
      ON CONFLICT (id) DO NOTHING
      RETURNING id,revision,content,updated_at
    ), updated AS (
      UPDATE admin_story_drafts SET content=$4::jsonb,revision=revision+1,updated_at=now()
      WHERE $3::int>0 AND id=$1::uuid AND actor=$2 AND revision=$3
      RETURNING id,revision,content,updated_at
    ), result AS (SELECT * FROM saved UNION ALL SELECT * FROM updated), history AS (
      INSERT INTO admin_story_revisions(draft_id,revision,content)
      SELECT id,revision,content FROM result RETURNING draft_id,revision
    ) SELECT result.id,result.revision,result.updated_at FROM result
      JOIN history ON history.draft_id=result.id AND history.revision=result.revision`,
    [id, actor, revision, JSON.stringify(content)]);
  if (rows[0]) return rows[0];
  // An interrupted response can be retried without making a duplicate revision.
  const retried = await q<{id:string;revision:number;updated_at:string}>(`
    SELECT id,revision,updated_at FROM admin_story_drafts
    WHERE id=$1::uuid AND actor=$2 AND revision=$3::int+1 AND content=$4::jsonb`,
    [id,actor,revision,JSON.stringify(content)]);
  return retried[0] || null;
}

/** Removed rows are captured intact in the same atomic statement. A slug already in Trash is never overwritten. */
export async function trashStory(slug: string, actor: string, owner: boolean, version: string) {
  await ensureStoryWorkspaceSchema();
  return q<{slug: string}>(`
    WITH removed AS (
      DELETE FROM posts AS post WHERE slug=$1 AND updated_at::text=$4
        AND COALESCE(to_jsonb(post)->>'editorial_managed','false')<>'true'
        AND ($3::boolean OR (NOT published AND submitted_by=$2))
        AND NOT EXISTS (SELECT 1 FROM admin_story_trash WHERE slug=$1)
      RETURNING post.*
    ), stored AS (
      INSERT INTO admin_story_trash(slug,snapshot,removed_by)
      SELECT slug,to_jsonb(removed),$2 FROM removed RETURNING slug
    ), audit AS (
      INSERT INTO audit_log(actor,action,detail)
      SELECT $2,'trash_story',jsonb_build_object('slug',slug) FROM stored RETURNING id
    ) SELECT slug FROM stored`, [slug, actor, owner, version]);
}

/** Restore never publishes or replays social automation. A reused live slug is a conflict, never an overwrite. */
export async function restoreStory(slug: string, actor: string, owner: boolean) {
  await ensureStoryWorkspaceSchema();
  return q<{slug: string}>(`
    WITH source AS (
      SELECT * FROM admin_story_trash WHERE slug=$1 AND ($3::boolean OR removed_by=$2) FOR UPDATE
    ), restored AS (
      INSERT INTO posts(slug,headline,section,image,dek,body,published,date,editorial_status,submitted_by,reviewed_by,reviewed_at)
      SELECT slug,snapshot->>'headline',COALESCE(snapshot->>'section','News'),COALESCE(snapshot->>'image',''),
        COALESCE(snapshot->>'dek',''),COALESCE(snapshot->'body','[]'::jsonb),false,
        COALESCE((snapshot->>'date')::date,CURRENT_DATE),'draft',COALESCE(snapshot->>'submitted_by',''),'',NULL
      FROM source ON CONFLICT (slug) DO NOTHING RETURNING slug
    ), cleared AS (
      DELETE FROM admin_story_trash WHERE slug IN (SELECT slug FROM restored) RETURNING slug
    ), audit AS (
      INSERT INTO audit_log(actor,action,detail)
      SELECT $2,'restore_story',jsonb_build_object('slug',slug) FROM cleared RETURNING id
    ) SELECT slug FROM cleared`, [slug, actor, owner]);
}
