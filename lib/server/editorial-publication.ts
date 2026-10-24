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
)`;
export const PUBLIC_POST_SELECT = `SELECT slug,headline,section,image,dek,body,date,updated_at,
  COALESCE(NULLIF(BTRIM(to_jsonb(posts)->>'subtitle'),''),dek) AS subtitle,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN COALESCE(to_jsonb(posts)->>'published_at',to_jsonb(posts)->>'scheduled_at') END AS publication_time,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN to_jsonb(posts)->'editorial_source'->>'author' END AS author,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN to_jsonb(posts)->'asset_manifest' ELSE NULL END AS public_asset,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN to_jsonb(posts)->'editorial_review'->>'disclosure' END AS disclosure,
  CASE WHEN to_jsonb(posts)->>'editorial_managed'='true' THEN 'BlogPosting' ELSE 'NewsArticle' END AS schema_type
  FROM posts WHERE ${PUBLIC_POST_PREDICATE} ORDER BY date DESC, slug ASC`;
