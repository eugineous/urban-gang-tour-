import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Cold entries ship as static assets. Revalidated entries use the Cache API.
// No object-storage subscription, credentials or remote cache population.
export default defineCloudflareConfig({
  incrementalCache: async () => (await import('./lib/cloudflare/incremental-cache')).default,
});
