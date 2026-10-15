import { randomBytes } from 'node:crypto';
import { q, qSchema, hasDb } from './db';
import { invalidate, cached } from './microcache';
import { type Campaign, type CampaignInput, parseCampaign } from '../marketing-campaigns';

let ready: Promise<void> | undefined;
export function ensureCampaigns() {
  if (!hasDb()) throw new Error('db_not_configured');
  if (!ready) ready = qSchema(`CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id TEXT PRIMARY KEY, version INT NOT NULL DEFAULT 1, name TEXT NOT NULL,
    headline TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', format TEXT NOT NULL CHECK(format IN ('banner','popup')),
    kind TEXT NOT NULL CHECK(kind IN ('announcement','event','deal')),
    status TEXT NOT NULL CHECK(status IN ('draft','scheduled','live','paused')),
    image TEXT NOT NULL DEFAULT '', href TEXT NOT NULL, cta_label TEXT NOT NULL,
    starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, targets JSONB NOT NULL,
    priority INT NOT NULL DEFAULT 0, cooldown_hours INT NOT NULL DEFAULT 24, delay_seconds INT NOT NULL DEFAULT 12,
    promo_id INT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ); CREATE INDEX IF NOT EXISTS marketing_campaigns_live ON marketing_campaigns(priority DESC,starts_at) WHERE status IN ('live','scheduled');`)
    .then(() => undefined).catch(error => { ready = undefined; throw error; });
  return ready;
}
function dto(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id), version: Number(row.version), name: String(row.name), headline: String(row.headline),
    description: String(row.description), format: row.format as Campaign['format'], kind: row.kind as Campaign['kind'], status: row.status as Campaign['status'],
    image: String(row.image), href: String(row.href), ctaLabel: String(row.cta_label),
    startsAt: row.starts_at ? new Date(row.starts_at as string).toISOString() : null,
    endsAt: row.ends_at ? new Date(row.ends_at as string).toISOString() : null,
    targets: typeof row.targets === 'string' ? JSON.parse(row.targets) : row.targets,
    priority: Number(row.priority), cooldownHours: Number(row.cooldown_hours), delaySeconds: Number(row.delay_seconds), promoId: row.promo_id == null ? null : Number(row.promo_id),
  } as Campaign;
}
export async function listCampaigns() { await ensureCampaigns(); return (await q('SELECT * FROM marketing_campaigns ORDER BY updated_at DESC LIMIT 100')).map(dto); }

export async function saveCampaign(input: CampaignInput, actor: string) {
  await ensureCampaigns();
  if (input.kind === 'deal' && ['live','scheduled'].includes(input.status)) {
    const promos = await q('SELECT id FROM ops_promos WHERE id=$1 AND active=true', [input.promoId]);
    if (!promos.length) throw new Error('deal_promo_unavailable');
  }
  const id = input.id || 'CAM-' + Date.now().toString(36).toUpperCase() + '-' + randomBytes(6).toString('hex').toUpperCase();
  const args = [id,input.name,input.headline,input.description,input.format,input.kind,input.status,input.image,input.href,input.ctaLabel,input.startsAt,input.endsAt,JSON.stringify(input.targets),input.priority,input.cooldownHours,input.delaySeconds,input.promoId];
  const fields = 'id,name,headline,description,format,kind,status,image,href,cta_label,starts_at,ends_at,targets,priority,cooldown_hours,delay_seconds,promo_id';
  const update = input.id ? `UPDATE marketing_campaigns SET name=$2,headline=$3,description=$4,format=$5,kind=$6,status=$7,image=$8,href=$9,cta_label=$10,starts_at=$11,ends_at=$12,targets=$13::jsonb,priority=$14,cooldown_hours=$15,delay_seconds=$16,promo_id=$17,version=version+1,updated_at=now() WHERE id=$1 AND version=$18 RETURNING *`
    : `INSERT INTO marketing_campaigns(${fields}) VALUES(${args.map((_,i)=>'$'+(i+1)+(i===12?'::jsonb':'')).join(',')}) RETURNING *`;
  if (input.id) args.push(input.version as number);
  const actorIndex = args.push(actor), detailIndex = args.push(JSON.stringify({ id, status: input.status }));
  const rows = await q(`WITH saved AS (${update}), audit AS (INSERT INTO audit_log(actor,action,detail) SELECT $${actorIndex},'campaign.save',$${detailIndex}::jsonb FROM saved) SELECT * FROM saved`, args);
  if (!rows.length) throw new Error('campaign_conflict');
  invalidate('public-campaigns');
  return dto(rows[0]);
}
export async function publicCampaigns() {
  const snapshot = await cached('public-campaigns', 5000, async () => {
    await ensureCampaigns();
    const rows = await q(`SELECT c.* FROM marketing_campaigns c WHERE c.status IN ('live','scheduled')
      AND (c.starts_at IS NULL OR c.starts_at<=now()) AND (c.ends_at IS NULL OR c.ends_at>now())
      AND (c.kind<>'deal' OR EXISTS(SELECT 1 FROM ops_promos p WHERE p.id=c.promo_id AND p.active
        AND (p.starts_on IS NULL OR p.starts_on<=(now() AT TIME ZONE 'Africa/Nairobi')::date)
        AND (p.ends_on IS NULL OR p.ends_on>=(now() AT TIME ZONE 'Africa/Nairobi')::date)
        AND (p.code IS NULL OR p.code='' OR p.max_uses IS NULL OR p.uses<p.max_uses))) ORDER BY c.priority DESC,c.id LIMIT 12`);
    return { campaigns: rows.map(dto).filter(campaign => parseCampaign(campaign)), expires: Date.now()+15000 };
  });
  const validForMs = Math.max(0, snapshot.expires-Date.now());
  return { campaigns: validForMs ? snapshot.campaigns.map(({ name: _name, promoId: _promoId, ...publicFields }) => publicFields) : [], validForMs, serverTime: Date.now() };
}
