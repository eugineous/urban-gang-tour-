import {urbanNewsEnabled} from './urban-news-mode';
/** Compatibility-safe until additive migration runs. No private payload is selected. */
export const PUBLIC_POST_PREDICATE = `published AND (
  (COALESCE(to_jsonb(posts)->>'editorial_managed','false') <> 'true'
    AND date <= (now() AT TIME ZONE 'Africa/Nairobi')::date)
  OR (to_jsonb(posts)->>'editorial_managed'='true'
    AND to_jsonb(posts)->>'editorial_kind'='article'
    AND editorial_status IN ('approved_for_auto_release','live')
    AND (to_jsonb(posts)->>'scheduled_at')::timestamptz <= now()
    AND COALESCE(to_jsonb(posts)->'editorial_review'->>'approved_revision','') = COALESCE(to_jsonb(posts)->>'editorial_revision','!')
    AND COALESCE(to_jsonb(posts)->'editorial_review'->>'approved_hash','') = COALESCE(to_jsonb(posts)->>'editorial_import_hash','!')
  )
) AND COALESCE(to_jsonb(posts)->>'urban_news_id','')=''`;
export const PUBLIC_POST_SELECT = `SELECT slug,headline,section,image,dek,body,date,updated_at,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN COALESCE(to_jsonb(posts)->>'published_at',to_jsonb(posts)->>'scheduled_at') END AS publication_time,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN to_jsonb(posts)->'editorial_source'->>'author' END AS author,
  CASE WHEN to_jsonb(posts)->'asset_manifest'->>'hero'=image THEN jsonb_build_object(
    'alt',to_jsonb(posts)->'asset_manifest'->>'alt',
    'caption',to_jsonb(posts)->'asset_manifest'->>'caption',
    'og',to_jsonb(posts)->'asset_manifest'->>'og',
    'illustration',to_jsonb(posts)->'asset_manifest'->'illustration') ELSE NULL END AS public_asset,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN to_jsonb(posts)->'editorial_review'->>'disclosure' END AS disclosure,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN 'BlogPosting' ELSE 'NewsArticle' END AS schema_type
  FROM posts WHERE ${PUBLIC_POST_PREDICATE} ORDER BY date DESC, slug ASC`;

/** Index cards retain the same eligibility and publication clock without manuscripts. */
export const PUBLIC_POST_SUMMARY_SELECT = `SELECT slug,headline,section,image,dek,date,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN COALESCE(to_jsonb(posts)->>'published_at',to_jsonb(posts)->>'scheduled_at') END AS publication_time,
  CASE WHEN to_jsonb(posts)->'asset_manifest'->>'hero'=image THEN jsonb_build_object(
    'alt',to_jsonb(posts)->'asset_manifest'->>'alt') ELSE NULL END AS public_asset
  FROM posts WHERE ${PUBLIC_POST_PREDICATE} ORDER BY date DESC, slug ASC`;

/** Approved public snapshots only. Private candidate/revision/evidence tables are never joined. */
export const URBAN_NEWS_PUBLIC_PREDICATE=`published AND COALESCE(to_jsonb(posts)->>'urban_news_id','')<>''
 AND to_jsonb(posts)->'urban_news_public'->>'live'='true'
 AND editorial_status='live'
 AND to_jsonb(posts)->'urban_news_public'->>'approvedRevision'=to_jsonb(posts)->>'urban_news_revision'
 AND to_jsonb(posts)->'urban_news_public'->>'revision'=to_jsonb(posts)->>'urban_news_revision'
 AND to_jsonb(posts)->'urban_news_public'->>'approvedHash'=to_jsonb(posts)->>'urban_news_hash'
 AND to_jsonb(posts)->'urban_news_public'->>'hash'=to_jsonb(posts)->>'urban_news_hash'
 AND (to_jsonb(posts)->'urban_news_public'->>'scheduledAt')::timestamptz<=now()
 AND (to_jsonb(posts)->'urban_news_public'->>'publishedAt')::timestamptz<=now()`;
export function getPublicPostPredicate():string{return urbanNewsEnabled()?URBAN_NEWS_PUBLIC_PREDICATE:PUBLIC_POST_PREDICATE}
export function getPublicPostSelect():string{
 if(!urbanNewsEnabled())return PUBLIC_POST_SELECT;
 return `SELECT slug,headline,section,image,dek,body,date,updated_at,
  to_jsonb(posts)->'urban_news_public'->>'publishedAt' AS publication_time,
  to_jsonb(posts)->'urban_news_public'->>'modifiedAt' AS modification_time,
  to_jsonb(posts)->'urban_news_public'->>'author' AS author,
  jsonb_build_object('alt',to_jsonb(posts)->'urban_news_public'->>'imageAlt') AS public_asset,
  to_jsonb(posts)->'urban_news_public'->>'disclosure' AS disclosure,
  to_jsonb(posts)->'urban_news_public'->'sources' AS public_sources,
  to_jsonb(posts)->'urban_news_public'->>'verification' AS public_verification,
  to_jsonb(posts)->'urban_news_public'->>'country' AS public_country,
  to_jsonb(posts)->'urban_news_public'->>'correction' AS public_correction,
  to_jsonb(posts)->>'urban_news_revision' AS public_revision,'NewsArticle' AS schema_type
 FROM posts WHERE ${getPublicPostPredicate()} ORDER BY (to_jsonb(posts)->'urban_news_public'->>'publishedAt')::timestamptz DESC,slug ASC`;
}
export function getPublicPostSummarySelect():string{
 if(!urbanNewsEnabled())return PUBLIC_POST_SUMMARY_SELECT;
 return `SELECT slug,headline,section,image,dek,date,
  to_jsonb(posts)->'urban_news_public'->>'publishedAt' AS publication_time,
  to_jsonb(posts)->'urban_news_public'->>'verification' AS public_verification,
  to_jsonb(posts)->'urban_news_public'->>'country' AS public_country,
  jsonb_build_object('alt',to_jsonb(posts)->'urban_news_public'->>'imageAlt') AS public_asset
 FROM posts WHERE ${getPublicPostPredicate()} ORDER BY (to_jsonb(posts)->'urban_news_public'->>'publishedAt')::timestamptz DESC,slug ASC`;
}
