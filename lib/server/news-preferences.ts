import {hasDb,q,qSchema} from './db';
import {DEFAULT_NEWS_PREFERENCES,parseNewsPreferences,type NewsPreferences} from '@/lib/shared/news-preferences';

export type SavedNewsPreferences={preferences:NewsPreferences;version:number};
const schema=`CREATE TABLE IF NOT EXISTS news_reader_preferences(
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 preferences JSONB NOT NULL CHECK(jsonb_typeof(preferences)='object'),
 version BIGINT NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`;
let ready:Promise<void>|undefined;
async function ensure(){if(!hasDb())throw Error('news_preferences_unavailable');return ready??(ready=qSchema(schema).catch(error=>{ready=undefined;throw error}))}
function identity(userId:string|number):string{const id=String(userId);if(!/^[1-9]\d{0,18}$/.test(id)||BigInt(id)>9223372036854775807n)throw Error('invalid_news_preferences');return id}
type Row={preferences:unknown;version:string|number};
function saved(row:Row):SavedNewsPreferences{
 let raw=row.preferences;if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{throw Error('news_preferences_unavailable')}}
 const preferences=parseNewsPreferences(raw),version=Number(row.version);
 if(!preferences||!Number.isSafeInteger(version)||version<1)throw Error('news_preferences_unavailable');
 return {preferences,version};
}
export async function readNewsPreferences(userId:string|number):Promise<SavedNewsPreferences>{
 const id=identity(userId);await ensure();
 const rows=await q<Row>('SELECT preferences,version FROM news_reader_preferences WHERE user_id=$1',[id]);
 return rows[0]?saved(rows[0]):{preferences:DEFAULT_NEWS_PREFERENCES,version:0};
}
export async function saveNewsPreferences(userId:string|number,expectedVersion:number,value:NewsPreferences):Promise<SavedNewsPreferences>{
 const id=identity(userId),preferences=parseNewsPreferences(value);
 if(!preferences||!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw Error('invalid_news_preferences');
 await ensure();
 const rows=expectedVersion===0
  ?await q<Row>('INSERT INTO news_reader_preferences(user_id,preferences) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO NOTHING RETURNING preferences,version',[id,JSON.stringify(preferences)])
  :await q<Row>('UPDATE news_reader_preferences SET preferences=$2::jsonb,version=version+1,updated_at=clock_timestamp() WHERE user_id=$1 AND version=$3 RETURNING preferences,version',[id,JSON.stringify(preferences),expectedVersion]);
 if(!rows[0])throw Error('news_preferences_conflict');
 return saved(rows[0]);
}
