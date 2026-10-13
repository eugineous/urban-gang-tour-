import type {TierInventory} from './ticket-inventory';

/** Preserve stock and order limits when an authorized admin edits an event. */
export function validateEventTiers(raw: unknown): {ok: true; tiers: TierInventory[]} | {ok: false; error: string} {
  if (raw === undefined) return {ok:true, tiers:[]};
  if (!Array.isArray(raw) || raw.length > 12) return {ok:false,error:'invalid_tiers'};
  const tiers: TierInventory[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {ok:false,error:'invalid_tier'};
    if (Object.keys(value).some(key => !['name','price','capacity','per_order_min','per_order_max'].includes(key))) return {ok:false,error:'unexpected_tier_field'};
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 60 || !Number.isSafeInteger(value.price) || value.price < 0) return {ok:false,error:'invalid_tier'};
    const capacity = value.capacity === undefined || value.capacity === null || value.capacity === '' ? null : value.capacity;
    const min = value.per_order_min ?? 1;
    const max = value.per_order_max ?? 20;
    if (capacity !== null && (!Number.isSafeInteger(capacity) || capacity < 0)) return {ok:false,error:'invalid_tier_capacity'};
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 1 || max > 20 || max < min) return {ok:false,error:'invalid_tier_order_limits'};
    tiers.push({name:value.name.trim(),price:value.price,capacity,per_order_min:min,per_order_max:max});
  }
  if (new Set(tiers.map(tier => tier.name.toLocaleLowerCase())).size !== tiers.length) return {ok:false,error:'duplicate_tier_name'};
  return {ok:true,tiers};
}
