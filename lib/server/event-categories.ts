import {randomUUID} from 'node:crypto';
import {q,qSchema} from './db';
import {ensureOpsSchema} from './ops';
import {bumpEventPublicTruth} from './public-cache';
import type {EventCategory,EventCategoryInput} from '../event-categories';
export const EVENT_CATEGORY_SCHEMA=`
CREATE TABLE IF NOT EXISTS event_categories (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 active BOOLEAN NOT NULL DEFAULT true,
 version INT NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS event_categories_name_unique ON event_categories(lower(name));
ALTER TABLE tour_events ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES event_categories(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS tour_events_category_id_index ON tour_events(category_id) WHERE category_id IS NOT NULL;
`;
let schema:Promise<void>|null=null;
export function ensureEventCategorySchema(){if(!schema)schema=(async()=>{await ensureOpsSchema();await qSchema(EVENT_CATEGORY_SCHEMA)})().catch(error=>{schema=null;throw error});return schema}
export async function listEventCategories():Promise<EventCategory[]>{await ensureEventCategorySchema();return q<EventCategory>('SELECT id,name,active,version FROM event_categories ORDER BY active DESC,lower(name),id')}
export async function saveEventCategory(input:EventCategoryInput,actor:string):Promise<EventCategory>{
 await ensureEventCategorySchema();
 const id=input.action==='create'?'category-'+randomUUID().replaceAll('-',''):input.id;
 const rows=input.action==='create'?await q<EventCategory>(`WITH saved AS (
  INSERT INTO event_categories(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id,name,active,version
 ), audited AS (INSERT INTO audit_log(actor,action,detail) SELECT $3,'eventCategory.create',jsonb_build_object('id',id,'name',name) FROM saved) SELECT * FROM saved`,[id,input.name,actor]):await q<EventCategory>(`WITH saved AS (
  UPDATE event_categories SET name=$2,active=$3,version=version+1,updated_at=now() WHERE id=$1 AND version=$4 RETURNING id,name,active,version
 ), audited AS (INSERT INTO audit_log(actor,action,detail) SELECT $5,'eventCategory.update',jsonb_build_object('id',id,'name',name,'active',active) FROM saved) SELECT * FROM saved`,[id,input.name,input.active,input.version,actor]);
 if(!rows.length)throw Error(input.action==='create'?'category_exists':'category_conflict');
 bumpEventPublicTruth();return rows[0];
}
