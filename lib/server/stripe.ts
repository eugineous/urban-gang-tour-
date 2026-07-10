// Stripe card payments — lazy singleton client, activated by env vars:
//   STRIPE_SECRET_KEY (server), STRIPE_WEBHOOK_SECRET (webhook signature),
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client, Checkout redirect only).
// Server-side ONLY. Never expose the secret key or import this client-side.
import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // API version: the SDK's own pinned default (upgrade with the package).
      timeout: 20_000,
      maxNetworkRetries: 1,
    });
  }
  return client;
}
