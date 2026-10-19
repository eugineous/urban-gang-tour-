import {hasDb,qSchema} from './db';
import {ensureContentWorkflowSchema} from './content-workflow';
import {ensureContentAutomationSchema} from './content-automation';
export const EDITORIAL_SCHEMA=`
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_managed BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_kind TEXT;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_revision INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_import_hash TEXT;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_source JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS editorial_review JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS asset_manifest JSONB NOT NULL DEFAULT '{}'::jsonb;
  CREATE UNIQUE INDEX IF NOT EXISTS posts_editorial_slot ON posts(date) WHERE editorial_managed;
  CREATE INDEX IF NOT EXISTS posts_editorial_due ON posts(scheduled_at) WHERE editorial_managed AND published;
  CREATE TABLE IF NOT EXISTS editorial_audit (
    id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
    slug TEXT, detail JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS editorial_monitor (
    id INTEGER PRIMARY KEY CHECK(id=1), checked_at TIMESTAMPTZ NOT NULL, released INTEGER NOT NULL DEFAULT 0
  );
`;
let ready:Promise<void>|null=null;
export async function ensureEditorialSchema(){
  if(!hasDb())throw Error('db_not_configured');
  if(!ready)ready=(async()=>{
    await ensureContentWorkflowSchema();await ensureContentAutomationSchema();await qSchema(EDITORIAL_SCHEMA);
  })().catch(error=>{ready=null;throw error});
  return ready;
}
