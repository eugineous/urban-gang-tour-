import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';

// Backs ISR (`export const revalidate = ...`, used across app/page.tsx,
// app/events/page.tsx, app/blog/*, etc.) with the "ugt-isr-cache" R2 bucket
// (binding NEXT_INC_CACHE_R2_BUCKET in wrangler.toml) instead of the
// default per-isolate in-memory cache, which was never shared across
// Workers instances/regions and caused every request to be an x-nextjs-cache
// MISS. withRegionalCache adds a fast per-datacenter layer on top via the
// Cache API. long-lived mode since these pages don't use on-demand
// revalidateTag/revalidatePath.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
});
