export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'live', 'paused'] as const;
export type Campaign = {
  id: string; version: number; name: string; headline: string; description: string;
  format: 'banner' | 'popup'; kind: 'announcement' | 'event' | 'deal';
  status: typeof CAMPAIGN_STATUSES[number]; image: string; href: string; ctaLabel: string;
  startsAt: string | null; endsAt: string | null; targets: string[]; priority: number;
  cooldownHours: number; delaySeconds: number; promoId: number | null;
};
export type CampaignInput = Omit<Campaign, 'id' | 'version'> & { id?: string; version?: number };
export function safeCampaignLink(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 300 || !value.startsWith('/') || value.startsWith('//') || /[\\\s<>]/.test(value)) return false;
  try { return new URL(value, 'https://urbangangtour.co.ke').origin === 'https://urbangangtour.co.ke'; } catch { return false; }
}
export function safeCampaignImage(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 500 || /[\\\s<>?#]/.test(value)) return false;
  try {
    const url = new URL(value, 'https://urbangangtour.co.ke');
    return ['https://urbangangtour.co.ke', 'https://www.urbangangtour.co.ke'].includes(url.origin) &&
      /^\/(?:assets|merch|design-assets|media|_media)\//.test(url.pathname) && /\.(?:png|jpe?g|webp|avif)$/i.test(url.pathname);
  } catch { return false; }
}
function timestamp(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value;
}
export function parseCampaign(value: unknown): CampaignInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const b = value as Record<string, unknown>;
  const keys = ['id','version','name','headline','description','format','kind','status','image','href','ctaLabel','startsAt','endsAt','targets','priority','cooldownHours','delaySeconds','promoId'];
  if (Object.keys(b).some(key => !keys.includes(key))) return null;
  if (b.id !== undefined && (typeof b.id !== 'string' || !/^CAM-[A-Z0-9-]{8,50}$/.test(b.id) || !Number.isSafeInteger(b.version) || (b.version as number) < 1)) return null;
  if (b.id === undefined && b.version !== undefined) return null;
  for (const [key, max, required] of [['name',80,true],['headline',100,true],['description',240,false],['ctaLabel',40,true]] as const) {
    if (typeof b[key] !== 'string' || (b[key] as string).length > max || (required && !(b[key] as string).trim())) return null;
  }
  if (!['banner','popup'].includes(String(b.format)) || !['announcement','event','deal'].includes(String(b.kind)) || !CAMPAIGN_STATUSES.includes(b.status as Campaign['status'])) return null;
  if (!safeCampaignImage(b.image) || !safeCampaignLink(b.href) || !timestamp(b.startsAt) || !timestamp(b.endsAt)) return null;
  if (b.status === 'scheduled' && !b.startsAt) return null;
  if (b.startsAt && b.endsAt && Date.parse(b.endsAt as string) <= Date.parse(b.startsAt as string)) return null;
  if (!Array.isArray(b.targets) || !b.targets.length || b.targets.length > 12 || !b.targets.every(target => target === '*' || (safeCampaignLink(target) && !/[?#]/.test(target)))) return null;
  for (const [key, min, max] of [['priority',0,100],['cooldownHours',1,720],['delaySeconds',5,120]] as const) if (!Number.isSafeInteger(b[key]) || (b[key] as number)<min || (b[key] as number)>max) return null;
  if (b.promoId !== null && (!Number.isSafeInteger(b.promoId) || (b.promoId as number)<1)) return null;
  if (b.kind === 'deal' && b.status !== 'draft' && b.promoId === null) return null;
  return b as CampaignInput;
}
export function campaignsAllowedOn(path: string) {
  return !/^\/(?:admin|organizer|account|cart|checkout|pay|orders|receipt|receipts|tickets|t|verify|book|reels|privacy-policy|cookie-policy|terms|refund-policy|ticket-terms|offline)(?:\/|$)/.test(path);
}
export function campaignTargets(campaign: Pick<Campaign, 'targets'>, path: string) {
  return campaignsAllowedOn(path) && (campaign.targets.includes('*') || campaign.targets.includes(path));
}
export function campaignIsLive(campaign: Pick<Campaign,'status'|'startsAt'|'endsAt'>, now = Date.now()) {
  return ['live','scheduled'].includes(campaign.status) && (!campaign.startsAt || Date.parse(campaign.startsAt)<=now) && (!campaign.endsAt || Date.parse(campaign.endsAt)>now);
}
export function fromNairobiInput(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Invalid Nairobi date');
  const date = new Date(value + ':00+03:00');
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime()+3*3600000).toISOString().slice(0,16)!==value) throw new Error('Invalid Nairobi date');
  return date.toISOString();
}
export const toNairobiInput = (value: string | null) => value ? new Date(Date.parse(value)+3*3600000).toISOString().slice(0,16) : '';
