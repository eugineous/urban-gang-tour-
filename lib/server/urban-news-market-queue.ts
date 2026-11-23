import {q} from './db';
import {ensureUrbanNewsSchema,getUrbanNewsItem} from './urban-news-store';
import {NEWS_MARKETS} from '@/lib/shared/news-preferences';
import type {UrbanNewsItem} from '@/lib/shared/urban-news';

const markets=NEWS_MARKETS.map(market=>market.code).filter(code=>code!=='Global');
const dayStart="date_trunc('day',now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi'";
const dailyTotals=`SELECT r.draft->>'country' AS market,count(DISTINCT r.candidate_id)::int AS total
 FROM urban_news_revisions r WHERE r.created_at>=${dayStart} AND r.actor='scheduler' GROUP BY 1`;

/** Rotate the first pick every cron tick so a country with a quiet feed never stalls others. */
export async function chooseDiscoveryCountry(window:number,target:number):Promise<string>{
 await ensureUrbanNewsSchema();
 const totals=new Map((await q<{market:string;total:number}>(dailyTotals)).map(row=>[row.market,Number(row.total)]));
 const start=window%markets.length;
 const order=markets.slice(start).concat(markets.slice(0,start));
 return order.find(country=>(totals.get(country)??0)<target)??order[0];
}

/** Select eligible revisions across the whole inbox. The dispatch lock still controls spending. */
export async function listReadyMarketDrafts(target:number,limit:number):Promise<UrbanNewsItem[]>{
 if(!Number.isInteger(target)||target<1||target>20||!Number.isInteger(limit)||limit<1||limit>4)throw Error('invalid_news_request');
 await ensureUrbanNewsSchema();
 const rows=await q<{id:string}>(`WITH daily AS (${dailyTotals}), eligible AS (
 SELECT c.id,c.updated_at,c.draft->>'country' AS market,COALESCE(d.total,0) AS today,
 row_number() OVER(PARTITION BY c.draft->>'country' ORDER BY c.updated_at,c.id) AS position
 FROM urban_news_candidates c LEFT JOIN daily d ON d.market=c.draft->>'country'
 WHERE c.stage IN ('discovered','draft') AND c.live_revision IS NULL
 AND (c.stage='discovered' OR jsonb_array_length(c.draft->'claims')=0)
 AND jsonb_array_length(c.draft->'evidence') BETWEEN 1 AND 20
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.draft->'evidence') e WHERE e->>'checked' IS DISTINCT FROM 'true'
 OR coalesce(e->>'rights','') NOT IN ('owned','licensed','public_facts') OR length(coalesce(e->>'excerpt','')) NOT BETWEEN 20 AND 4000)
 AND NOT EXISTS(SELECT 1 FROM urban_news_provider_runs run WHERE run.kind='draft' AND run.state<>'prepared'
 AND run.fingerprint=encode(sha256(convert_to('{"kind":"draft","id":"'||c.id::text||'","revision":'||c.revision||',"version":1}','UTF8')),'hex'))
 ) SELECT id FROM eligible WHERE today+position<=$1 ORDER BY position,today,updated_at,id LIMIT $2`,[target,limit]);
 const items=await Promise.all(rows.map(row=>getUrbanNewsItem(row.id)));
 return items.filter((item):item is UrbanNewsItem=>item!==null);
}
