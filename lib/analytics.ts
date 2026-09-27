// Analytics — GA4 ecommerce-mapped events for the UGT Events funnel.
// Server-safe: only sends when `window.dataLayer` exists (client-side).
// Never sends customer PII. All event params are event/relation metadata.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

function push(event: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

// --- GA4 recommended ecommerce events ---

export function viewItemList(items: Array<{ slug: string; name: string; position: number }>) {
  push('view_item_list', {
    item_list_id: 'events',
    item_list_name: 'Events',
    items: items.map((i) => ({
      item_id: i.slug,
      item_name: i.name,
      item_list_id: 'events',
      item_list_name: 'Events',
      index: i.position,
    })),
  });
}

export function selectItem(slug: string, name: string, position: number) {
  push('select_item', {
    item_list_id: 'events',
    item_list_name: 'Events',
    items: [{ item_id: slug, item_name: name, item_list_id: 'events', index: position }],
  });
}

export function viewItem(slug: string, name: string) {
  push('view_item', {
    items: [{ item_id: slug, item_name: name }],
  });
}

export function beginCheckout(slug: string, tiers: Array<{ name: string; price: number }>) {
  push('begin_checkout', {
    items: tiers.map((t) => ({
      item_id: slug,
      item_name: t.name,
      item_variant: t.name,
      price: t.price,
      quantity: 1,
    })),
    currency: 'KES',
    value: tiers.reduce((s, t) => s + t.price, 0),
  });
}

export function addPaymentInfo(slug: string, paymentType: 'mpesa' | 'card') {
  push('add_payment_info', {
    items: [{ item_id: slug }],
    payment_type: paymentType,
  });
}

export function purchase(slug: string, transactionId: string, value: number, tiers: Array<{ name: string; price: number }>) {
  push('purchase', {
    transaction_id: transactionId,
    value,
    currency: 'KES',
    items: tiers.map((t) => ({
      item_id: slug,
      item_name: t.name,
      item_variant: t.name,
      price: t.price,
      quantity: 1,
    })),
  });
}

// --- UGT custom events ---

export function eventShare(slug: string, channel: 'whatsapp' | 'x' | 'other') {
  push('event_share', { event_id: slug, channel });
}

export function eventSave(slug: string) {
  push('event_save', { event_id: slug });
}

export function calendarAdd(slug: string) {
  push('calendar_add', { event_id: slug });
}

export function ticketTierSelect(slug: string, tierName: string) {
  push('ticket_tier_select', { event_id: slug, tier_name: tierName });
}

export function soldOutView(slug: string) {
  push('sold_out_view', { event_id: slug });
}

export function waitlistInterest(slug: string) {
  push('waitlist_interest', { event_id: slug });
}

export function relatedStoryClick(slug: string, storySlug: string) {
  push('related_story_click', { event_id: slug, story_slug: storySlug });
}

export function sellWithUgtClick() {
  push('sell_with_ugt_click', {});
}
